import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@mini-agent/types';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CertificatesService } from './certificates.service';
import { UploadCertificateDto } from './dto/upload-certificate.dto';

@ApiTags('certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(
    UserRole.BACK_OFFICE_STAFF,
    UserRole.MAIN_OFFICE_STAFF,
    UserRole.MANAGER,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Upload a finished certificate for a request (staff)' })
  upload(@Body() dto: UploadCertificateDto, @CurrentUser() user: User) {
    return this.certificatesService.upload(dto.requestId, dto.fileId, user.id);
  }

  @Get(':requestId/qr-label')
  @ApiBearerAuth()
  @Roles(
    UserRole.BACK_OFFICE_STAFF,
    UserRole.MAIN_OFFICE_STAFF,
    UserRole.MANAGER,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get the 100x100 QR label for a certificate (staff)' })
  getQrLabel(@Param('requestId') requestId: string) {
    return this.certificatesService.getQrLabel(requestId);
  }

  @Public()
  @Get('download/:downloadToken')
  @ApiOperation({ summary: 'Public certificate download page (no auth, by token)' })
  download(@Param('downloadToken') downloadToken: string) {
    return this.certificatesService.getByDownloadToken(downloadToken);
  }
}
