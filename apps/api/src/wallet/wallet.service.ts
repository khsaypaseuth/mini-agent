import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WalletTransactionType } from '@mini-agent/types';
import { PrismaService } from '../prisma/prisma.service';

export interface WalletBalance {
  balance: number;
  points: number;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Public interface ──────────────────────────────────────────────────

  async getBalance(userId: string): Promise<WalletBalance> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true, points: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return { balance: Number(user.walletBalance), points: user.points };
  }

  async topup(userId: string, amount: number, ref?: string): Promise<WalletBalance> {
    this.assertPositive(amount);
    return this.applyDelta(userId, amount, WalletTransactionType.TOPUP, ref);
  }

  async spend(userId: string, amount: number, ref?: string): Promise<WalletBalance> {
    this.assertPositive(amount);
    return this.applyDelta(userId, -amount, WalletTransactionType.SPEND, ref);
  }

  async refund(userId: string, amount: number, ref?: string): Promise<WalletBalance> {
    this.assertPositive(amount);
    return this.applyDelta(userId, amount, WalletTransactionType.REFUND, ref);
  }

  async withdraw(userId: string, amount: number, ref?: string): Promise<WalletBalance> {
    this.assertPositive(amount);
    return this.applyDelta(userId, -amount, WalletTransactionType.WITHDRAW, ref);
  }

  async listTransactions(userId: string) {
    return this.prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ─── Internal helpers ──────────────────────────────────────────────────

  /**
   * Atomically reads the balance, applies the delta, and records a
   * transaction with the resulting balance_after — all in one DB transaction.
   * Rejects any operation that would push the balance below zero.
   */
  private async applyDelta(
    userId: string,
    delta: number,
    type: WalletTransactionType,
    ref?: string,
  ): Promise<WalletBalance> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true },
      });
      if (!user) throw new NotFoundException('User not found');

      const current = new Prisma.Decimal(user.walletBalance);
      const next = current.plus(delta);
      if (next.lessThan(0)) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: { walletBalance: next },
        select: { walletBalance: true, points: true },
      });

      await tx.walletTransaction.create({
        data: {
          userId,
          type,
          amount: new Prisma.Decimal(Math.abs(delta)),
          balanceAfter: next,
          ref: ref ?? null,
        },
      });

      return { balance: Number(updated.walletBalance), points: updated.points };
    });
  }

  private assertPositive(amount: number): void {
    if (amount <= 0) throw new BadRequestException('Amount must be greater than zero');
  }
}
