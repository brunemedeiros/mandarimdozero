import * as React from "react"
import { Flame, Star, Target, BookOpen, Trophy, Zap, Lock } from "lucide-react"
export const ACH:[any,string,string,boolean][]=[[Flame,"Sequência de 21 dias","Conquistada",true],[Star,"100 cartões no mês","Conquistada",true],[Target,"Meta diária 10 vezes","Conquistada",true],[BookOpen,"Módulo 4 concluído","Conquistada",true],[Trophy,"Retenção acima de 90%","Falta 1 semana",false],[Zap,"500 cartões revisados","312 de 500",false]]
export const Streak=({n}:{n:string})=><span className="streak"><span className="ico"><Flame size={20}/></span>{n}</span>
export const Week=()=><div className="week">{["S","T","Q","Q","S","S","D"].map((d,i)=><span key={i} className={i<5?"on":i===5?"today":""}>{d}</span>)}</div>
export const Xp=()=><div className="xp"><div className="xp-top"><span>Nível 7</span><span>3.420 de 4.000 XP</span></div><div className="xp-bar"><i style={{width:"85%"}}/></div></div>
export const Ring=({v,t,s}:{v:number,t:string,s:string})=><div className="ring" style={{["--v" as any]:v}}><b>{t}<small>{s}</small></b></div>
export const Achv=()=><div className="achv">{ACH.map(([I,t,s,on])=>{const Ic=on?I:(t.startsWith("Reten")||t.startsWith("500"))?I:Lock;return <div key={t} className={"ach"+(on?"":" lock")}><span className="badge-ico"><Ic size={24}/></span><strong>{t}</strong><small>{s}</small></div>})}</div>
export const NAV=["Alunos","Decks e cartões","Materiais de apoio","Relatórios","Notificações","Configurações","Guia de estilo"]
export const Src=({k,native}:{k:string,native:Set<string>})=>native.has(k)?<span className="src native">Nativo</span>:<span className="src">Feito à mão</span>
export const ACT=[["Hoje · 48 cartões revisados","Em dia","ok"],["Ontem · Ditado do módulo 4","Acertou 8 de 10","info"],["Há 2 dias · Checkpoint do módulo 3","Aprovada","ok"],["Há 5 dias · Ouça e traduza","Acertou 5 de 10","warn"]]
export const RANK=[["CF","Camila Ferraz","4.810"],["MA","Marina Alves","3.420"],["RC","Rafael Costa","2.250"]]
export const STATS4=[["Sequência","23 dias","recorde: 41 dias"],["XP total","3.420","580 para o nível 8"],["Cartões hoje","48","meta de 60"],["Retenção","91%","últimos 30 dias"]]
export const AlunoSub=()=><>@marina.alves · <span>{"Francês"}</span> A2 · Módulo 4</>
