import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UploadCertificateDto {
  @ApiProperty({ description: 'Request ID the certificate belongs to' })
  @IsString()
  requestId!: string;

  @ApiProperty({ description: 'File ID of the uploaded certificate (from POST /files)' })
  @IsString()
  fileId!: string;
}
