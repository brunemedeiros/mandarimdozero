import * as React from "react"
import { createRoot } from "react-dom/client"
import { Button, Card, CardContent, CardHeader, Chip, Avatar, Typography, TextField, NativeSelect, FormControl, InputLabel, Checkbox, Radio, RadioGroup, Switch, FormControlLabel, LinearProgress, Alert, Tabs, Tab, Paper, DialogTitle, DialogContent, DialogContentText, DialogActions, CircularProgress, Box } from "@mui/material"
import { Streak, Week, Xp, Achv } from "./gamecommon"
import { Shell, useMui } from "./mui-shell"
const N=<span className="src native">Nativo</span>, H=<span className="src">Feito à mão</span>
function App(){
  const {b,th,c}=useMui(); const [tab,setTab]=React.useState(0)
  const Sec=({t,tag,children}:any)=><Card><CardHeader title={<div className="sect-h"><span>{t}</span>{tag}</div>} titleTypographyProps={{variant:"h6",sx:{fontWeight:800,fontSize:"1.05rem"},component:"div"}}/><CardContent>{children}</CardContent></Card>
  return <Shell th={th} active={6}>
   <div className="head"><div><Typography variant="overline" sx={{fontWeight:800,color:"text.secondary",letterSpacing:".09em"}}>Guia de estilo</Typography><Typography variant="h1" component="h1">Componentes</Typography><Typography variant="body2" color="text.secondary">Catálogo da tela, para comparar com o do shadcn · <span className="src native">Nativo</span> = vem na biblioteca, <span className="src">Feito à mão</span> = escrevi aqui</Typography></div></div>
   <div className="gal">
    <Sec t="Botões" tag={N}><div className="wrapx"><Button variant="contained" disableElevation>Primário</Button><Button variant="contained" color="inherit" disableElevation sx={{bgcolor:"background.default"}}>Secundário</Button><Button variant="outlined">Contorno</Button><Button>Texto</Button><Button variant="contained" color="warning" disableElevation>Atenção</Button><Button variant="contained" disabled>Desabilitado</Button></div></Sec>
    <Sec t="Campos" tag={N}><div className="stack"><TextField size="small" fullWidth label="Nome do aluno" placeholder="Ex.: Marina Alves"/><FormControl fullWidth size="small"><InputLabel shrink variant="standard" htmlFor="idi">Idioma</InputLabel><NativeSelect inputProps={{id:"idi"}}><option>Francês</option><option>Mandarim</option></NativeSelect></FormControl><TextField fullWidth multiline minRows={3} label="Mensagem" placeholder="Escreva um recado"/></div></Sec>
    <Sec t="Seleção" tag={N}><div className="stack"><FormControlLabel control={<Checkbox defaultChecked/>} label="Receber lembretes"/><FormControlLabel control={<Checkbox/>} label="Resumo semanal"/><RadioGroup row defaultValue="t"><FormControlLabel value="t" control={<Radio/>} label="Todos"/><FormControlLabel value="a" control={<Radio/>} label="Só atenção"/></RadioGroup><FormControlLabel control={<Switch defaultChecked/>} label="Notificações por e-mail"/><FormControlLabel control={<Switch/>} label="Modo escuro"/></div></Sec>
    <Sec t="Selos de situação" tag={N}><div className="wrapx"><Chip size="small" color="success" label="Em dia"/><Chip size="small" color="warning" label="Atenção"/><Chip size="small" color="error" label="Parado"/><Chip size="small" color="info" label="Novo"/><Chip size="small" label="Rascunho"/></div></Sec>
    <Sec t="Progresso" tag={N}><div className="stack">{[91,62,25].map(v=><LinearProgress key={v} variant="determinate" value={v} sx={{height:8,borderRadius:4,bgcolor:"divider"}}/>)}</div></Sec>
    <Sec t="Alertas" tag={N}><div className="stack"><Alert severity="success" icon={false}>Cartões salvos com sucesso.</Alert><Alert severity="warning" icon={false}>3 alunos estão parados há mais de 7 dias.</Alert><Alert severity="error" icon={false}>Não foi possível salvar. Tente de novo.</Alert><Alert severity="info" icon={false}>Novo módulo disponível no francês A2.</Alert></div></Sec>
    <Sec t="Abas" tag={N}><Tabs value={tab} onChange={(_,v)=>setTab(v)}><Tab label="Resumo"/><Tab label="Cartões"/><Tab label="Atividade"/></Tabs><Typography variant="body2" color="text.secondary" sx={{pt:1.5}}>Conteúdo da aba selecionada.</Typography></Sec>
    <Sec t="Avatares" tag={N}><div className="wrapx">{["MA","RC","HD","TN"].map(i=><Avatar key={i} sx={{bgcolor:b.theme==="dark"?"background.default":c.dark,color:b.theme==="dark"?c.ink:"#fff",fontSize:".85rem",fontWeight:800,border:b.theme==="dark"?`1px solid ${c.line}`:0}}>{i}</Avatar>)}</div></Sec>
    <Sec t="Janela de confirmação" tag={N}><Paper elevation={6} sx={{maxWidth:440,border:`1px solid ${c.line}`}}><DialogTitle sx={{fontWeight:800}}>Remover o vínculo com a aluna?</DialogTitle><DialogContent><DialogContentText>O progresso dela continua guardado. Você pode vincular de novo depois.</DialogContentText></DialogContent><DialogActions sx={{p:2}}><Button color="inherit">Cancelar</Button><Button variant="contained" color="warning" disableElevation>Remover</Button></DialogActions></Paper></Sec>
    <Sec t="Gamificação: meta e sequência" tag={N}><div className="wrapx" style={{gap:20}}>
      <Box sx={{position:"relative",display:"inline-flex"}}><CircularProgress variant="determinate" value={100} size={112} thickness={5} sx={{color:"divider"}}/><CircularProgress variant="determinate" value={80} size={112} thickness={5} sx={{position:"absolute",left:0}}/><Box sx={{position:"absolute",inset:0,display:"grid",placeItems:"center",textAlign:"center"}}><Typography sx={{fontWeight:800,fontSize:"1.2rem",lineHeight:1.1}}>48/60</Typography></Box></Box>
      <div className="stack"><Streak n="23 dias"/><Week/></div></div></Sec>
    <Sec t="Gamificação: nível" tag={H}><Xp/></Sec>
    <Sec t="Gamificação: conquistas" tag={H}><Achv/></Sec>
   </div></Shell>
}
createRoot(document.getElementById("root")!).render(<App/>)
