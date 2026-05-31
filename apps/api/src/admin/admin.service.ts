import { ConflictException, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { UserRole } from '@mini-agent/types';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateStaffDto } from './dto/create-staff.dto';

const BCRYPT_ROUNDS = 12;

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Public interface ──────────────────────────────────────────────────

  async createStaff(dto: CreateStaffDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone ?? null,
        passwordHash,
        role: dto.role as UserRole,
        status: 'active',
      },
      select: SAFE_USER_SELECT,
    });
  }

  async listUsers(role?: UserRole) {
    return this.prisma.user.findMany({
      where: role ? { role } : {},
      select: { ...SAFE_USER_SELECT, staffServiceAssignments: { select: { serviceId: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async assignService(userId: string, serviceId: string) {
    await this.prisma.staffServiceAssignment.upsert({
      where: { userId_serviceId: { userId, serviceId } },
      create: { userId, serviceId },
      update: {},
    });
    return this.getAssignments(userId);
  }

  async unassignService(userId: string, serviceId: string) {
    await this.prisma.staffServiceAssignment.deleteMany({ where: { userId, serviceId } });
    return this.getAssignments(userId);
  }

  async getAssignments(userId: string) {
    const assignments = await this.prisma.staffServiceAssignment.findMany({
      where: { userId },
      include: { service: { select: { id: true, slug: true, name: true } } },
    });
    return assignments.map((a) => a.service);
  }
}
