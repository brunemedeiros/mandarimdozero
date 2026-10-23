# Configurações > Exportar arquivado (2026-10-23)

Decisão da autora: tirar a aba "📦 Exportar" de Configurações. Exportar para o Anki por ali esvaziaria a Revisão, que já tem
Importar e Exportar no menu "⋯" (ao lado de Criar Deck). O Importar/Exportar da Revisão NÃO foi alterado.

## O que mudou

- `fr/index.html` e `zh/index.html`: o botão `data-settings-section="export"` (aba "📦 Exportar") foi removido da barra Geral / Notificações.
- O painel `#settings-export-content` continua no HTML, escondido (`display:none`) e sem nenhuma aba que o abra. Ele fica só para
  o gerador de `.apkg` (`shared/anki-export.js`: `renderExportDeckSelect`, `generateApkg`, `wireAnkiExport`) seguir testável:
  os testes `tests/k2f/test_playwright*.js` e `tests/configuracoes/test_playwright.js` chamam `switchSettingsSection('export')` direto.
- Nada de JS foi apagado. As chaves de texto `settings.tab.export` e `settings.export.*` ficaram nos arquivos de idioma.

## Como trazer de volta

Recolocar, na barra `.cfg-abas` de cada `index.html`, depois do botão de Notificações:

```html
<button type="button" aria-pressed="false" data-settings-section="export" data-i18n="settings.tab.export">📦 Exportar</button>
```

e tirar o comentário "ARQUIVADO" do painel. `switchSettingsSection` e `wireAnkiExport` já tratam o resto.

## Subtítulo (decidido)

Com a aba arquivada, o subtítulo de Configurações (`settings.subtitle`) deixou de citar exportação. Aprovado pela autora em 2026-10-23:
pt-BR "Suas informações e preferências de conta"; en "Your account information and preferences".
