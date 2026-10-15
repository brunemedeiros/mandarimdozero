import * as React from "react"
import { createRoot } from "react-dom/client"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "./ui/card"
import { Badge } from "./ui/badge"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Textarea } from "./ui/textarea"
import { Label } from "./ui/label"
import { Streak, Week, Xp, Ring, Achv, NAV, ACT, RANK, STATS4 } from "./gamecommon"
import { useBrune } from "./data"
const tone:any={ok:"bg-[var(--b-ok)]",warn:"bg-[var(--b-warn)]",info:"bg-[var(--b-primary-dark)]"}
const Av=({i,c=""}:{i:string,c?:string})=><Avatar className={c||"size-10"}><AvatarFallback className="bg-[var(--b-primary-dark)] font-extrabold text-white dark:bg-muted dark:text-foreground">{i}</AvatarFallback></Avatar>
import { Shell } from "./shadcn-shell"
function App(){
  const b=useBrune(React)
  return <Shell active={0}>
    <div className="head"><div className="who-big"><Av i="MA" c="size-16"/><div><div className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Aluna</div><h1 className="text-3xl font-extrabold">Marina Alves</h1><p className="text-sm text-muted-foreground">@marina.alves · {b.lang==="zh"?"Mandarim":"Francês"} A2 · Módulo 4</p></div></div>
      <div className="wrapx"><Button variant="outline">Enviar mensagem</Button><Button>Ver cartões</Button></div></div>
    <div className="stats4">{STATS4.map(([t,v,d])=><Card key={t} className="gap-1 py-4 shadow-sm"><CardContent className="grid gap-1 px-5"><span className="text-sm text-muted-foreground">{t}</span><span className="num text-3xl font-extrabold leading-tight">{v}</span><span className="text-sm text-muted-foreground">{d}</span></CardContent></Card>)}</div>
    <div className="cols2">
      <Card className="shadow-sm"><CardHeader><CardTitle>Meta do dia</CardTitle></CardHeader><CardContent><div className="wrapx" style={{gap:20}}><Ring v={80} t="48/60" s="cartões"/><div className="stack"><Streak n="23 dias"/><Week/></div></div></CardContent></Card>
      <Card className="shadow-sm"><CardHeader><CardTitle>Nível e conquistas</CardTitle></CardHeader><CardContent><div className="stack"><Xp/><Achv/></div></CardContent></Card>
    </div>
    <Card className="shadow-sm"><CardHeader><CardTitle>Atividade recente</CardTitle></CardHeader><CardContent><ul className="list">{ACT.map(([a,l,t])=><li key={a}><span>{a}</span><Badge className={tone[t]+" border-transparent text-[var(--b-on-vivid)]"}>{l}</Badge></li>)}</ul></CardContent></Card>
    <div className="gal">
      <Card className="shadow-sm"><CardHeader><CardTitle>Anotação da professora</CardTitle></CardHeader><CardContent className="grid gap-2"><Label htmlFor="n">Lembrete para a próxima aula</Label><Textarea id="n" className="bg-[var(--b-raised)]" placeholder="Ex.: reforçar os verbos do passé composé"/></CardContent><CardFooter><Button>Salvar anotação</Button></CardFooter></Card>
      <Card className="shadow-sm"><CardHeader><CardTitle>Ranking da turma</CardTitle></CardHeader><CardContent><ul className="rank">{RANK.map(([a,n,x],i)=><li key={n}><span className="pos">{i+1}</span><Av i={a}/><strong>{n}</strong><span className="xpn num">{x} XP</span></li>)}</ul></CardContent></Card>
    </div>
  </Shell>
}
createRoot(document.getElementById("root")!).render(<App/>)
