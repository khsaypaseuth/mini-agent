import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WalletAmountDto } from './dto/wallet-amount.dto';
import { WalletService } from './wallet.service';

@ApiTags('wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get current wallet balance and points' })
  getBalance(@CurrentUser() user: User) {
    return this.walletService.getBalance(user.id);
  }

  @Post('topup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Top up wallet balance' })
  topup(@Body() dto: WalletAmountDto, @CurrentUser() user: User) {
    return this.walletService.topup(user.id, dto.amount, dto.ref);
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw from wallet balance' })
  withdraw(@Body() dto: WalletAmountDto, @CurrentUser() user: User) {
    return this.walletService.withdraw(user.id, dto.amount, dto.ref);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List wallet transaction history' })
  listTransactions(@CurrentUser() user: User) {
    return this.walletService.listTransactions(user.id);
  }
}
