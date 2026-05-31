import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@mini-agent/types';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { DeliveriesService } from './deliveries.service';
import { CompleteDeliveryDto } from './dto/complete-delivery.dto';

@ApiTags('deliveries')
@ApiBearerAuth()
@Roles(UserRole.DELIVERY_MAN, UserRole.MAIN_OFFICE_STAFF, UserRole.MANAGER, UserRole.SUPER_ADMIN)
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get('queue')
  @ApiOperation({ summary: 'Delivery queue: available pickups + my active deliveries' })
  getQueue(@CurrentUser() user: User) {
    return this.deliveriesService.getQueue(user.id);
  }

  @Post(':requestId/pickup')
  @ApiOperation({ summary: 'Scan to confirm pickup (READY_FOR_DELIVERY → PICKED_UP)' })
  scanPickup(@Param('requestId') requestId: string, @CurrentUser() user: User) {
    return this.deliveriesService.scanPickup(requestId, user.id);
  }

  @Post(':requestId/in-transit')
  @ApiOperation({ summary: 'Mark in transit (PICKED_UP → IN_TRANSIT), notify customer' })
  markInTransit(@Param('requestId') requestId: string, @CurrentUser() user: User) {
    return this.deliveriesService.markInTransit(requestId, user.id);
  }

  @Post(':requestId/complete')
  @ApiOperation({
    summary: 'Complete delivery with proof photo (IN_TRANSIT → DELIVERED → COMPLETED)',
  })
  complete(
    @Param('requestId') requestId: string,
    @Body() dto: CompleteDeliveryDto,
    @CurrentUser() user: User,
  ) {
    return this.deliveriesService.completeDelivery(requestId, user.id, dto);
  }
}
