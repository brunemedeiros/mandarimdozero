import { createTheme } from "@mui/material"
export const P:any={
 fr:{light:{primary:"#3498D6",dark:"#1D5A82",on:"#201335",bg:"#FAF5EA",surf:"#F0E8D8",raised:"#FFFCF5",line:"#E1D6C0",ink:"#201335",soft:"#5C4E73",ok:"#3A7359",warn:"#8C5F0E",err:"#B81F13",vivid:"#FFFFFF"},
     dark:{primary:"#4DA9E8",dark:"#7FC4F5",on:"#201335",bg:"#17121F",surf:"#201A2C",raised:"#2A2238",line:"#362C42",ink:"#EDE6F5",soft:"#C5B8D9",ok:"#52B487",warn:"#C9973A",err:"#FF6B5C",vivid:"#201335"}},
 zh:{light:{primary:"#C0231F",dark:"#8E1915",on:"#FFFFFF",bg:"#FBF4E8",surf:"#F3E6CE",raised:"#FFFBF2",line:"#E2CFA6",ink:"#211714",soft:"#5C4A3F",ok:"#3A7359",warn:"#8C5F0E",err:"#A83A2E",vivid:"#FFFFFF"},
     dark:{primary:"#E1524B",dark:"#FF8078",on:"#1A0605",bg:"#1B1512",surf:"#251C17",raised:"#30251F",line:"#3C2F27",ink:"#F1E4D6",soft:"#C7B5A5",ok:"#52B487",warn:"#C9973A",err:"#FF7B6E",vivid:"#1B1512"}}}
export const BODY="'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
export function mk(lang:string,mode:string){
  const c=P[lang][mode]; const disp=BODY
  return createTheme({
    palette:{mode:mode as any,primary:{main:c.primary,dark:c.dark,contrastText:c.on},warning:{main:c.warn,contrastText:c.vivid},success:{main:c.ok,contrastText:c.vivid},error:{main:c.err,contrastText:c.vivid},info:{main:c.dark,contrastText:"#fff"},background:{default:c.bg,paper:c.surf},text:{primary:c.ink,secondary:c.soft},divider:c.line},
    shape:{borderRadius:10},
    typography:{fontFamily:BODY,button:{textTransform:"none",fontWeight:800},h1:{fontFamily:disp,fontWeight:800,fontSize:"1.9rem",lineHeight:1.15},h4:{fontFamily:disp,fontWeight:800}},
    components:{
      MuiCard:{styleOverrides:{root:{borderRadius:14,border:`1px solid ${c.line}`,boxShadow:"0 2px 8px rgba(33,23,20,.08)",backgroundImage:"none"}}},
      MuiTableCell:{styleOverrides:{root:{borderColor:c.line,whiteSpace:"nowrap"},head:{fontWeight:800,color:c.soft}}},
      MuiOutlinedInput:{styleOverrides:{root:{backgroundColor:c.raised}}},
      MuiChip:{styleOverrides:{root:{fontWeight:800}}},
      MuiAlert:{styleOverrides:{root:{color:c.ink,alignItems:"center",border:`1px solid ${c.line}`},standardSuccess:{backgroundColor:mode==="dark"?"#1d2b25":"#DFE6D9"},standardWarning:{backgroundColor:mode==="dark"?"#2b2418":"#EADFC9"},standardError:{backgroundColor:mode==="dark"?"#33201f":"#F2DAD3"},standardInfo:{backgroundColor:mode==="dark"?"#1d2735":"#DCE6EC"}}}}})
}
