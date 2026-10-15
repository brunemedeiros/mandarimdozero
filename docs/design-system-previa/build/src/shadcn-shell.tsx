import * as React from "react"
import { NAV } from "./gamecommon"
export const Shell=({active,children}:{active:number,children:any})=>(
  <div className="app"><aside className="side bg-card border-r">
    <div className="px-3 pb-4 pt-1 text-lg font-extrabold">Idiomas com Prof. Brune</div>
    {NAV.map((n,i)=>(<a key={n} href="#" className={"rounded-md px-3 py-2 text-sm font-bold no-underline "+(i===active?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-accent")}>{n}</a>))}
    <div className="mt-auto p-3 text-sm text-muted-foreground">Brune · conta admin</div></aside>
  <main className="main">{children}</main></div>)
