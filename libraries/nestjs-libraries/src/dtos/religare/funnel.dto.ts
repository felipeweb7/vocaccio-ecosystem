import { IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * Payload dos 2 passos do funil Religare (captura pública, sem sessão).
 * orgId/amountCents/organização NUNCA fazem parte deste DTO — são sempre
 * decididos pelo servidor (ReligareFunnelService), nunca lidos do corpo da
 * requisição, mesmo que o `ValidationPipe` global não tenha `whitelist`
 * habilitado (por isso o service constrói o payload do Prisma campo a campo,
 * nunca via spread do DTO cru).
 *
 * Todos os campos são opcionais aqui (só formato é validado por decorator) —
 * a obrigatoriedade depende do passo e é aplicada em
 * ReligareFunnelService.startLead()/completeLead():
 * - Passo 1 (sem `leadId`): exige birthDate + birthTime + birthPlace +
 *   consentVersion. NÃO exige email/whatsapp — vira um ReligareLead DRAFT.
 * - Passo 2 (com `leadId`): exige email OU whatsapp. Completa o MESMO lead
 *   (busca por id=leadId + orgId do servidor, nunca por email/whatsapp).
 */
export class CreateReligareLeadDto {
  /** Presença deste campo é o que decide se é passo 1 ou passo 2. */
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsapp?: string;

  /** YYYY-MM-DD */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  birthDate?: string;

  /** HH:mm (24h) */
  @IsOptional()
  @IsString()
  @MaxLength(5)
  birthTime?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  birthPlace?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  consentVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;
}
