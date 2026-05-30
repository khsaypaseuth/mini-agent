import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { OtpChannel, UserRole } from '@mini-agent/types';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

// ─── Minimal Mocks ──────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  phone: null,
  passwordHash: '$2b$12$hashedpassword',
  role: UserRole.CUSTOMER,
  status: 'active' as const,
  locale: 'lo',
  walletBalance: 0,
  points: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockOtp = {
  id: 'otp-1',
  userId: 'user-1',
  contact: 'test@example.com',
  channel: OtpChannel.EMAIL,
  codeHash: '$2b$12$hashedotp',
  expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  consumed: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePrismaMock() {
  return {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    otpCode: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let notifications: { sendOtp: jest.Mock };

  beforeEach(async () => {
    prisma = makePrismaMock();
    notifications = { sendOtp: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('mock-token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('15m'), getOrThrow: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── signup ─────────────────────────────────────────────────────────────

  describe('signup', () => {
    it('creates a user and sends OTP', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.otpCode.create.mockResolvedValue(mockOtp);

      const result = await service.signup({
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
      });

      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(notifications.sendOtp).toHaveBeenCalledTimes(1);
      expect(result.message).toMatch(/OTP/i);
    });

    it('hashes the password before storing', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.otpCode.create.mockResolvedValue(mockOtp);

      await service.signup({
        name: 'Test',
        email: 'hash@test.com',
        password: 'PlainPassword1!',
      });

      const createCall = prisma.user.create.mock.calls[0][0];
      expect(createCall.data.passwordHash).toBeDefined();
      expect(createCall.data.passwordHash).not.toBe('PlainPassword1!');
      const isHashed = await bcrypt.compare(
        'PlainPassword1!',
        createCall.data.passwordHash,
      );
      expect(isHashed).toBe(true);
    });

    it('throws ConflictException if email already exists', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(
        service.signup({ name: 'X', email: 'test@example.com', password: 'Pass1234!' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException if neither phone nor email is provided', async () => {
      await expect(
        service.signup({ name: 'X', password: 'Pass1234!' }),
      ).rejects.toThrow();
    });
  });

  // ─── login ──────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      const hashed = await bcrypt.hash('CorrectPass1!', 12);
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, passwordHash: hashed });

      const result = await service.login({
        email: 'test@example.com',
        password: 'CorrectPass1!',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const hashed = await bcrypt.hash('CorrectPass1!', 12);
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, passwordHash: hashed });

      await expect(
        service.login({ email: 'test@example.com', password: 'WrongPass1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@test.com', password: 'Pass1234!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for suspended user', async () => {
      const hashed = await bcrypt.hash('Pass1234!', 12);
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        passwordHash: hashed,
        status: 'suspended',
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'Pass1234!' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── verifyOtp ──────────────────────────────────────────────────────────

  describe('verifyOtp', () => {
    it('returns tokens and marks OTP as consumed', async () => {
      const codeHash = await bcrypt.hash('123456', 10);
      prisma.otpCode.findFirst.mockResolvedValue({ ...mockOtp, codeHash });
      prisma.otpCode.update.mockResolvedValue({ ...mockOtp, consumed: true });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, status: 'active' });

      const result = await service.verifyOtp({
        channel: OtpChannel.EMAIL,
        contact: 'test@example.com',
        code: '123456',
      });

      expect(prisma.otpCode.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { consumed: true } }),
      );
      expect(result.accessToken).toBeDefined();
    });

    it('throws UnauthorizedException for expired OTP', async () => {
      const codeHash = await bcrypt.hash('123456', 10);
      prisma.otpCode.findFirst.mockResolvedValue({
        ...mockOtp,
        codeHash,
        expiresAt: new Date(Date.now() - 1000), // expired
      });

      await expect(
        service.verifyOtp({ channel: OtpChannel.EMAIL, contact: 'x@x.com', code: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for already consumed OTP', async () => {
      const codeHash = await bcrypt.hash('123456', 10);
      prisma.otpCode.findFirst.mockResolvedValue({
        ...mockOtp,
        codeHash,
        consumed: true,
      });

      await expect(
        service.verifyOtp({ channel: OtpChannel.EMAIL, contact: 'x@x.com', code: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong OTP code', async () => {
      const codeHash = await bcrypt.hash('123456', 10);
      prisma.otpCode.findFirst.mockResolvedValue({ ...mockOtp, codeHash });

      await expect(
        service.verifyOtp({ channel: OtpChannel.EMAIL, contact: 'x@x.com', code: '999999' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── generateTokens ─────────────────────────────────────────────────────

  describe('generateTokens', () => {
    it('returns both access and refresh tokens', async () => {
      const tokens = await service.generateTokens('user-1', UserRole.CUSTOMER);
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
    });
  });
});
