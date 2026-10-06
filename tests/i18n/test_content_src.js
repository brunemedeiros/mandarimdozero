const fs=require('fs'),vm=require('vm');
const root=require('path').resolve(__dirname,'..','..')+'/';
const win={CONTENT_OVERLAYS:{}};const ctx={window:win,document:{},console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root+'shared/content-i18n.js','utf8'),ctx);
vm.runInContext(fs.readFileSync(root+'fr/content.js','utf8')+';globalThis.U=UNITS;globalThis.M=MODULES;',ctx);
vm.runInContext(fs.readFileSync(root+'fr/content.en.js','utf8'),ctx);
const orig=JSON.stringify(ctx.U);
const ci=ctx.window.ContentI18n.create({units:ctx.U,overlayUrl:()=>'x'});
ci.apply('en');
const u2=ctx.U.find(u=>u.id==='A1-2'),u9=ctx.U.find(u=>u.id==='A1-9'),g=ctx.U.find(u=>u.id==='A1-g1');
const ok=(c,m)=>console.log(c?'ok  ':'FAIL',m);
ok(u2.phrases[1].f==='Je suis américaine.'&&u2.phrases[1].blocks.map(b=>b.f).join(' ')==='Je suis américaine.'&&u2.phrases[1].scenarioEmoji==='🇺🇸','A1-2 frase+blocks+emoji');
ok(u2.vocab[8].f==='américain / américaine'&&u2.vocab[8].t==='American (m. / f.)','A1-2 vocab');
ok(u2.dialogue.lines[3].f.includes('américaine')&&u2.dialogue.lines[4].f==='Oui, je suis américaine !','A1-2 dialogo');
ok(u9.phrases[0].f==='Je suis américaine.','A1-9 frase');
ok(g.grammar.blocks[0].examples[0].f==='Je suis américaine.','A1-g1 exemplo');
ok(u2.phrases[0].f==='Comment tu t\'appelles ?','frases nao tocadas intactas');
ci.apply('pt-BR');
ok(JSON.stringify(ctx.U)===orig,'voltar a pt-BR restaura TUDO byte a byte (JSON)');
ci.apply('en');ci.apply('pt-BR');ci.apply('en');ci.apply('pt-BR');
ok(JSON.stringify(ctx.U)===orig,'ciclos repetidos ok');

// ---- mandarim (zh)
{
const win2={CONTENT_OVERLAYS:{}};const c2={window:win2,document:{},console};vm.createContext(c2);
vm.runInContext(fs.readFileSync(root+'shared/content-i18n.js','utf8'),c2);
vm.runInContext(fs.readFileSync(root+'zh/content.js','utf8')+';globalThis.U=UNITS;',c2);
vm.runInContext(fs.readFileSync(root+'zh/stories.js','utf8')+';globalThis.S=STORIES;',c2);
vm.runInContext(fs.readFileSync(root+'zh/hanzi-data.js','utf8')+';globalThis.H=HANZI_LESSONS;',c2);
vm.runInContext(fs.readFileSync(root+'zh/content.en.js','utf8'),c2);
const o2=JSON.stringify(c2.U),os=JSON.stringify(c2.S),oh=JSON.stringify(c2.H);
const ci2=c2.window.ContentI18n.create({units:c2.U,stories:c2.S,hanzi:c2.H,overlayUrl:()=>'x'});
ci2.apply('en');
const z=c2.U.find(u=>u.id===2);
ok(z.vocab[6].c==='美国'&&z.vocab[6].p==='Měiguó'&&z.vocab[6].t==='United States','zh vocab');
ok(z.phrases[1].c==='我是美国人。'&&z.phrases[1].blocks.map(b=>b.c).join('')==='我是美国人。','zh frase+blocks');
ok(z.dialogue.lines[3].c==='我是美国人。','zh dialogo');
const sh=z.concepts.find(c=>c.id==='shi'),dr=z.concepts.find(c=>c.id==='shi-drop-casual');
ok(sh.blocks[0].examples[0].c==='我是美国人'&&sh.blocks[1].examples[1].p==='wǒ shì Měiguó rén'&&dr.blocks[0].examples[0].c==='我美国人','zh exemplos de conceito');
ok(c2.S[0].beats[1].lines[1].c==='我是美国人。'&&c2.S[0].beats[1].lines[2].c==='美国！好！','zh historia');
const hb=c2.H[4][2];
ok(hb.char==='美'&&hb.pinyin==='měi'&&/beautiful/.test(hb.meaning)&&c2.H[4][3].char==='西','zh hanzi: 巴 vira 美 só no slot, vizinhos intactos');
ci2.apply('pt-BR');
ci2.apply('en');ci2.apply('pt-BR');
ok(JSON.stringify(c2.U)===o2&&JSON.stringify(c2.S)===os&&JSON.stringify(c2.H)===oh&&c2.H[4][2].char==='巴','zh voltar a pt-BR restaura tudo (inclui hanzi)');
}
