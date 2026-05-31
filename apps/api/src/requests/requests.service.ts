import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DeliveryType, RequestChannel, RequestStatus, UserRole, type RequestStatus as RS } from '@mini-agent/types';
import type { User } from '@prisma/client';
import { DeliveryService } from '../delivery/delivery.service';
import { PrismaService } from '../prisma/prisma.service';
import { calculatePrice, type PricingContext } from '../pricing/pricing.engine';
import type { AddFileInputDto, AddPassengerDto, AddTextInputDto } from './dto/add-input.dto';
import type { CreateRequestDto } from './dto/create-request.dto';
import type { RecalcDeliveryDto } from './dto/recalc-delivery.dto';
import { assertTransition } from './state-machine';

const REQUEST_INCLUDE = {
  service: { select: { slug: true, name: true, outputType: true } },
  pricingOption: { select: { label: true, amount: true, currency: true, slaDays: true } },
  inputs: true,
  passengers: true,
  statusHistory: { orderBy: { createdAt: 'desc' as const }, take: 10 },
} as const;

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: DeliveryService,
  ) {}

  // ─── Public interface ──────────────────────────────────────────────────

  async create(dto: CreateRequestDto, customerId: string) {
    const isPhysical = dto.deliveryType !== DeliveryType.DIGITAL_PDF;
    let distanceKm: number | undefined;
    let deliveryFee: number | undefined;
    let totalAmount: number | undefined;

    // Calculate delivery fee for physical delivery
    if (isPhysical && dto.gpsLat !== undefined && dto.gpsLng !== undefined) {
      const calc = await this.delivery.calculateFee(dto.gpsLat, dto.gpsLng);
      distanceKm = calc.distanceKm;
      deliveryFee = calc.fee;
    }

    // Calculate service pricing if pricingOptionId provided
    if (dto.pricingOptionId) {
      const po = await this.prisma.pricingOption.findUnique({ where: { id: dto.pricingOptionId } });
      if (po) {
        const ctx: PricingContext = { passengerCount: dto.passengerCount, vehicleType: dto.vehicleType };
        const priceResult = calculatePrice(po, ctx);
        totalAmount = priceResult.baseAmount + (deliveryFee ?? 0);
      }
    }

    const requestNumber = this.generateRequestNumber();
    const publicToken = randomBytes(16).toString('hex');

    const request = await this.prisma.request.create({
      data: {
        requestNumber,
        publicToken,
        customerId,
        serviceId: dto.serviceId,
        pricingOptionId: dto.pricingOptionId ?? null,
        channel: dto.channel ?? RequestChannel.WEB,
        status: RequestStatus.DRAFT,
        deliveryType: dto.deliveryType,
        gpsLat: dto.gpsLat ?? null,
        gpsLng: dto.gpsLng ?? null,
        distanceKm: distanceKm ?? null,
        deliveryFee: deliveryFee ?? null,
        totalAmount: totalAmount ?? null,
        currency: 'LAK',
        notes: dto.notes ?? null,
      },
      include: REQUEST_INCLUDE,
    });

    // Write initial DRAFT history entry
    await this.prisma.requestStatusHistory.create({
      data: { requestId: request.id, toStatus: RequestStatus.DRAFT, actorId: customerId },
    });

    return request;
  }

  async findAll(user: User) {
    const where: Record<string, unknown> = {};

    if (user.role === UserRole.CUSTOMER) {
      where['customerId'] = user.id;
    } else if (user.role === UserRole.BACK_OFFICE_STAFF) {
      const assignments = await this.prisma.staffServiceAssignment.findMany({
        where: { userId: user.id },
        select: { serviceId: true },
      });
      where['serviceId'] = { in: assignments.map((a) => a.serviceId) };
    } else if (user.role === UserRole.DELIVERY_MAN) {
      where['delivery'] = { deliveryManId: user.id };
    }
    // MAIN_OFFICE_STAFF, MANAGER, SUPER_ADMIN see everything

    return this.prisma.request.findMany({
      where,
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: User) {
    const request = await this.prisma.request.findUnique({ where: { id }, include: REQUEST_INCLUDE });
    if (!request) throw new NotFoundException(`Request ${id} not found`);
    this.assertCanAccess(request, user);
    return request;
  }

  async findByPublicToken(publicToken: string) {
    const request = await this.prisma.request.findUnique({
      where: { publicToken },
      include: {
        service: { select: { slug: true, name: true, outputType: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        certificate: { select: { downloadToken: true } },
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    // Return only safe fields for public tracking page
    return {
      requestNumber: request.requestNumber,
      status: request.status,
      service: request.service,
      statusHistory: request.statusHistory,
      certificate: request.certificate,
      createdAt: request.createdAt,
    };
  }

  async addTextInput(requestId: string, dto: AddTextInputDto, user: User) {
    const request = await this.getOwnedRequest(requestId, user);
    return this.prisma.requestInput.create({
      data: { requestId: request.id, requirementKey: dto.requirementKey, textValue: dto.textValue },
    });
  }

  async addFileInput(requestId: string, dto: AddFileInputDto, user: User) {
    const request = await this.getOwnedRequest(requestId, user);
    return this.prisma.requestInput.create({
      data: { requestId: request.id, requirementKey: dto.requirementKey, fileId: dto.fileId },
    });
  }

  async addPassenger(requestId: string, dto: AddPassengerDto, user: User) {
    const request = await this.getOwnedRequest(requestId, user);
    return this.prisma.requestPassenger.create({
      data: {
        requestId: request.id,
        name: dto.name,
        passportFileId: dto.passportFileId,
        dateIn: dto.dateIn ? new Date(dto.dateIn) : null,
        dateOut: dto.dateOut ? new Date(dto.dateOut) : null,
        checkpoint: dto.checkpoint,
        vehiclePlate: dto.vehiclePlate,
        flightNo: dto.flightNo,
        arrivalPoint: dto.arrivalPoint,
        stayLocation: dto.stayLocation,
      },
    });
  }

  async submit(requestId: string, user: User) {
    return this.updateStatus(requestId, RequestStatus.SUBMITTED, user.id);
  }

  async recalcDelivery(requestId: string, dto: RecalcDeliveryDto, user: User) {
    const request = await this.getOwnedRequest(requestId, user);
    const calc = await this.delivery.calculateFee(dto.gpsLat, dto.gpsLng);

    return this.prisma.request.update({
      where: { id: request.id },
      data: {
        gpsLat: dto.gpsLat,
        gpsLng: dto.gpsLng,
        distanceKm: calc.distanceKm,
        deliveryFee: calc.fee,
      },
      include: REQUEST_INCLUDE,
    });
  }

  async updateStatus(requestId: string, toStatus: RS, actorId: string, note?: string) {
    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException(`Request ${requestId} not found`);

    assertTransition(request.status as RS, toStatus);

    const [updated] = await Promise.all([
      this.prisma.request.update({
        where: { id: requestId },
        data: { status: toStatus },
        include: REQUEST_INCLUDE,
      }),
      this.prisma.requestStatusHistory.create({
        data: {
          requestId,
          fromStatus: request.status,
          toStatus,
          actorId,
          note: note ?? null,
        },
      }),
    ]);

    this.logger.log(`Request ${request.requestNumber} → ${toStatus}`);
    return updated;
  }

  // ─── Internal helpers ──────────────────────────────────────────────────

  private async getOwnedRequest(requestId: string, user: User) {
    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException(`Request ${requestId} not found`);
    this.assertCanAccess(request, user);
    return request;
  }

  private assertCanAccess(request: { customerId: string }, user: User) {
    const isCustomerOwner = user.role === UserRole.CUSTOMER && request.customerId !== user.id;
    if (isCustomerOwner) throw new ForbiddenException('Access denied');
  }

  private generateRequestNumber(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `REQ-${y}${m}${d}-${suffix}`;
  }
}
