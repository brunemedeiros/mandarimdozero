import * as React from "react"
import { createRoot } from "react-dom/client"
import { ThemeProvider, createTheme, CssBaseline, Button, Card, CardContent, Chip, Avatar, Alert, LinearProgress, Switch, FormControlLabel, TextField, NativeSelect, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Box } from "@mui/material"
import { NAV, LBL, S, STATS, useBrune } from "./data"

const P:any={
 fr:{light:{primary:"#3498D6",dark:"#1D5A82",on:"#201335",bg:"#FAF5EA",surf:"#F0E8D8",raised:"#FFFCF5",line:"#E1D6C0",ink:"#201335",soft:"#5C4E73",ok:"#3A7359",warn:"#8C5F0E",err:"#B81F13",vivid:"#FFFFFF"},
     dark:{primary:"#4DA9E8",dark:"#7FC4F5",on:"#201335",bg:"#17121F",surf:"#201A2C",raised:"#2A2238",line:"#362C42",ink:"#EDE6F5",soft:"#C5B8D9",ok:"#52B487",warn:"#C9973A",err:"#FF6B5C",vivid:"#201335"}},
 zh:{light:{primary:"#C0231F",dark:"#8E1915",on:"#FFFFFF",bg:"#FBF4E8",surf:"#F3E6CE",raised:"#FFFBF2",line:"#E2CFA6",ink:"#211714",soft:"#5C4A3F",ok:"#3A7359",warn:"#8C5F0E",err:"#A83A2E",vivid:"#FFFFFF"},
     dark:{primary:"#E1524B",dark:"#FF8078",on:"#1A0605",bg:"#1B1512",surf:"#251C17",raised:"#30251F",line:"#3C2F27",ink:"#F1E4D6",soft:"#C7B5A5",ok:"#52B487",warn:"#C9973A",err:"#FF7B6E",vivid:"#1B1512"}}}
const BODY="'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
function mk(lang:string,mode:string){
  const c=P[lang][mode]; const disp=BODY
  return createTheme({
    palette:{mode:mode as any,primary:{main:c.primary,dark:c.dark,contrastText:c.on},warning:{main:c.warn,contrastText:c.vivid},success:{main:c.ok,contrastText:c.vivid},error:{main:c.err,contrastText:c.vivid},background:{default:c.bg,paper:c.surf},text:{primary:c.ink,secondary:c.soft},divider:c.line},
    shape:{borderRadius:10},
    typography:{fontFamily:BODY,button:{textTransform:"none",fontWeight:800},h1:{fontFamily:disp,fontWeight:800,fontSize:"1.9rem",lineHeight:1.15},h4:{fontFamily:disp,fontWeight:800}},
    components:{
      MuiCard:{styleOverrides:{root:{borderRadius:14,border:`1px solid ${c.line}`,boxShadow:"0 2px 8px rgba(33,23,20,.08)",backgroundImage:"none"}}},
      MuiTableCell:{styleOverrides:{root:{borderColor:c.line,whiteSpace:"nowrap"},head:{fontWeight:800,color:c.soft}}},
      MuiOutlinedInput:{styleOverrides:{root:{backgroundColor:c.raised}}},
      MuiChip:{styleOverrides:{root:{fontWeight:800}}},
      MuiAlert:{styleOverrides:{root:{border:`1px solid ${c.warn}66`,backgroundColor:mode==="dark"?"#2b2418":"#EADFC9",color:c.ink,alignItems:"center"},icon:{color:c.warn}}}}})
}
function App(){
  const b=useBrune(React); const c=P[b.lang][b.theme]; const th=React.useMemo(()=>mk(b.lang,b.theme),[b.lang,b.theme])
  const col:any={ok:"success",warn:"warning",stop:"error"}
  return (<ThemeProvider theme={th}><CssBaseline/>
  <div className="app">
    <Box component="aside" className="side" sx={{bgcolor:"background.paper",borderRight:1,borderColor:"divider"}}>
      <Typography sx={{px:1.5,pb:2,pt:.5,fontWeight:800,fontSize:"1.1rem"}} variant="h4">Idiomas com Prof. Brune</Typography>
      {NAV.map((n,i)=>(<Button key={n} fullWidth sx={{justifyContent:"flex-start",px:1.5,py:1,color:i===0?"primary.contrastText":"text.secondary",bgcolor:i===0?"primary.main":"transparent","&:hover":{bgcolor:i===0?"primary.dark":"divider",color:i===0?"#fff":"text.primary"}}}>{n}</Button>))}
      <Typography variant="body2" sx={{mt:"auto",p:1.5,color:"text.secondary"}}>Brune · conta admin</Typography>
    </Box>
    <main className="main">
      <div className="head"><div>
        <Typography variant="overline" sx={{fontWeight:800,color:"text.secondary",letterSpacing:".09em"}}>Painel da professora</Typography>
        <Typography variant="h1" component="h1">Alunos de {b.lang==="zh"?"Mandarim":"Francês"}</Typography>
        <Typography variant="body2" color="text.secondary">18 alunos ativos · dados de exemplo</Typography></div>
        <div className="hbox"><Button variant="outlined" color="inherit" sx={{borderColor:"divider"}}>Exportar lista</Button><Button variant="contained" disableElevation>Convidar aluno</Button></div></div>
      <Alert severity="warning" icon={false} action={<Button size="small" variant="contained" color="warning" disableElevation>Enviar lembrete</Button>}><strong>3 alunos</strong> estão há mais de 7 dias sem estudar.</Alert>
      <div className="stats4">{STATS.map(([t,v,d])=>(<Card key={t}><CardContent sx={{display:"grid",gap:.25}}>
        <Typography variant="body2" color="text.secondary">{t}</Typography>
        <Typography variant="h4" className="num" sx={{fontSize:"2rem",lineHeight:1.1}}>{v}</Typography>
        <Typography variant="body2" color="text.secondary">{d}</Typography></CardContent></Card>))}</div>
      <div className="hbox">
        <TextField className="grow" size="small" type="search" placeholder="Buscar por nome ou @usuário" inputProps={{"aria-label":"Buscar aluno"}}/>
        <NativeSelect inputProps={{"aria-label":"Idioma"}} defaultValue="Francês"><option>Francês</option><option>Mandarim</option></NativeSelect>
        <FormControlLabel control={<Switch/>} label="Só quem precisa de atenção"/></div>
      <Card><TableContainer><Table><TableHead><TableRow>{["Aluno","Nível","Sequência","Atividade","Retenção","Situação",""].map(h=><TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
        <TableBody>{S.map(([n,u,i,lv,m,st,la,r,s])=>(<TableRow key={u}>
          <TableCell><div className="who"><Avatar sx={{bgcolor:b.theme==="dark"?"background.default":c.dark,color:b.theme==="dark"?c.ink:"#fff",fontSize:".85rem",fontWeight:800,border:b.theme==="dark"?`1px solid ${c.line}`:0}}>{i}</Avatar>
            <div><Typography sx={{fontWeight:800}}>{n}</Typography><Typography variant="caption" color="text.secondary">@{u}</Typography></div></div></TableCell>
          <TableCell>{lv} <Typography component="small" variant="caption" color="text.secondary">{m}</Typography></TableCell>
          <TableCell className="num">{st?st+" dias":"zerada"}</TableCell><TableCell>{la}</TableCell>
          <TableCell><div className="hbox" style={{flexWrap:"nowrap"}}><LinearProgress variant="determinate" value={r} sx={{width:88,height:8,borderRadius:4,bgcolor:"divider"}}/><Typography variant="caption" className="num">{r}%</Typography></div></TableCell>
          <TableCell><Chip size="small" label={LBL[s]} color={col[s]}/></TableCell>
          <TableCell><Button size="small" color="primary">Abrir</Button></TableCell></TableRow>))}</TableBody></Table></TableContainer></Card>
    </main></div></ThemeProvider>)
}
createRoot(document.getElementById("root")!).render(<App/>)
