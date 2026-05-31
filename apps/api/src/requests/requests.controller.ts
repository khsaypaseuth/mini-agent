import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@mini-agent/types';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AddFileInputDto, AddPassengerDto, AddTextInputDto } from './dto/add-input.dto';
import { CreateRequestDto } from './dto/create-request.dto';
import { RecalcDeliveryDto } from './dto/recalc-delivery.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { RequestsService } from './requests.service';

@ApiTags('requests')
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new request (DRAFT)' })
  create(@Body() dto: CreateRequestDto, @CurrentUser() user: User) {
    return this.requestsService.create(dto, user.id);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List requests scoped to the current role' })
  findAll(@CurrentUser() user: User) {
    return this.requestsService.findAll(user);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single request' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.requestsService.findOne(id, user);
  }

  @Post(':id/inputs/text')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a text/select input answer to a request' })
  addTextInput(@Param('id') id: string, @Body() dto: AddTextInputDto, @CurrentUser() user: User) {
    return this.requestsService.addTextInput(id, dto, user);
  }

  @Post(':id/inputs/file')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attach an uploaded file to a request input' })
  addFileInput(@Param('id') id: string, @Body() dto: AddFileInputDto, @CurrentUser() user: User) {
    return this.requestsService.addFileInput(id, dto, user);
  }

  @Post(':id/passengers')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a passenger (immigration / multi-person services)' })
  addPassenger(@Param('id') id: string, @Body() dto: AddPassengerDto, @CurrentUser() user: User) {
    return this.requestsService.addPassenger(id, dto, user);
  }

  @Post(':id/submit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a request (DRAFT → SUBMITTED)' })
  submit(@Param('id') id: string, @CurrentUser() user: User) {
    return this.requestsService.submit(id, user);
  }

  @Post(':id/recalc-delivery')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resubmit GPS location to recalculate delivery fee' })
  recalcDelivery(
    @Param('id') id: string,
    @Body() dto: RecalcDeliveryDto,
    @CurrentUser() user: User,
  ) {
    return this.requestsService.recalcDelivery(id, dto, user);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @Roles(
    UserRole.BACK_OFFICE_STAFF,
    UserRole.MAIN_OFFICE_STAFF,
    UserRole.DELIVERY_MAN,
    UserRole.MANAGER,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Update request status (staff only, state-machine guarded)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @CurrentUser() user: User) {
    return this.requestsService.updateStatus(id, dto.status, user.id, dto.note);
  }

  @Public()
  @Get('track/:publicToken')
  @ApiOperation({ summary: 'Public tracking page data (no auth, by unguessable token)' })
  track(@Param('publicToken') publicToken: string) {
    return this.requestsService.findByPublicToken(publicToken);
  }
}
