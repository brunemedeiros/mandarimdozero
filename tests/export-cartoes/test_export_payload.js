// Exportação de "Meus Cartões" (arquivo/link): direção e pinyin de cartões
// nativos vêm dos Fields, nunca das colunas espelho. Node/VM.
const fs=require('fs'), vm=require('vm'), path=require('path');
const root=path.join(__dirname,'..','..');
let ok=0, fail=0; const t=(n,c)=>{ if(c){ok++;} else {fail++; console.log('FALHA:',n);} };
function load(appKey){
  const ctx={console, APP_KEY:appKey, document:{getElementById:()=>null}};
  vm.createContext(ctx);
  for (const f of ['shared/flashcard-model.js','shared/flashcard-editor-state.js','shared/flashcard-native-persistence.js','shared/my-flashcards.js'])
    vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
  return ctx;
}
const fr=load('frances');
const F=(id,lang,v,extra)=>Object.assign({id,lang,role:null,content:{value:v},audio:null,image:null,pinyinFieldId:null},extra||{});
// legado
let p=fr.myFlashcardsExportPayload([{front:'chat',back_trans:'gato',front_is_target_language:false,note:'n',tags:['a']}]);
t('legado preservado', p.cards[0].front==='chat' && p.cards[0].frontIsTargetLanguage===false && p.cards[0].note==='n');
// nativo invertido (frente em pt-BR)
p=fr.myFlashcardsExportPayload([{fields:[F('a','pt-BR','gato'),F('b','fr','chat')],card_generation_mode:'normal',front:'gato',back_trans:'chat',front_is_target_language:true}]);
t('nativo invertido -> false', p.cards[0].frontIsTargetLanguage===false && p.cards[0].front==='gato' && p.cards[0].backTrans==='chat');
p=fr.myFlashcardsExportPayload([{fields:[F('a','fr','chat'),F('b','pt-BR','gato')],card_generation_mode:'normal_reversed',front_is_target_language:true}]);
t('nativo normal -> true', p.cards[0].frontIsTargetLanguage===true);
p=fr.myFlashcardsExportPayload([{fields:[F('a',null,'x'),F('b',null,'y')],card_generation_mode:'normal'}]);
t('lang desconhecido -> true', p.cards[0].frontIsTargetLanguage===true);
// MC por role
p=fr.myFlashcardsExportPayload([{fields:[F('d','fr','non',{role:'distractor'}),F('a','pt-BR','sim',{role:'answer'}),F('p','fr','oui',{role:'prompt'})],card_generation_mode:'multiple_choice'}]);
t('MC prompt/answer', p.cards[0].front==='oui' && p.cards[0].backTrans==='sim' && p.cards[0].frontIsTargetLanguage===true);
// cloze fica de fora
p=fr.myFlashcardsExportPayload([{fields:[F('a','fr','Je {{c1::suis}}'),F('b','pt-BR','Eu sou')],card_generation_mode:'cloze'},{front:'a',back_trans:'b'}]);
t('cloze omitido', p.cards.length===1 && p.cards[0].front==='a');
// zh com pinyin satélite
const zh=load('mandarim');
p=zh.myFlashcardsExportPayload([{fields:[F('h','zh','你好',{pinyinFieldId:'p'}),F('p','zh-pinyin','nǐ hǎo'),F('t','pt-BR','olá')],card_generation_mode:'normal'}]);
t('zh pinyin + tradução', p.cards[0].front==='你好' && p.cards[0].frontPinyin==='nǐ hǎo' && p.cards[0].backTrans==='olá' && p.cards[0].frontIsTargetLanguage===true);
// round-trip: o import aceita e mantém a direção
const st=fr.nativeNoteEditorStateFromImportPayload({front:'gato',backTrans:'chat',frontIsTargetLanguage:false},'frances');
t('reimport mantém direção', st.fields[0].lang==='pt-BR' && st.fields[1].lang==='fr');
console.log(`export-cartoes: ${ok} ok, ${fail} falhas`); process.exit(fail?1:0);
