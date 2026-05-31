import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { UserRole } from '@mini-agent/types';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { LabelsService } from './labels.service';

class GenerateLabelDto {
  @IsString()
  requestId!: string;
}

@ApiTags('labels')
@ApiBearerAuth()
@Controller('labels')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Post()
  @Roles(UserRole.MAIN_OFFICE_STAFF, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate the printable QR label for a request (main office)' })
  generate(@Body() dto: GenerateLabelDto, @CurrentUser() user: User) {
    return this.labelsService.generate(dto.requestId, user.id);
  }

  @Get(':requestId')
  @Roles(UserRole.MAIN_OFFICE_STAFF, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.DELIVERY_MAN)
  @ApiOperation({ summary: 'Get printable label data for a request' })
  getLabel(@Param('requestId') requestId: string) {
    return this.labelsService.getLabel(requestId);
  }
}
