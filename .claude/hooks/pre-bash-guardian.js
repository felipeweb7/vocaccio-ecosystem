#!/usr/bin/env node
// PreToolUse hook (matcher: Bash). Guards against risky prisma db push and
// silent lint/tsc OOM exits. See docs/auditoria/plano-leveza-2026-07.md e
// feedback-schema-migrations (memoria).
let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const command = input?.tool_input?.command || '';
  if (!command) process.exit(0);

  const isDbPush = /\bdb[\s-]push\b/i.test(command) && /prisma/i.test(command);
  if (isDbPush) {
    respond(
      'ask',
      'db push direto no schema Prisma. Regra do projeto: NUNCA usar db push em ' +
        'mudanca de TIPO de coluna (perda de dados silenciosa). Confirme que esta ' +
        'mudanca e so aditiva (nova tabela/coluna nullable) e que voce ja considerou ' +
        'gerar uma migration versionada (pnpm run prisma-migrate) em vez de push direto em prod.'
    );
    return;
  }

  // Cobre pnpm run tsc, pnpm lint, rtk tsc, rtk lint, npx tsc. Achado do Severus
  // (2026-07-29): a versao anterior so casava a via `pnpm`, entao `rtk tsc` sozinho
  // — liberado no allowlist — escapava da guarda de heap e podia sair 0 falso por OOM.
  const isLintOrTsc =
    /\b(?:pnpm\s+(?:run\s+)?|rtk\s+|npx\s+)(?:lint|tsc|typecheck)\b/i.test(command);
  if (isLintOrTsc && !/NODE_OPTIONS/.test(command)) {
    // deny (nao ask): ha uma unica resposta correta, entao perguntar ao usuario
    // e devolver a ele uma decisao que o proprio hook ja sabe. O agente reescreve
    // com o prefixo e segue sozinho. Regra de fluidez (Devwarts 2026-07-29).
    respond(
      'deny',
      'lint/tsc sem NODE_OPTIONS=--max-old-space-size=4096. Neste monorepo isso ja ' +
        'causou exit 0 falso por OOM (gotcha conhecido da Fase A3) - typecheck-teatro, ' +
        'erro nomeado 2 do CLAUDE.md. Nao pergunte ao usuario: reescreva o comando com ' +
        'o prefixo e rode de novo. Comando corrigido:\n\n' +
        '  NODE_OPTIONS=--max-old-space-size=4096 ' + command + '\n\n' +
        'Se houver motivo real para rodar SEM o heap maior (raro), diga explicitamente ' +
        'ao usuario qual e o motivo e peca confirmacao nomeada.'
    );
    return;
  }

  process.exit(0);
});

function respond(permissionDecision, reason) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision,
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
}
