import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CertificatesModule } from './certificates/certificates.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { DeliveryModule } from './delivery/delivery.module';
import { FilesModule } from './files/files.module';
import { LabelsModule } from './labels/labels.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentModule } from './payment/payment.module';
import { PrismaModule } from './prisma/prisma.module';
import { QrModule } from './qr/qr.module';
import { RequestsModule } from './requests/requests.module';
import { ServicesModule } from './services/services.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    QrModule,
    NotificationsModule,
    AuthModule,
    ServicesModule,
    FilesModule,
    DeliveryModule,
    RequestsModule,
    PaymentModule,
    WalletModule,
    CertificatesModule,
    LabelsModule,
    DeliveriesModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
