// C1 (unidade, Node): regras de shared/core/midia-segura.js.
const path = require('path');
const { safeMediaUrl, safeMediaUrlRaw, flashcardImageHTML } = require(path.resolve(__dirname, '../../shared/core/midia-segura.js'));
let ok = 0, bad = 0;
const t = (name, cond, got) => { if (cond) ok++; else { bad++; console.log('FALHA', name, JSON.stringify(got)); } };
const accept = ['https://a.supabase.co/storage/v1/object/public/flashcard-media/x.png', 'http://exemplo.com/a.mp3', 'blob:http://127.0.0.1/123',
  'data:image/png;base64,iVBORw0KGgo=', 'data:audio/mpeg;base64,AAAA', 'audio/fr/a.mp3', '../shared/icons/a.svg', '/fr/a.png', '  https://a/b.png  ', 'HTTPS://A/B.PNG'];
accept.forEach(u => t('aceita ' + u, safeMediaUrlRaw(u) === u.trim(), safeMediaUrlRaw(u)));
const reject = ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java\tscript:alert(1)', 'vbscript:x', 'data:text/html,<script>1</script>', 'data:image', '//evil.com/a.png',
  '\\\\evil\\a.png', '/\\evil.com', '', '   ', null, undefined, 42, {}, 'https://a/b\n.png', 'file:///etc/passwd'];
reject.forEach(u => t('recusa ' + JSON.stringify(u), safeMediaUrl(u) === '', safeMediaUrl(u)));
t('recusa aspas duplas', safeMediaUrl('https://x/a.png" onerror="1') === '', safeMediaUrl('https://x/a.png" onerror="1'));
t('recusa < > e crase', safeMediaUrl('https://x/<b>') === '' && safeMediaUrl('a`b.png') === '');
t("escapa & e ' para atributo", safeMediaUrl("https://x/l'eau.mp3?a=1&b=2") === 'https://x/l&#39;eau.mp3?a=1&amp;b=2', safeMediaUrl("https://x/l'eau.mp3?a=1&b=2"));
t('img igual a antes para URL comum', flashcardImageHTML('https://x/a.png') === '<img src="https://x/a.png" class="flashcard-image" alt="">', flashcardImageHTML('https://x/a.png'));
t('img vazio sem URL', flashcardImageHTML(null) === '' && flashcardImageHTML('javascript:1') === '');
console.log(`C1 unidade: ${ok}/${ok + bad}`);
process.exitCode = bad ? 1 : 0;
