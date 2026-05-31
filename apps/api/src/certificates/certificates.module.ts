import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { RequestsModule } from '../requests/requests.module';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';

@Module({
  imports: [RequestsModule, FilesModule],
  controllers: [CertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
