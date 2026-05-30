import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SERVICE_INCLUDE = {
  inputRequirements: { orderBy: { sortOrder: 'asc' as const } },
  pricingOptions: true,
  deliveryOptions: true,
} as const;

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Public interface ──────────────────────────────────────────────────

  async findAll(options: { includeInactive?: boolean } = {}) {
    return this.prisma.service.findMany({
      where: options.includeInactive ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: SERVICE_INCLUDE,
    });
  }

  async findOne(id: string) {
    const svc = await this.prisma.service.findUnique({
      where: { id },
      include: SERVICE_INCLUDE,
    });
    if (!svc) throw new NotFoundException(`Service ${id} not found`);
    return svc;
  }

  async findBySlug(slug: string) {
    const svc = await this.prisma.service.findFirst({
      where: { slug },
      include: SERVICE_INCLUDE,
    });
    if (!svc) throw new NotFoundException(`Service '${slug}' not found`);
    return svc;
  }

  async create(
    data: {
      slug: string;
      name: Record<string, string>;
      description: Record<string, string>;
      outputType: string;
      icon?: string;
      sortOrder?: number;
    },
    _actorId: string,
  ) {
    this.logger.log(`Creating service: ${data.slug}`);
    return this.prisma.service.create({ data: data as Parameters<typeof this.prisma.service.create>[0]['data'], include: SERVICE_INCLUDE });
  }

  async update(id: string, data: Partial<{ name: Record<string, string>; description: Record<string, string>; isActive: boolean; sortOrder: number; icon: string }>, _actorId: string) {
    await this.findOne(id);
    return this.prisma.service.update({ where: { id }, data, include: SERVICE_INCLUDE });
  }
}
