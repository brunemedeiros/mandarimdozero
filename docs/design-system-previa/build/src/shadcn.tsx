import * as React from "react"
import { createRoot } from "react-dom/client"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Input } from "./ui/input"
import { Switch } from "./ui/switch"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Alert, AlertDescription } from "./ui/alert"
import { Progress } from "./ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { NAV, LBL, S, STATS, useBrune } from "./data"

const tone:Record<string,string>={ok:"bg-[var(--b-ok)]",warn:"bg-[var(--b-warn)]",stop:"bg-[var(--b-err)]"}
function App(){
  const b=useBrune(React)
  return (
  <div className="app">
    <aside className="side bg-card border-r">
      <div className="px-3 pb-4 pt-1 text-lg font-extrabold" style={{fontFamily:"var(--b-font-display)"}}>Idiomas com Prof. Brune</div>
      {NAV.map((n,i)=>(<a key={n} href="#" className={"rounded-md px-3 py-2 text-sm font-bold no-underline "+(i===0?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-accent")}>{n}</a>))}
      <div className="mt-auto p-3 text-sm text-muted-foreground">Brune · conta admin</div>
    </aside>
    <main className="main">
      <div className="head">
        <div><div className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Painel da professora</div>
          <h1 className="text-3xl font-extrabold" style={{fontFamily:"var(--b-font-display)"}}>Alunos de {b.lang==="zh"?"Mandarim":"Francês"}</h1>
          <p className="text-sm text-muted-foreground">18 alunos ativos · dados de exemplo</p></div>
        <div className="hbox"><Button variant="outline">Exportar lista</Button><Button>Convidar aluno</Button></div>
      </div>
      <Alert className="!flex items-center justify-between gap-3 border-[color-mix(in_srgb,var(--b-warn)_45%,transparent)] bg-[color-mix(in_srgb,var(--b-warn)_14%,var(--b-bg))]">
        <AlertDescription className="text-foreground"><span><strong>3 alunos</strong> estão há mais de 7 dias sem estudar.</span></AlertDescription>
        <Button size="sm" className="bg-[var(--b-warn)] text-[var(--b-on-vivid)] hover:bg-[var(--b-warn)]/90">Enviar lembrete</Button>
      </Alert>
      <div className="stats4">{STATS.map(([t,v,d])=>(
        <Card key={t} className="gap-1 py-4 shadow-sm"><CardContent className="grid gap-1 px-5">
          <span className="text-sm text-muted-foreground">{t}</span>
          <span className="num text-3xl font-extrabold leading-tight" style={{fontFamily:"var(--b-font-display)"}}>{v}</span>
          <span className="text-sm text-muted-foreground">{d}</span></CardContent></Card>))}</div>
      <div className="hbox">
        <Input className="grow bg-[var(--b-raised)]" type="search" placeholder="Buscar por nome ou @usuário" aria-label="Buscar aluno"/>
        <select aria-label="Idioma" className="h-9 rounded-md border bg-[var(--b-raised)] px-3 text-sm"><option>Francês</option><option>Mandarim</option></select>
        <label className="flex items-center gap-2 text-sm"><Switch/> Só quem precisa de atenção</label>
      </div>
      <Card className="py-0 shadow-sm"><div className="tablewrap"><Table>
        <TableHeader><TableRow>{["Aluno","Nível","Sequência","Atividade","Retenção","Situação",""].map(h=><TableHead key={h} className="whitespace-nowrap px-4 py-3 font-extrabold text-muted-foreground">{h}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{S.map(([n,u,i,lv,m,st,la,r,s])=>(
          <TableRow key={u}>
            <TableCell className="px-4 py-3"><div className="who"><Avatar className="size-10"><AvatarFallback className="bg-[var(--b-primary-dark)] font-extrabold text-white dark:bg-muted dark:text-foreground">{i}</AvatarFallback></Avatar>
              <div><div className="font-extrabold">{n}</div><small className="text-muted-foreground">@{u}</small></div></div></TableCell>
            <TableCell className="px-4">{lv} <small className="text-muted-foreground">{m}</small></TableCell>
            <TableCell className="num px-4">{st?st+" dias":"zerada"}</TableCell>
            <TableCell className="px-4 whitespace-nowrap">{la}</TableCell>
            <TableCell className="px-4"><div className="hbox flex-nowrap"><Progress value={r} className="w-24"/><small className="num">{r}%</small></div></TableCell>
            <TableCell className="px-4"><Badge className={tone[s]+" border-transparent text-[var(--b-on-vivid)]"}>{LBL[s]}</Badge></TableCell>
            <TableCell className="px-4"><Button variant="ghost" size="sm">Abrir</Button></TableCell>
          </TableRow>))}</TableBody></Table></div></Card>
    </main>
  </div>)
}
createRoot(document.getElementById("root")!).render(<App/>)
