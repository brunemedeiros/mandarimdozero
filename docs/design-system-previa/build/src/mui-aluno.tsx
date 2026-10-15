import * as React from "react"
import { createRoot } from "react-dom/client"
import { Button, Card, CardContent, CardHeader, CardActions, Chip, Avatar, Typography, TextField, CircularProgress, Box } from "@mui/material"
import { Streak, Week, Xp, Achv, ACT, RANK, STATS4 } from "./gamecommon"
import { Shell, useMui } from "./mui-shell"
function App(){
  const {b,th,c}=useMui(); const col:any={ok:"success",warn:"warning",info:"info"}
  const Av=({i,s=40}:{i:string,s?:number})=><Avatar sx={{width:s,height:s,bgcolor:b.theme==="dark"?"background.default":c.dark,color:b.theme==="dark"?c.ink:"#fff",fontSize:s>50?"1.2rem":".85rem",fontWeight:800,border:b.theme==="dark"?`1px solid ${c.line}`:0}}>{i}</Avatar>
  const T=(t:string)=><CardHeader title={t} titleTypographyProps={{variant:"h6",sx:{fontWeight:800,fontSize:"1.05rem"}}}/>
  return <Shell th={th} active={0}>
   <div className="head"><div className="who-big"><Av i="MA" s={64}/><div><Typography variant="overline" sx={{fontWeight:800,color:"text.secondary",letterSpacing:".09em"}}>Aluna</Typography><Typography variant="h1" component="h1">Marina Alves</Typography><Typography variant="body2" color="text.secondary">@marina.alves · {b.lang==="zh"?"Mandarim":"Francês"} A2 · Módulo 4</Typography></div></div>
    <div className="wrapx"><Button variant="outlined" color="inherit" sx={{borderColor:"divider"}}>Enviar mensagem</Button><Button variant="contained" disableElevation>Ver cartões</Button></div></div>
   <div className="stats4">{STATS4.map(([t,v,d])=><Card key={t}><CardContent sx={{display:"grid",gap:.25}}><Typography variant="body2" color="text.secondary">{t}</Typography><Typography variant="h4" className="num" sx={{fontSize:"2rem",lineHeight:1.1}}>{v}</Typography><Typography variant="body2" color="text.secondary">{d}</Typography></CardContent></Card>)}</div>
   <div className="cols2">
    <Card>{T("Meta do dia")}<CardContent><div className="wrapx" style={{gap:20}}>
      <Box sx={{position:"relative",display:"inline-flex"}}><CircularProgress variant="determinate" value={100} size={112} thickness={5} sx={{color:"divider"}}/><CircularProgress variant="determinate" value={80} size={112} thickness={5} sx={{position:"absolute",left:0}}/><Box sx={{position:"absolute",inset:0,display:"grid",placeItems:"center",textAlign:"center"}}><Typography sx={{fontWeight:800,fontSize:"1.2rem",lineHeight:1.1}}>48/60<Typography component="small" sx={{display:"block",fontSize:".72rem",color:"text.secondary",fontWeight:700}}>cartões</Typography></Typography></Box></Box>
      <div className="stack"><Streak n="23 dias"/><Week/></div></div></CardContent></Card>
    <Card>{T("Nível e conquistas")}<CardContent><div className="stack"><Xp/><Achv/></div></CardContent></Card>
   </div>
   <Card>{T("Atividade recente")}<CardContent><ul className="list">{ACT.map(([a,l,t])=><li key={a}><span>{a}</span><Chip size="small" label={l} color={col[t]}/></li>)}</ul></CardContent></Card>
   <div className="gal">
    <Card>{T("Anotação da professora")}<CardContent><TextField fullWidth multiline minRows={3} label="Lembrete para a próxima aula" placeholder="Ex.: reforçar os verbos do passé composé"/></CardContent><CardActions sx={{px:2,pb:2}}><Button variant="contained" disableElevation>Salvar anotação</Button></CardActions></Card>
    <Card>{T("Ranking da turma")}<CardContent><ul className="rank">{RANK.map(([a,n,x],i)=><li key={n}><span className="pos">{i+1}</span><Av i={a}/><strong>{n}</strong><span className="xpn num">{x} XP</span></li>)}</ul></CardContent></Card>
   </div>
  </Shell>
}
createRoot(document.getElementById("root")!).render(<App/>)
