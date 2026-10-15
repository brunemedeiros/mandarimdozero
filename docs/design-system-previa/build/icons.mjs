import React from "react"; import {renderToStaticMarkup} from "react-dom/server"
import * as L from "lucide-react"
const names=["Flame","Star","Target","BookOpen","Trophy","Zap","Check","Lock","MessageCircle","Layers"]
const o={}; for(const n of names){o[n]=renderToStaticMarkup(React.createElement(L[n],{size:20,strokeWidth:2}))}
import fs from "fs"; fs.writeFileSync("icons.json",JSON.stringify(o)); console.log(Object.keys(o).length)
