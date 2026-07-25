import { Controller, Get, HttpException, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { User } from '@prisma/client';
import { ReligareFunnelService } from '@gitroom/nestjs-libraries/database/prisma/religare/religare-funnel.service';

/**
 * Painel de operação mínimo do funil Religare — só pra superadmin (mesmo
 * gate de apps/backend/src/api/routes/admin.controller.ts). Entra em
 * `authenticatedController` (apps/backend/src/api/api.module.ts), diferente
 * de ReligareFunnelController (rotas públicas do funil, sem sessão) — aqui
 * quem chama é sempre um usuário logado do HUB, verificado como superadmin
 * abaixo. Ver docs/religare/funil-fundacao.md, seção 8 (6ª rodada), item 6.
 */
@ApiTags('Admin - Religare')
@Controller('/admin/religare')
export class ReligareAdminController {
  constructor(private _religareFunnelService: ReligareFunnelService) {}

  private assertSuperAdmin(user: User) {
    if (!user?.isSuperAdmin) {
      throw new HttpException('Unauthorized', 400);
    }
  }

  @Get('/leads')
  async listLeads(
    @GetUserFromRequest() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('email') email?: string
  ) {
    this.assertSuperAdmin(user);
    return this._religareFunnelService.listLeads({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status: status || undefined,
      email: email || undefined,
    });
  }

  @Get('/checkouts')
  async listCheckouts(
    @GetUserFromRequest() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string
  ) {
    this.assertSuperAdmin(user);
    return this._religareFunnelService.listCheckouts({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status: status || undefined,
    });
  }

  /** Aciona `payment_check` real contra a InfinitePay pro checkout — não confia em nada digitado pelo admin. */
  @Post('/checkouts/:id/verify-payment')
  async verifyPayment(@GetUserFromRequest() user: User, @Param('id') id: string) {
    this.assertSuperAdmin(user);
    return this._religareFunnelService.verifyCheckoutPayment(id);
  }

  /** Admin confia sem reconciliar (ex.: comprovante conferido fora do fluxo) — nunca chama a InfinitePay. */
  @Post('/checkouts/:id/mark-paid')
  async markPaid(@GetUserFromRequest() user: User, @Param('id') id: string) {
    this.assertSuperAdmin(user);
    return this._religareFunnelService.markCheckoutPaidManually(id, user.id);
  }
}
