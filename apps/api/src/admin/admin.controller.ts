import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@mini-agent/types';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { AssignServiceDto } from './dto/assign-service.dto';
import { CreateStaffDto } from './dto/create-staff.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN, UserRole.MANAGER)
@Controller('admin/users')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @ApiOperation({ summary: 'Create a staff user (super_admin / manager)' })
  createStaff(@Body() dto: CreateStaffDto) {
    return this.adminService.createStaff(dto);
  }

  @Get()
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiOperation({ summary: 'List users, optionally filtered by role' })
  listUsers(@Query('role') role?: UserRole) {
    return this.adminService.listUsers(role);
  }

  @Get(':userId/services')
  @ApiOperation({ summary: 'List a staff member’s assigned services' })
  getAssignments(@Param('userId') userId: string) {
    return this.adminService.getAssignments(userId);
  }

  @Post('assign-service')
  @ApiOperation({ summary: 'Assign a service to a back-office staff member' })
  assignService(@Body() dto: AssignServiceDto) {
    return this.adminService.assignService(dto.userId, dto.serviceId);
  }

  @Delete(':userId/services/:serviceId')
  @ApiOperation({ summary: 'Unassign a service from a staff member' })
  unassignService(@Param('userId') userId: string, @Param('serviceId') serviceId: string) {
    return this.adminService.unassignService(userId, serviceId);
  }
}
