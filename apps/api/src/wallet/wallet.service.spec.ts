import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { WalletTransactionType } from '@mini-agent/types';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from './wallet.service';

/**
 * Wallet invariants under test:
 *  - balance never goes negative (spend > balance is rejected)
 *  - every transaction records the resulting balance_after
 *  - balance + transaction write happen atomically (one $transaction call)
 */
describe('WalletService', () => {
  let service: WalletService;
  let tx: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    walletTransaction: { create: jest.Mock; findMany: jest.Mock };
  };
  let prisma: {
    $transaction: jest.Mock;
    user: { findUnique: jest.Mock };
    walletTransaction: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    tx = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      walletTransaction: { create: jest.fn(), findMany: jest.fn() },
    };
    prisma = {
      // interactive transaction: run the callback with the tx client
      $transaction: jest.fn((cb) => cb(tx)),
      user: { findUnique: jest.fn() },
      walletTransaction: { findMany: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [WalletService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(WalletService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getBalance ───────────────────────────────────────────────────────

  describe('getBalance', () => {
    it('returns the user wallet balance and points', async () => {
      prisma.user.findUnique.mockResolvedValue({ walletBalance: new Decimal(50000), points: 12 });
      const result = await service.getBalance('user-1');
      expect(result).toEqual({ balance: 50000, points: 12 });
    });
  });

  // ─── topup ────────────────────────────────────────────────────────────

  describe('topup', () => {
    it('increases balance and records balance_after', async () => {
      tx.user.findUnique.mockResolvedValue({ walletBalance: new Decimal(10000) });
      tx.user.update.mockResolvedValue({ walletBalance: new Decimal(30000) });
      tx.walletTransaction.create.mockResolvedValue({});

      const result = await service.topup('user-1', 20000, 'topup-ref');

      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { walletBalance: expect.anything() } }),
      );
      expect(tx.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: WalletTransactionType.TOPUP,
            balanceAfter: expect.anything(),
          }),
        }),
      );
      expect(result.balance).toBe(30000);
    });

    it('rejects a non-positive topup amount', async () => {
      await expect(service.topup('user-1', 0)).rejects.toThrow(BadRequestException);
      await expect(service.topup('user-1', -100)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── spend ────────────────────────────────────────────────────────────

  describe('spend', () => {
    it('decreases balance when funds are sufficient', async () => {
      tx.user.findUnique.mockResolvedValue({ walletBalance: new Decimal(50000) });
      tx.user.update.mockResolvedValue({ walletBalance: new Decimal(20000) });
      tx.walletTransaction.create.mockResolvedValue({});

      const result = await service.spend('user-1', 30000, 'req-1');

      expect(result.balance).toBe(20000);
      expect(tx.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: WalletTransactionType.SPEND }),
        }),
      );
    });

    it('rejects spend exceeding balance (no negative balance)', async () => {
      tx.user.findUnique.mockResolvedValue({ walletBalance: new Decimal(10000) });

      await expect(service.spend('user-1', 30000, 'req-1')).rejects.toThrow(BadRequestException);
      expect(tx.user.update).not.toHaveBeenCalled();
      expect(tx.walletTransaction.create).not.toHaveBeenCalled();
    });

    it('allows spending the exact balance to zero', async () => {
      tx.user.findUnique.mockResolvedValue({ walletBalance: new Decimal(30000) });
      tx.user.update.mockResolvedValue({ walletBalance: new Decimal(0) });
      tx.walletTransaction.create.mockResolvedValue({});

      const result = await service.spend('user-1', 30000, 'req-1');
      expect(result.balance).toBe(0);
    });
  });

  // ─── refund ───────────────────────────────────────────────────────────

  describe('refund', () => {
    it('increases balance and records a refund transaction', async () => {
      tx.user.findUnique.mockResolvedValue({ walletBalance: new Decimal(0) });
      tx.user.update.mockResolvedValue({ walletBalance: new Decimal(30000) });
      tx.walletTransaction.create.mockResolvedValue({});

      const result = await service.refund('user-1', 30000, 'req-1');

      expect(result.balance).toBe(30000);
      expect(tx.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: WalletTransactionType.REFUND }),
        }),
      );
    });
  });

  // ─── listTransactions ─────────────────────────────────────────────────

  describe('listTransactions', () => {
    it('returns the user transaction history newest-first', async () => {
      prisma.walletTransaction.findMany.mockResolvedValue([{ id: 't1' }]);
      const result = await service.listTransactions('user-1');
      expect(prisma.walletTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' }, orderBy: { createdAt: 'desc' } }),
      );
      expect(result).toHaveLength(1);
    });
  });
});
