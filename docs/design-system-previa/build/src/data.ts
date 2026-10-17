export const NAV=["Alunos","Decks e cartões","Materiais de apoio","Relatórios","Notificações","Configurações"]
export const LBL:Record<string,string>={ok:"Em dia",warn:"Atenção",stop:"Parado"}
export const S=[
["Marina Alves","marina.alves","MA","A2","Módulo 4",23,"hoje",91,"ok"],
["Rafael Costa","rafa.costa","RC","A1","Módulo 2",4,"ontem",84,"ok"],
["Helena Duarte","helena.d","HD","B1","Módulo 7",0,"há 9 dias",72,"stop"],
["Tiago Nunes","tiagonunes","TN","A1","Módulo 1",2,"há 3 dias",78,"warn"],
["Camila Ferraz","cafer","CF","A2","Módulo 5",41,"hoje",95,"ok"],
["Bruno Teles","brunot","BT","A1","Módulo 3",0,"há 12 dias",66,"stop"]] as [string,string,string,string,string,number,string,number,string][]
export const STATS=[["Alunos ativos","18","2 novos este mês"],["Estudaram hoje","11","61% da turma"],["Cartões vencidos","142","média de 8 por aluno"],["Parados há 7+ dias","3","precisam de atenção"]]
export function useBrune(React:any){
  const r=document.documentElement
  const [s,set]=React.useState({lang:r.getAttribute("data-lang")||"fr",theme:r.getAttribute("data-theme")||"light"})
  React.useEffect(()=>{const h=(e:MessageEvent)=>{if(e.data&&e.data.brune)set((p:any)=>({...p,...e.data.brune}))};addEventListener("message",h);try{parent.postMessage({bridgeReady:true},"*")}catch(_){ }return()=>removeEventListener("message",h)},[])
  return s as {lang:string,theme:string}
}
