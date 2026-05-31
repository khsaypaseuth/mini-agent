import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { WhatsappService } from './whatsapp.service';

/**
 * Meta WhatsApp Cloud API webhook.
 * GET  — subscription verification (returns hub.challenge).
 * POST — inbound message delivery.
 */
@ApiExcludeController()
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Public()
  @Get('webhook')
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const result = this.whatsappService.verifyWebhook(mode, token, challenge);
    if (result) return res.status(HttpStatus.OK).send(result);
    return res.status(HttpStatus.FORBIDDEN).send('Forbidden');
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async receive(@Body() payload: unknown) {
    const message = this.whatsappService.parseInbound(payload);
    if (message) await this.whatsappService.handleInbound(message);
    // Always 200 quickly so Meta does not retry.
    return { received: true };
  }
}
