import { Body, Controller, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ReligareFunnelService } from '@gitroom/nestjs-libraries/database/prisma/religare/religare-funnel.service';
import { InfinitePayService } from '@gitroom/nestjs-libraries/services/infinitepay.service';
import { CreateReligareLeadDto } from '@gitroom/nestjs-libraries/dtos/religare/funnel.dto';

/**
 * Rotas públicas do funil Religare — SEM sessão de usuário, por isso este
 * controller não entra em `authenticatedController` (apps/backend/src/api/
 * api.module.ts), igual ao StripeController. `/lead` é chamado pelo primeiro
 * modal da LP (ainda não conectado — ver docs/religare/funil-fundacao.md);
 * `/infinitepay-webhook` é chamado pelo servidor da InfinitePay.
 */
@ApiTags('Religare Funnel')
@Controller('/religare')
export class ReligareFunnelController {
  constructor(
    private _religareFunnelService: ReligareFunnelService,
    private _infinitePay: InfinitePayService
  ) {}

  @Post('/lead')
  captureLead(@Body() body: CreateReligareLeadDto) {
    return this._religareFunnelService.captureLead(body);
  }

  /**
   * Sem assinatura HMAC (a InfinitePay não publica esquema pra isso — ver
   * docs/religare/funil-fundacao.md). Proteção: token de alta entropia
   * embutido na própria webhook_url que registramos ao criar o link
   * (comparado em tempo constante) + reconciliação via payment_check dentro
   * do service, que nunca confia no valor/status do corpo recebido.
   */
  @Post('/infinitepay-webhook')
  async infinitepayWebhook(
    @Query('token') token: string,
    @Body() body: Record<string, unknown>,
    @Res() res: Response
  ) {
    if (!this._infinitePay.validateWebhookToken(token)) {
      res.status(401).json({ success: false, message: 'unauthorized' });
      return;
    }

    const result = await this._religareFunnelService.handleInfinitePayWebhook(body);
    res.status(result.success ? 200 : 400).json(result);
  }
}
