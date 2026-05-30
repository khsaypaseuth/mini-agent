import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    // Apply JWT guard globally — every route is protected unless @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Apply Roles guard globally — every route is open unless @Roles(...)
    { provide: APP_GUARD, useClass: RolesGuard },
    // Rate-limit all routes
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
