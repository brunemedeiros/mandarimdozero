import * as React from "react"
import { ThemeProvider, CssBaseline, Button, Typography, Box } from "@mui/material"
import { mk, P } from "./muitheme"
import { NAV } from "./gamecommon"
import { useBrune } from "./data"
export function useMui(){const b=useBrune(React);const th=React.useMemo(()=>mk(b.lang,b.theme),[b.lang,b.theme]);return {b,th,c:P[b.lang][b.theme]}}
export const Shell=({th,active,children}:{th:any,active:number,children:any})=>(
 <ThemeProvider theme={th}><CssBaseline/><div className="app">
  <Box component="aside" className="side" sx={{bgcolor:"background.paper",borderRight:1,borderColor:"divider"}}>
   <Typography sx={{px:1.5,pb:2,pt:.5,fontWeight:800,fontSize:"1.1rem"}} variant="h4">Idiomas com Prof. Brune</Typography>
   {NAV.map((n,i)=>(<Button key={n} fullWidth sx={{justifyContent:"flex-start",px:1.5,py:1,color:i===active?"primary.contrastText":"text.secondary",bgcolor:i===active?"primary.main":"transparent","&:hover":{bgcolor:i===active?"primary.dark":"divider",color:i===active?"#fff":"text.primary"}}}>{n}</Button>))}
   <Typography variant="body2" sx={{mt:"auto",p:1.5,color:"text.secondary"}}>Brune · conta admin</Typography></Box>
  <main className="main">{children}</main></div></ThemeProvider>)
