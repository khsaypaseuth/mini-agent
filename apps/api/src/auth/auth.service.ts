import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { OtpChannel, UserRole } from '@mini-agent/types';
import type { User } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { RequestOtpDto } from './dto/request-otp.dto';
import type { SignupDto } from './dto/signup.dto';
import type { VerifyOtpDto } from './dto/verify-otp.dto';
import type { JwtPayload } from './types/jwt-payload.type';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: Omit<User, 'passwordHash'>;
}

const BCRYPT_ROUNDS = 12;
const OTP_TTL_MINUTES = 10;
const OTP_DIGITS = 6;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Public interface ──────────────────────────────────────────────────

  async signup(dto: SignupDto): Promise<{ message: string; userId: string }> {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('Provide either phone or email');
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.phone ? { phone: dto.phone } : undefined,
          dto.email ? { email: dto.email } : undefined,
        ].filter(Boolean) as object[],
      },
    });
    if (existing) throw new ConflictException('Phone or email already registered');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        passwordHash,
        locale: dto.locale ?? 'lo',
        role: UserRole.CUSTOMER,
        status: 'active',
      },
    });

    const channel = dto.phone ? OtpChannel.WHATSAPP : OtpChannel.EMAIL;
    const contact = (dto.phone ?? dto.email)!;
    await this.createOtp(user.id, channel, contact);

    return {
      userId: user.id,
      message: `OTP sent to your ${channel === OtpChannel.WHATSAPP ? 'WhatsApp' : 'email'}`,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('Provide either phone or email');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.phone ? { phone: dto.phone } : undefined,
          dto.email ? { email: dto.email } : undefined,
        ].filter(Boolean) as object[],
      },
    });

    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'active') throw new UnauthorizedException('Account is not active');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.role as UserRole);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  async refreshTokens(userId: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'active') throw new UnauthorizedException();
    return this.generateTokens(user.id, user.role as UserRole);
  }

  async requestOtp(dto: RequestOtpDto): Promise<{ message: string }> {
    await this.createOtp(null, dto.channel, dto.contact);
    return { message: 'OTP sent' };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthResponse> {
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: { contact: dto.contact, channel: dto.channel, consumed: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) throw new UnauthorizedException('Invalid or expired OTP');
    if (otpRecord.consumed) throw new UnauthorizedException('OTP already used');
    if (otpRecord.expiresAt < new Date()) throw new UnauthorizedException('OTP has expired');

    const valid = await bcrypt.compare(dto.code, otpRecord.codeHash);
    if (!valid) throw new UnauthorizedException('Invalid OTP code');

    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { consumed: true },
    });

    // Find or activate the user linked to this OTP contact
    const user = otpRecord.userId
      ? await this.prisma.user.findUnique({ where: { id: otpRecord.userId } })
      : await this.prisma.user.findFirst({
          where:
            dto.channel === OtpChannel.EMAIL
              ? { email: dto.contact }
              : { phone: dto.contact },
        });

    if (!user) throw new UnauthorizedException('User not found');

    // Activate user if not yet active (e.g. after signup verification)
    const activeUser =
      user.status === 'active'
        ? user
        : await this.prisma.user.update({
            where: { id: user.id },
            data: { status: 'active' },
          });

    const tokens = await this.generateTokens(activeUser.id, activeUser.role as UserRole);
    return { ...tokens, user: this.sanitizeUser(activeUser) };
  }

  async getMe(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.sanitizeUser(user);
  }

  // ─── Internal helpers (not part of module's public interface) ──────────

  async generateTokens(userId: string, role: UserRole): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') ?? '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async createOtp(
    userId: string | null,
    channel: OtpChannel,
    contact: string,
  ): Promise<void> {
    const code = String(randomInt(0, 999999)).padStart(OTP_DIGITS, '0');
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.otpCode.create({
      data: { userId, channel, contact, codeHash, expiresAt },
    });

    await this.notifications.sendOtp(channel, contact, code);
  }

  private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _pw, ...safe } = user;
    return safe;
  }
}
