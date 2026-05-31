import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { RequestChannel, RequestStatus, UserRole } from '@mini-agent/types';
import { PrismaService } from '../prisma/prisma.service';
import {
  WHATSAPP_PROVIDER,
  type WhatsAppProvider,
} from '../notifications/whatsapp-provider.interface';
import { advanceFlow, type FlowState, type ServiceLite } from './flow.reducer';

interface InboundMessage {
  from: string;
  text: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
  ) {}

  /** Verify the webhook subscription challenge from Meta. */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    const expected = this.config.get<string>('WHATSAPP_VERIFY_TOKEN');
    if (mode === 'subscribe' && token === expected) return challenge;
    return null;
  }

  /** Parse a Meta webhook payload into a flat inbound message (or null). */
  parseInbound(payload: unknown): InboundMessage | null {
    try {
      const value = (payload as { entry?: { changes?: { value?: Record<string, unknown> }[] }[] })
        ?.entry?.[0]?.changes?.[0]?.value;
      const msg = (value as { messages?: { from: string; text?: { body: string } }[] })
        ?.messages?.[0];
      if (!msg?.from) return null;
      return { from: msg.from, text: msg.text?.body ?? '' };
    } catch {
      return null;
    }
  }

  /** Handle one inbound message: run the flow, persist session, reply. */
  async handleInbound(message: InboundMessage): Promise<void> {
    const services = await this.loadServices();
    const session = await this.prisma.whatsappSession.findUnique({
      where: { phone: message.from },
    });
    const state: FlowState = session
      ? { step: session.step as FlowState['step'], ...((session.data as object) ?? {}) }
      : { step: 'START' };

    const result = advanceFlow(state, message.text, services);
    let reply = result.reply;

    // Execute any side-effect the reducer asked for.
    if (result.action?.type === 'CREATE_REQUEST') {
      const link = await this.createRequestFromChat(message.from, result.action);
      reply = this.completionMessage(link);
    }

    await this.prisma.whatsappSession.upsert({
      where: { phone: message.from },
      create: { phone: message.from, step: result.state.step, data: stripStep(result.state) },
      update: { step: result.state.step, data: stripStep(result.state) },
    });

    if (reply) await this.whatsapp.sendText(message.from, reply);
  }

  // ─── Internal helpers ──────────────────────────────────────────────────

  private async loadServices(): Promise<ServiceLite[]> {
    const services = await this.prisma.service.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        pricingOptions: true,
        deliveryOptions: true,
      },
    });
    return services.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name as Record<string, string>,
      pricingOptions: s.pricingOptions.map((p) => ({
        id: p.id,
        label: p.label as Record<string, string>,
        amount: String(p.amount),
        currency: p.currency,
      })),
      deliveryOptions: s.deliveryOptions.map((d) => ({ type: d.type })),
    }));
  }

  /** Find-or-create a customer by phone, then create a DRAFT request. */
  private async createRequestFromChat(
    phone: string,
    action: { serviceId: string; pricingOptionId: string; deliveryType: string },
  ): Promise<string> {
    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name: `WhatsApp ${phone}`,
          phone,
          role: UserRole.CUSTOMER,
          status: 'active',
          locale: 'lo',
        },
      });
    }

    const requestNumber = this.generateRequestNumber();
    const publicToken = randomBytes(16).toString('hex');
    const request = await this.prisma.request.create({
      data: {
        requestNumber,
        publicToken,
        customerId: user.id,
        serviceId: action.serviceId,
        pricingOptionId: action.pricingOptionId,
        channel: RequestChannel.WHATSAPP,
        status: RequestStatus.DRAFT,
        deliveryType: action.deliveryType as Prisma.RequestCreateInput['deliveryType'],
        currency: 'LAK',
      },
    });
    await this.prisma.requestStatusHistory.create({
      data: { requestId: request.id, toStatus: RequestStatus.DRAFT, actorId: user.id },
    });

    const webApp = this.config.get<string>('WEB_APP_URL') ?? 'http://localhost:3002';
    return `${webApp}/lo/requests/${request.id}`;
  }

  private completionMessage(link: string): string {
    return `✅ ສ້າງຄຳຂໍແລ້ວ! ກະລຸນາສືບຕໍ່ (ອັບໂຫຼດເອກະສານ + ຊຳລະ) ທີ່ລິ້ງນີ້:\nRequest created — finish (upload docs + pay) here:\n${link}`;
  }

  private generateRequestNumber(): string {
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    return `REQ-${ymd}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }
}

function stripStep(state: FlowState): object {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { step: _step, ...data } = state;
  return data;
}
