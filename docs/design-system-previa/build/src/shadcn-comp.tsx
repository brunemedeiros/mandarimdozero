import * as React from "react"
import { createRoot } from "react-dom/client"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "./ui/card"
import { Badge } from "./ui/badge"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { Switch } from "./ui/switch"
import { Checkbox } from "./ui/checkbox"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import { NativeSelect, NativeSelectOption } from "./ui/native-select"
import { Label } from "./ui/label"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Alert, AlertDescription } from "./ui/alert"
import { Progress } from "./ui/progress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs"
import { Streak, Week, Xp, Ring, Achv } from "./gamecommon"
import { Shell } from "./shadcn-shell"
const N=<span className="src native">Nativo</span>, H=<span className="src">Feito à mão</span>
const Sec=({t,tag,children}:any)=><Card className="shadow-sm"><CardHeader><div className="sect-h"><CardTitle>{t}</CardTitle>{tag}</div></CardHeader><CardContent>{children}</CardContent></Card>
const tone={ok:"bg-[var(--b-ok)]",warn:"bg-[var(--b-warn)]",stop:"bg-[var(--b-err)]",info:"bg-[var(--b-primary-dark)]"}
const al=(c:string,t:string)=><Alert className={"flex items-center "+c}><AlertDescription className="text-foreground">{t}</AlertDescription></Alert>
function App(){
  return <Shell active={6}>
    <div className="head"><div><div className="eyebrow text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Guia de estilo</div><h1 className="text-3xl font-extrabold">Componentes</h1><p className="text-sm text-muted-foreground">Catálogo da tela, para comparar com o do shadcn · <span className="src native">Nativo</span> = vem na biblioteca, <span className="src">Feito à mão</span> = escrevi aqui</p></div></div>
    <div className="gal">
      <Sec t="Botões" tag={N}><div className="wrapx"><Button>Primário</Button><Button variant="secondary">Secundário</Button><Button variant="outline">Contorno</Button><Button variant="ghost">Texto</Button><Button className="bg-[var(--b-warn)] text-[var(--b-on-vivid)] hover:bg-[var(--b-warn)]/90">Atenção</Button><Button disabled>Desabilitado</Button></div></Sec>
      <Sec t="Campos" tag={N}><div className="stack"><div className="grid gap-2"><Label htmlFor="a">Nome do aluno</Label><Input id="a" className="bg-[var(--b-raised)]" placeholder="Ex.: Marina Alves"/></div><div className="grid gap-2"><Label htmlFor="b">Idioma</Label><NativeSelect id="b" className="w-full bg-[var(--b-raised)]"><NativeSelectOption>Francês</NativeSelectOption><NativeSelectOption>Mandarim</NativeSelectOption></NativeSelect></div><div className="grid gap-2"><Label htmlFor="c">Mensagem</Label><Textarea id="c" className="bg-[var(--b-raised)]" placeholder="Escreva um recado"/></div></div></Sec>
      <Sec t="Seleção" tag={N}><div className="stack"><label className="flex items-center gap-2 text-sm"><Checkbox defaultChecked/> Receber lembretes</label><label className="flex items-center gap-2 text-sm"><Checkbox/> Resumo semanal</label>
        <RadioGroup defaultValue="t" className="flex gap-4"><label className="flex items-center gap-2 text-sm"><RadioGroupItem value="t"/> Todos</label><label className="flex items-center gap-2 text-sm"><RadioGroupItem value="a"/> Só atenção</label></RadioGroup>
        <label className="flex items-center gap-2 text-sm"><Switch defaultChecked/> Notificações por e-mail</label><label className="flex items-center gap-2 text-sm"><Switch/> Modo escuro</label></div></Sec>
      <Sec t="Selos de situação" tag={N}><div className="wrapx"><Badge className={tone.ok+" border-transparent text-[var(--b-on-vivid)]"}>Em dia</Badge><Badge className={tone.warn+" border-transparent text-[var(--b-on-vivid)]"}>Atenção</Badge><Badge className={tone.stop+" border-transparent text-[var(--b-on-vivid)]"}>Parado</Badge><Badge className={tone.info+" border-transparent text-white"}>Novo</Badge><Badge variant="secondary">Rascunho</Badge></div></Sec>
      <Sec t="Progresso" tag={N}><div className="stack"><Progress value={91}/><Progress value={62}/><Progress value={25}/></div></Sec>
      <Sec t="Alertas" tag={N}><div className="stack">{al("bg-[color-mix(in_srgb,var(--b-ok)_16%,var(--b-bg))]","Cartões salvos com sucesso.")}{al("bg-[color-mix(in_srgb,var(--b-warn)_16%,var(--b-bg))]","3 alunos estão parados há mais de 7 dias.")}{al("bg-[color-mix(in_srgb,var(--b-err)_14%,var(--b-bg))]","Não foi possível salvar. Tente de novo.")}{al("bg-[color-mix(in_srgb,var(--b-primary)_16%,var(--b-bg))]","Novo módulo disponível no francês A2.")}</div></Sec>
      <Sec t="Abas" tag={N}><Tabs defaultValue="r"><TabsList><TabsTrigger value="r">Resumo</TabsTrigger><TabsTrigger value="c">Cartões</TabsTrigger><TabsTrigger value="a">Atividade</TabsTrigger></TabsList><TabsContent value="r" className="pt-2 text-sm text-muted-foreground">Conteúdo da aba selecionada.</TabsContent></Tabs></Sec>
      <Sec t="Avatares" tag={N}><div className="wrapx">{["MA","RC","HD","TN"].map(i=><Avatar key={i} className="size-10"><AvatarFallback className="bg-[var(--b-primary-dark)] font-extrabold text-white dark:bg-muted dark:text-foreground">{i}</AvatarFallback></Avatar>)}</div></Sec>
      <Sec t="Janela de confirmação" tag={N}><Card className="max-w-md bg-popover shadow-lg"><CardHeader><CardTitle>Remover o vínculo com a aluna?</CardTitle><CardDescription>O progresso dela continua guardado. Você pode vincular de novo depois.</CardDescription></CardHeader><CardFooter className="justify-end gap-2"><Button variant="outline">Cancelar</Button><Button className="bg-[var(--b-warn)] text-[var(--b-on-vivid)] hover:bg-[var(--b-warn)]/90">Remover</Button></CardFooter></Card></Sec>
      <Sec t="Gamificação: meta e sequência" tag={H}><div className="wrapx" style={{gap:20}}><Ring v={80} t="48/60" s="cartões"/><div className="stack"><Streak n="23 dias"/><Week/></div></div></Sec>
      <Sec t="Gamificação: nível" tag={H}><Xp/></Sec>
      <Sec t="Gamificação: conquistas" tag={H}><Achv/></Sec>
    </div>
  </Shell>
}
createRoot(document.getElementById("root")!).render(<App/>)
