import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend, ComposedChart, Line,
  PieChart, Pie
} from "recharts";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── CONFIG ───
const DEFAULT_API = "/api";  // Proxy configured in vite.config.ts → http://127.0.0.1:8080
const COLORS_10 = ["#ef4444","#f97316","#f59e0b","#22c55e","#14b8a6","#3b82f6","#8b5cf6","#ec4899","#06b6d4","#84cc16"];

// ─── THEME SYSTEM ───
const themes = {
  dark: {
    bg: "#0f0f0f",
    bgSecondary: "#1a1a1a",
    bgTertiary: "#141414",
    border: "#262626",
    borderHover: "#404040",
    text: "#e5e5e5",
    textSecondary: "#a3a3a3",
    textMuted: "#525252",
    textDim: "#666",
    cardBg: "#1a1a1a",
    inputBg: "#1a1a1a",
    tooltipBg: "#1e1e1e",
    gridStroke: "#222",
    chartStroke: "#333",
    codeBg: "#141414",
    codeText: "#7dd3fc",
    userBubble: "#2563eb",
    aiBubble: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
    error: "#ef4444",
    success: "#22c55e",
    accent: "#3b82f6",
  },
  light: {
    bg: "#ffffff",
    bgSecondary: "#f5f5f5",
    bgTertiary: "#fafafa",
    border: "#e5e5e5",
    borderHover: "#d4d4d4",
    text: "#171717",
    textSecondary: "#525252",
    textMuted: "#a3a3a3",
    textDim: "#737373",
    cardBg: "#ffffff",
    inputBg: "#f5f5f5",
    tooltipBg: "#ffffff",
    gridStroke: "#e5e5e5",
    chartStroke: "#d4d4d4",
    codeBg: "#f5f5f5",
    codeText: "#0369a1",
    userBubble: "#2563eb",
    aiBubble: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
    error: "#dc2626",
    success: "#16a34a",
    accent: "#2563eb",
  }
};

// Hook to detect and watch system theme
const useSystemTheme = () => {
  const [theme, setTheme] = useState<'dark'|'light'>(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? 'light' : 'dark');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return themes[theme];
};

// Convertir hex a RGB
const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16)
  ];
};

// Generar paleta con degradado (color base → más claro)
const generatePalette = (baseColor: string, count = 10): string[] => {
  if (!baseColor) return COLORS_10;
  try {
    const [r, g, b] = hexToRgb(baseColor);
    return Array.from({ length: count }, (_, i) => {
      // Mezclar con blanco progresivamente (0% → 60%)
      const mix = i * 0.07;
      const nr = Math.round(r + (255 - r) * mix);
      const ng = Math.round(g + (255 - g) * mix);
      const nb = Math.round(b + (255 - b) * mix);
      return `rgb(${nr},${ng},${nb})`;
    });
  } catch {
    return COLORS_10;
  }
};

// ─── UTILS ───
const fmt = d => { try { return new Date(d).toLocaleDateString("es-CO",{month:"short",day:"numeric"}) } catch { return String(d) }};
const fmtFull = d => { try { return new Date(d).toLocaleDateString("es-CO",{weekday:"short",day:"numeric",month:"short"}) } catch { return String(d) }};
const numFmt = n => Number(n).toLocaleString("es-CO");
const shortK = n => { const v=Number(n); return v>=1e6?`${(v/1e6).toFixed(1)}M`:v>=1000?`${(v/1000).toFixed(v>=10000?0:1)}k`:String(v) };
const truncate = (s,m=45) => s&&s.length>m ? s.slice(0,m)+"…" : s;
const isDateStr = v => typeof v==="string" && /^\d{4}-\d{2}-\d{2}/.test(v);

// ─── MARKDOWN COMPONENTS (theme-aware) ───
const createMdComponents = (t: typeof themes.dark) => ({
  h2: ({children}) => <h2 style={{fontSize:16,fontWeight:700,color:t.text,margin:"16px 0 8px"}}>{children}</h2>,
  h3: ({children}) => <h3 style={{fontSize:14,fontWeight:600,color:t.text,margin:"12px 0 6px"}}>{children}</h3>,
  p: ({children}) => <p style={{margin:"8px 0",lineHeight:1.6}}>{children}</p>,
  strong: ({children}) => <strong style={{color:t.text,fontWeight:600}}>{children}</strong>,
  table: ({children}) => <table style={{width:"100%",borderCollapse:"collapse",margin:"12px 0",fontSize:13}}>{children}</table>,
  thead: ({children}) => <thead style={{borderBottom:`1px solid ${t.border}`}}>{children}</thead>,
  th: ({children}) => <th style={{padding:"8px 12px",textAlign:"left",color:t.textSecondary,fontWeight:600,fontSize:11,textTransform:"uppercase"}}>{children}</th>,
  td: ({children}) => <td style={{padding:"8px 12px",borderBottom:`1px solid ${t.border}`,color:t.textSecondary}}>{children}</td>,
  blockquote: ({children}) => <blockquote style={{borderLeft:`3px solid ${t.accent}`,margin:"12px 0",padding:"8px 16px",background:`${t.accent}10`,borderRadius:"0 8px 8px 0"}}>{children}</blockquote>,
  hr: () => <hr style={{border:"none",borderTop:`1px solid ${t.border}`,margin:"16px 0"}}/>,
  ul: ({children}) => <ul style={{margin:"8px 0",paddingLeft:20}}>{children}</ul>,
  li: ({children}) => <li style={{margin:"4px 0"}}>{children}</li>,
  code: ({children}) => <code style={{background:t.codeBg,color:t.codeText,padding:"2px 6px",borderRadius:4,fontSize:12}}>{children}</code>,
});

// ─── TOOLTIP (theme-aware) ───
const GenericTooltip = ({active,payload,label,theme:t}:{active?:boolean,payload?:any[],label?:any,theme?:typeof themes.dark}) => {
  if(!active||!payload?.length) return null;
  const th = t || themes.dark;
  return (
    <div style={{background:th.tooltipBg,border:`1px solid ${th.border}`,borderRadius:10,padding:"12px 16px",maxWidth:320}}>
      <div style={{fontSize:12,color:th.textSecondary,marginBottom:6,fontWeight:600}}>{isDateStr(label)?fmtFull(label):String(label)}</div>
      {payload.filter(p=>p.value!=null&&p.value!==0).sort((a,b)=>(b.value||0)-(a.value||0)).map((p,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
          <div style={{width:8,height:8,borderRadius:2,background:p.color||p.fill||th.accent,flexShrink:0}}/>
          <span style={{color:th.textSecondary,fontSize:11,flex:1}}>{truncate(p.name||p.dataKey,40)}</span>
          <span style={{color:th.text,fontSize:12,fontWeight:700}}>{numFmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── CHARTS ───
function RenderLineChart({data,config,theme:t}) {
  const sorted = [...data].sort((a,b)=>String(a[config.category_key]).localeCompare(String(b[config.category_key])));
  const color = config.color || t.accent;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={sorted} margin={{top:8,right:12,left:-10,bottom:0}}>
        <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.25}/><stop offset="100%" stopColor={color} stopOpacity={0}/></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke}/>
        <XAxis dataKey={config.category_key} tickFormatter={v=>isDateStr(v)?fmt(v):truncate(String(v),10)} stroke={t.chartStroke} tick={{fill:t.textDim,fontSize:10}} interval={Math.max(0,Math.floor(sorted.length/8)-1)}/>
        <YAxis stroke={t.chartStroke} tick={{fill:t.textMuted,fontSize:11}} tickFormatter={shortK}/>
        <Tooltip content={<GenericTooltip theme={t}/>}/>
        <Area type="monotone" dataKey={config.data_key} stroke={color} strokeWidth={2.5} fill="url(#lg)"
          dot={{r:sorted.length<15?4:2,fill:color,stroke:t.bgSecondary,strokeWidth:2}}
          activeDot={{r:6,fill:t.text,stroke:color,strokeWidth:2.5}}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}

function RenderBarChart({data,config,theme:t}) {
  const sorted = [...data].sort((a,b)=>Number(b[config.data_key])-Number(a[config.data_key]));
  const isLong = sorted.some(d=>String(d[config.category_key]).length>20);
  const barColor = config.color || t.accent; // Un solo color para TODAS las barras
  if(isLong) {
    return (
      <ResponsiveContainer width="100%" height={Math.max(200,sorted.length*34)}>
        <BarChart data={sorted} layout="vertical" margin={{top:0,right:40,left:10,bottom:0}} barSize={20}>
          <XAxis type="number" stroke={t.chartStroke} tick={{fill:t.textMuted,fontSize:11}} tickFormatter={shortK}/>
          <YAxis dataKey={config.category_key} type="category" width={200} stroke="transparent"
            tick={({x,y,payload})=>(<g transform={`translate(${x},${y})`}><text x={-5} y={0} dy={4} textAnchor="end" fill={t.textSecondary} fontSize={10}>{truncate(payload.value,42)}</text></g>)}/>
          <Tooltip content={<GenericTooltip theme={t}/>} cursor={{fill:"rgba(255,255,255,0.02)"}}/>
          <Bar dataKey={config.data_key} radius={[0,6,6,0]} fill={barColor}
            label={({x,y,width,value})=>(<text x={x+width+6} y={y+13} fill={t.textSecondary} fontSize={11} fontWeight={600}>{shortK(value)}</text>)}/>
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={sorted} margin={{top:8,right:8,left:-10,bottom:0}} barSize={Math.min(40,Math.max(12,400/sorted.length))}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke}/>
        <XAxis dataKey={config.category_key} stroke={t.chartStroke} tick={{fill:t.textDim,fontSize:10}} tickFormatter={v=>isDateStr(v)?fmt(v):truncate(String(v),12)}/>
        <YAxis stroke={t.chartStroke} tick={{fill:t.textMuted,fontSize:11}} tickFormatter={shortK}/>
        <Tooltip content={<GenericTooltip theme={t}/>} cursor={{fill:"rgba(255,255,255,0.02)"}}/>
        <Bar dataKey={config.data_key} radius={[4,4,0,0]} fill={barColor}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

function RenderGroupedBarChart({data,config,theme:t}) {
  const seriesValues = [...new Set(data.map(d=>d[config.series_key]))].sort();
  const categories = [...new Set(data.map(d=>d[config.category_key]))];
  const isDateSeries = seriesValues.some(v=>isDateStr(String(v)));
  const pivotKey = isDateSeries ? config.series_key : config.category_key;
  const groupKey = isDateSeries ? config.category_key : config.series_key;
  const pivotValues = isDateSeries ? [...new Set(data.map(d=>d[pivotKey]))].sort() : categories;
  const groups = [...new Set(data.map(d=>d[groupKey]))];
  const chartData = pivotValues.map(pv=>{
    const row={_pivot:pv};
    groups.forEach(g=>{ const m=data.find(d=>d[pivotKey]===pv&&d[groupKey]===g); row[g]=m?Number(m[config.data_key]):0; });
    return row;
  });
  const stacked = groups.length>5;
  const palette = config.color ? generatePalette(config.color) : COLORS_10;
  return (<>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{top:8,right:8,left:-10,bottom:0}} barCategoryGap="18%" barGap={stacked?0:2}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke}/>
        <XAxis dataKey="_pivot" stroke={t.chartStroke} tick={{fill:t.textDim,fontSize:10}} tickFormatter={v=>isDateStr(String(v))?fmt(v):truncate(String(v),10)}/>
        <YAxis stroke={t.chartStroke} tick={{fill:t.textMuted,fontSize:11}} tickFormatter={shortK}/>
        <Tooltip content={<GenericTooltip theme={t}/>} cursor={{fill:"rgba(255,255,255,0.02)"}}/>
        {groups.map((g,i)=>(<Bar key={g} dataKey={g} fill={palette[i%palette.length]} radius={stacked?0:[3,3,0,0]} stackId={stacked?"s":undefined} maxBarSize={stacked?50:35}/>))}
      </BarChart>
    </ResponsiveContainer>
    <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:10,marginTop:8,paddingBottom:4}}>
      {groups.map((g,i)=>(<div key={g} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:t.textDim}}><div style={{width:8,height:8,borderRadius:2,background:palette[i%palette.length]}}/>{truncate(g,30)}</div>))}
    </div>
  </>);
}

// Paleta variada para pie chart (distinguible, sobria)
const PIE_COLORS = ['#334155','#475569','#64748b','#94a3b8','#cbd5e1','#166534','#dc2626','#1e40af','#7c3aed','#0891b2'];

function RenderPieChart({data,config,theme:t}) {
  const total=data.reduce((s,d)=>s+Number(d[config.data_key]),0);
  return (
    <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap",justifyContent:"center"}}>
      <div style={{position:"relative",width:200,height:200}}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey={config.data_key} nameKey={config.category_key} stroke={t.bg} strokeWidth={2}>
            {data.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
          </Pie><Tooltip content={<GenericTooltip theme={t}/>}/></PieChart>
        </ResponsiveContainer>
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:800,color:t.text}}>{shortK(total)}</div>
          <div style={{fontSize:10,color:t.textMuted}}>total</div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:3,flex:"1 1 180px"}}>
        {data.slice(0,12).map((d,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:11}}>
            <div style={{width:8,height:8,borderRadius:2,background:PIE_COLORS[i%PIE_COLORS.length],flexShrink:0}}/>
            <span style={{color:t.textSecondary,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{truncate(String(d[config.category_key]),45)}</span>
            <span style={{color:t.text,fontWeight:700,flexShrink:0}}>{((Number(d[config.data_key])/total)*100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── METRIC CARD ───
function RenderMetricCard({data,config,theme:t}) {
  const value = data[0]?.[config.data_key] || 0;
  return (
    <div style={{textAlign:"center",padding:"30px 20px"}}>
      <div style={{fontSize:48,fontWeight:800,color:config.color||t.accent}}>{numFmt(value)}</div>
      <div style={{fontSize:14,color:t.textDim,marginTop:8}}>{config.title}</div>
    </div>
  );
}

// ─── TEXT ONLY (no chart) ───
function RenderTextOnly() {
  return null; // Answer is shown separately in AIMessage
}

// ─── TABLE (simple data display) ───
function RenderTable({data,config,theme:t}) {
  if(!data?.length) return null;
  const keys = Object.keys(data[0]);
  return (
    <div style={{overflow:"auto",maxHeight:300}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:300}}>
        <thead><tr style={{borderBottom:`1px solid ${t.border}`}}>
          {keys.map(k=><th key={k} style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:t.textMuted,fontWeight:600,textTransform:"uppercase",whiteSpace:"nowrap"}}>{k}</th>)}
        </tr></thead>
        <tbody>{data.slice(0,20).map((row,i)=>(
          <tr key={i} style={{borderBottom:`1px solid ${t.border}`}}>
            {keys.map(k=>{ let v=row[k]; if(isDateStr(String(v))) v=fmtFull(v); else if(!isNaN(v)&&v!=="") v=numFmt(Number(v)); return <td key={k} style={{padding:"8px 12px",fontSize:12,color:t.textSecondary,whiteSpace:"nowrap"}}>{String(v)}</td> })}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

// ─── COMPARISON (two metrics side by side) ───
function RenderComparison({data,config,theme:t}) {
  if(!data?.length) return null;
  const items = data.slice(0,2);
  const palette = config.color ? generatePalette(config.color) : COLORS_10;
  return (
    <div style={{display:"flex",gap:20,justifyContent:"center",padding:"20px 0"}}>
      {items.map((d,i)=>(
        <div key={i} style={{textAlign:"center",flex:1,maxWidth:200}}>
          <div style={{fontSize:36,fontWeight:800,color:palette[i]}}>{numFmt(d[config.data_key]||0)}</div>
          <div style={{fontSize:12,color:t.textDim,marginTop:6}}>{d[config.category_key]||`Item ${i+1}`}</div>
        </div>
      ))}
    </div>
  );
}

// ─── CHART DISPATCHER ───
function ChartRenderer({renderCfg,data,theme:t}) {
  if(!renderCfg) return null;
  const {type,config}=renderCfg;
  // Some types don't need data
  if(type==="text_only") return null;
  if(!data?.length && type!=="metric_card") return null;

  const C = {
    line_chart:RenderLineChart,
    bar_chart:RenderBarChart,
    grouped_bar_chart:RenderGroupedBarChart,
    stacked_bar_chart:RenderGroupedBarChart, // Reuse with stacking
    pie_chart:RenderPieChart,
    metric_card:RenderMetricCard,
    table:RenderTable,
    comparison:RenderComparison,
    text_only:RenderTextOnly,
  }[type];

  return (
    <div style={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:12,padding:"20px 12px 8px"}}>
      {config.title && <div style={{fontSize:11,color:t.textMuted,fontWeight:600,letterSpacing:0.5,textTransform:"uppercase",padding:"0 4px 10px"}}>{config.title}</div>}
      {C ? <C data={data} config={config} theme={t}/> : <div style={{color:t.textDim,fontSize:13,padding:20}}>Chart type "{type}" no soportado aún.</div>}
    </div>
  );
}

// ─── DATA TABLE ───
function DataTable({data,theme:t}) {
  const [show,setShow]=useState(false);
  if(!data?.length) return null;
  const keys=Object.keys(data[0]);
  const btnStyle = {background:"none",border:`1px solid ${t.border}`,borderRadius:8,padding:"7px 14px",fontSize:12,color:t.textMuted,cursor:"pointer",display:"flex",alignItems:"center",gap:6};
  return (
    <div style={{marginTop:10}}>
      <button onClick={()=>setShow(!show)} style={btnStyle}>
        <span style={{fontSize:10,transform:show?"rotate(90deg)":"rotate(0)",display:"inline-block",transition:"transform 0.15s"}}>▶</span>
        📋 Datos ({data.length} registros)
      </button>
      {show&&(
        <div style={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:12,overflow:"auto",marginTop:6,maxHeight:360}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:400}}>
            <thead><tr style={{borderBottom:`1px solid ${t.border}`}}>
              {keys.map(k=><th key={k} style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:t.textMuted,fontWeight:600,textTransform:"uppercase",whiteSpace:"nowrap",position:"sticky",top:0,background:t.cardBg}}>{k}</th>)}
            </tr></thead>
            <tbody>{data.slice(0,30).map((row,i)=>(
              <tr key={i} style={{borderBottom:`1px solid ${t.border}`}} onMouseEnter={e=>e.currentTarget.style.background=t.bgTertiary} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                {keys.map(k=>{ let v=row[k]; if(isDateStr(String(v))) v=fmtFull(v); else if(!isNaN(v)&&v!=="") v=numFmt(Number(v)); return <td key={k} style={{padding:"8px 12px",fontSize:12,color:t.textSecondary,whiteSpace:"nowrap"}}>{String(v)}</td> })}
              </tr>
            ))}</tbody>
          </table>
          {data.length>30&&<div style={{padding:8,textAlign:"center",fontSize:11,color:t.textMuted}}>Mostrando 30 de {data.length}</div>}
        </div>
      )}
    </div>
  );
}

// ─── AI MESSAGE ───
function AIMessage({msg,theme:t}) {
  const [showSQL,setShowSQL]=useState(false);
  const res=msg.data;
  const dk=res.render?.config?.data_key;
  const total=dk&&res.data?res.data.reduce((s,d)=>s+Number(d[dk]||0),0):0;
  const isTextOnly = res.render?.type === "text_only" || (!res.data?.length && !res.sql);
  const mdComponents = useMemo(() => createMdComponents(t), [t]);
  const btnStyle = {background:"none",border:`1px solid ${t.border}`,borderRadius:8,padding:"7px 14px",fontSize:12,color:t.textMuted,cursor:"pointer",display:"flex",alignItems:"center",gap:6};

  return (
    <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
      <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,background:t.aiBubble,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff",marginTop:2}}>AI</div>
      <div style={{flex:1,minWidth:0}}>
        {!isTextOnly && (
          <p style={{color:t.textSecondary,fontSize:14,margin:"0 0 14px",lineHeight:1.6}}>
            {res.result_count!=null&&<><strong style={{color:t.text}}>{res.result_count}</strong> registros</>}
            {total>0&&<> · Total: <strong style={{color:t.text}}>{numFmt(total)}</strong></>}
            {res.execution_time_ms&&<> · <span style={{color:t.textMuted}}>{numFmt(res.execution_time_ms)}ms</span></>}
            {res.cached&&<span style={{marginLeft:8,fontSize:11,background:`${t.success}15`,color:t.success,padding:"2px 8px",borderRadius:10}}>⚡ cache</span>}
          </p>
        )}
        {/* Mostrar respuesta de texto con markdown */}
        {res.answer && (
          <div style={{color:t.textSecondary,fontSize:14,lineHeight:1.7,marginBottom:14}} className="md-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{res.answer}</ReactMarkdown>
          </div>
        )}
        {res.render&&res.data?.length>0&&<div style={{marginBottom:14}}><ChartRenderer renderCfg={res.render} data={res.data} theme={t}/></div>}
        <DataTable data={res.data} theme={t}/>
        {res.sql&&(
          <div style={{marginTop:8}}>
            <button onClick={()=>setShowSQL(!showSQL)} style={btnStyle}>
              <span style={{fontSize:10,transform:showSQL?"rotate(90deg)":"rotate(0)",display:"inline-block",transition:"transform 0.15s"}}>▶</span>
              SQL · {res.execution_time_ms}ms
            </button>
            {showSQL&&<pre style={{background:t.codeBg,border:`1px solid ${t.border}`,borderRadius:8,padding:14,marginTop:6,fontSize:12,color:t.codeText,lineHeight:1.6,overflow:"auto",whiteSpace:"pre-wrap"}}>{res.sql}</pre>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HISTORY MESSAGE (rendered simpler) ───
function HistoryItem({item,onClick,theme:t}) {
  return (
    <button onClick={onClick} style={{
      background:t.bgTertiary,border:`1px solid ${t.border}`,borderRadius:10,padding:"10px 14px",
      cursor:"pointer",textAlign:"left",width:"100%",transition:"all 0.15s",display:"block",
    }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=t.borderHover;e.currentTarget.style.background=t.cardBg}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.background=t.bgTertiary}}>
      <div style={{fontSize:13,color:t.text,fontWeight:600,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.question || item.data?.question}</div>
      <div style={{fontSize:11,color:t.textMuted}}>{item.timestamp ? new Date(item.timestamp).toLocaleString("es-CO") : ""}</div>
    </button>
  );
}

// ─── MAIN APP ───
export default function App() {
  const t = useSystemTheme();
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [apiUrl,setApiUrl]=useState(DEFAULT_API);
  const [userId,setUserId]=useState("carlos-test");
  const [showSettings,setShowSettings]=useState(false);
  const [showHistory,setShowHistory]=useState(false);
  const [history,setHistory]=useState([]);
  const [suggestions,setSuggestions]=useState([]);
  const [health,setHealth]=useState(null); // null=unknown, true=ok, false=down
  const [error,setError]=useState(null);
  const bottomRef=useRef(null);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"})},[messages,loading]);

  // ─── API helpers ───
  const api = useCallback((path,opts={})=>{
    const url=`${apiUrl.replace(/\/$/,"")}${path}`;
    return fetch(url,{...opts,headers:{"Content-Type":"application/json","X-User-ID":userId,...(opts.headers||{})}});
  },[apiUrl,userId]);

  // Health check
  const checkHealth = useCallback(async()=>{
    try { const r=await api("/health"); setHealth(r.ok); } catch { setHealth(false) }
  },[api]);

  // Load suggestions - backend returns {success, data: [{category, questions}]}
  const loadSuggestions = useCallback(async()=>{
    try {
      const r=await api("/suggestions");
      const j=await r.json();
      const raw = j.data || j.suggestions || j;
      if(Array.isArray(raw)) {
        // Flatten {category, questions} structure
        const flat = raw.flatMap(c =>
          c.questions ? c.questions.map(q => ({text: q, category: c.category})) : [c]
        );
        setSuggestions(flat);
      }
    } catch {}
  },[api]);

  // Load history - backend returns {success, data: [{question, answer, created_at}]}
  const loadHistory = useCallback(async()=>{
    try {
      const r=await api("/history");
      const j=await r.json();
      const raw = j.data || j.history || j;
      if(Array.isArray(raw)) {
        // Map created_at → timestamp for compatibility
        setHistory(raw.map(h => ({...h, timestamp: h.created_at || h.timestamp})));
      }
    } catch {}
  },[api]);

  // Boot
  useEffect(()=>{checkHealth();loadSuggestions()},[]);

  // Ask
  const sendMessage = useCallback(async()=>{
    const q=input.trim();
    if(!q||loading) return;
    setInput("");setError(null);
    setMessages(prev=>[...prev,{role:"user",text:q}]);
    setLoading(true);
    try {
      const r=await api("/ask",{method:"POST",body:JSON.stringify({question:q})});
      const j=await r.json();
      if(j.success&&j.data) setMessages(prev=>[...prev,{role:"ai",data:j.data}]);
      else {
        // Support both string error and {error: {code, message}} structure
        const errMsg = typeof j.error === 'object' ? j.error.message : (j.error||j.message||"Respuesta inesperada");
        setError(errMsg);
        setMessages(prev=>[...prev,{role:"error",text:errMsg}]);
      }
    } catch(err) {
      setError(err.message);
      setMessages(prev=>[...prev,{role:"error",text:`Conexión fallida: ${err.message}\n\nVerifica que kubectl port-forward esté activo.`}]);
    } finally { setLoading(false) }
  },[input,loading,api]);

  const handleKey = e => {if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage()}};

  const quickAsk = q => { setInput(q); setTimeout(()=>{setInput(prev=>{if(prev===q){/* trigger */} return prev})},50) };

  // ─── Status dot ───
  const statusColor = health===true?t.success:health===false?t.error:t.textMuted;
  const statusText = health===true?"Conectado":health===false?"Desconectado":"Desconocido";
  const headerBtnStyle = {background:t.bgSecondary,border:`1px solid ${t.border}`,borderRadius:8,padding:"6px 12px",fontSize:12,color:t.textDim,cursor:"pointer"};

  return (
    <div style={{minHeight:"100vh",background:t.bg,fontFamily:"'Inter',-apple-system,system-ui,sans-serif",color:t.text,display:"flex",flexDirection:"column"}}>

      {/* ─── HEADER ─── */}
      <div style={{borderBottom:`1px solid ${t.bgSecondary}`,padding:"10px 20px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{width:30,height:30,borderRadius:8,background:t.aiBubble,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🚦</div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:700,color:t.text,display:"flex",alignItems:"center",gap:8}}>
            Transit AI
            <div style={{width:7,height:7,borderRadius:"50%",background:statusColor,boxShadow:health===true?`0 0 6px ${statusColor}`:undefined}}/>
            <span style={{fontSize:10,color:t.textMuted,fontWeight:400}}>{statusText}</span>
          </div>
          <div style={{fontSize:11,color:t.textMuted}}>{apiUrl} · User: {userId}</div>
        </div>
        <button onClick={()=>{loadHistory();setShowHistory(!showHistory)}} style={headerBtnStyle}>
          📜 Historial
        </button>
        <button onClick={()=>setShowSettings(!showSettings)} style={headerBtnStyle}>
          ⚙️
        </button>
        {messages.length>0&&<button onClick={()=>{setMessages([]);setError(null)}} style={headerBtnStyle}>🗑️</button>}
      </div>

      {/* ─── SETTINGS ─── */}
      {showSettings&&(
        <div style={{background:t.bgTertiary,borderBottom:`1px solid ${t.bgSecondary}`,padding:"14px 20px"}}>
          <div style={{maxWidth:760,margin:"0 auto",display:"flex",gap:12,flexWrap:"wrap",alignItems:"end"}}>
            <div style={{flex:"1 1 250px"}}>
              <label style={{fontSize:11,color:t.textMuted,display:"block",marginBottom:4}}>API Base URL</label>
              <input value={apiUrl} onChange={e=>setApiUrl(e.target.value)} style={{width:"100%",background:t.inputBg,border:`1px solid ${t.border}`,borderRadius:8,padding:"8px 12px",color:t.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{flex:"0 1 180px"}}>
              <label style={{fontSize:11,color:t.textMuted,display:"block",marginBottom:4}}>X-User-ID</label>
              <input value={userId} onChange={e=>setUserId(e.target.value)} style={{width:"100%",background:t.inputBg,border:`1px solid ${t.border}`,borderRadius:8,padding:"8px 12px",color:t.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <button onClick={()=>{checkHealth();loadSuggestions();setShowSettings(false)}} style={{background:t.accent,border:"none",borderRadius:8,padding:"8px 16px",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>
              Reconectar
            </button>
            <div style={{fontSize:11,color:t.textMuted,width:"100%"}}>
              Endpoints: GET /health · POST /ask · GET /suggestions · GET /history
            </div>
          </div>
        </div>
      )}

      {/* ─── HISTORY PANEL ─── */}
      {showHistory&&(
        <div style={{background:t.bgTertiary,borderBottom:`1px solid ${t.bgSecondary}`,padding:"14px 20px",maxHeight:300,overflow:"auto"}}>
          <div style={{maxWidth:760,margin:"0 auto"}}>
            <div style={{fontSize:12,color:t.textMuted,fontWeight:600,marginBottom:10}}>📜 Historial de consultas</div>
            {history.length===0?<div style={{fontSize:12,color:t.textMuted,padding:20,textAlign:"center"}}>Sin historial</div>:
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {history.slice(0,20).map((h,i)=>(
                  <HistoryItem key={i} item={h} theme={t} onClick={()=>{setInput(h.question||h.data?.question||"");setShowHistory(false)}}/>
                ))}
              </div>
            }
          </div>
        </div>
      )}

      {/* ─── MESSAGES ─── */}
      <div style={{flex:1,overflow:"auto",padding:"24px 20px"}}>
        <div style={{maxWidth:760,margin:"0 auto"}}>

          {/* Empty state */}
          {messages.length===0&&(
            <div style={{textAlign:"center",padding:"60px 20px"}}>
              <div style={{fontSize:44,marginBottom:16}}>🚦</div>
              <h2 style={{fontSize:20,fontWeight:700,color:t.text,margin:"0 0 6px"}}>Transit AI Assistant</h2>
              <p style={{color:t.textMuted,fontSize:14,margin:"0 0 28px"}}>
                Pregunta en lenguaje natural sobre comparendos, cámaras, rechazos, costos RUNT y más.
              </p>

              {health===false&&(
                <div style={{background:`${t.error}12`,border:`1px solid ${t.error}30`,borderRadius:12,padding:"14px 18px",marginBottom:24,maxWidth:500,marginLeft:"auto",marginRight:"auto"}}>
                  <div style={{fontSize:13,color:t.error,fontWeight:600,marginBottom:4}}>⚠️ API no disponible</div>
                  <div style={{fontSize:12,color:t.textSecondary,lineHeight:1.5}}>
                    No se pudo conectar a <strong>{apiUrl}/health</strong>.<br/>
                    Verifica que <code style={{color:t.codeText}}>kubectl port-forward</code> esté activo en puerto 8080.
                  </div>
                  <button onClick={checkHealth} style={{marginTop:10,background:t.border,border:"none",borderRadius:6,padding:"6px 14px",color:t.textSecondary,fontSize:12,cursor:"pointer"}}>🔄 Reintentar</button>
                </div>
              )}

              {suggestions.length>0 ? (
                // Group suggestions by category
                <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:700,margin:"0 auto",textAlign:"left"}}>
                  {Object.entries(suggestions.reduce((acc,s)=>{
                    const cat = s.category || "General";
                    if(!acc[cat]) acc[cat]=[];
                    acc[cat].push(s);
                    return acc;
                  },{} as Record<string,any[]>)).map(([cat,items])=>(
                    <div key={cat}>
                      <div style={{fontSize:11,color:t.textMuted,fontWeight:600,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>{cat}</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                        {items.slice(0,4).map((q,i)=>(
                          <button key={i} onClick={()=>setInput(q.text||q)} style={{
                            background:t.bgSecondary,border:`1px solid ${t.border}`,borderRadius:8,padding:"8px 14px",
                            color:t.textSecondary,fontSize:12,cursor:"pointer",transition:"all 0.15s",textAlign:"left",
                          }}
                            onMouseEnter={e=>{e.currentTarget.style.borderColor=t.borderHover;e.currentTarget.style.color=t.text}}
                            onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.color=t.textSecondary}}>
                            {q.text||q}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Fallback suggestions
                <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
                  {["Tendencia de comparendos esta semana","Top 10 causales de rechazo","Pendientes por tipo de vehículo","¿Cuál es la tendencia de costos en RUNT?"].map((q,i)=>(
                    <button key={i} onClick={()=>setInput(q)} style={{
                      background:t.bgSecondary,border:`1px solid ${t.border}`,borderRadius:10,padding:"10px 16px",
                      color:t.textSecondary,fontSize:13,cursor:"pointer",transition:"all 0.15s",textAlign:"left",maxWidth:300,
                    }}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=t.borderHover;e.currentTarget.style.color=t.text}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.color=t.textSecondary}}>
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Message list */}
          {messages.map((msg,i)=>(
            <div key={i} style={{marginBottom:24}}>
              {msg.role==="user"&&(
                <div style={{display:"flex",justifyContent:"flex-end"}}>
                  <div style={{background:t.userBubble,borderRadius:"20px 20px 4px 20px",padding:"12px 18px",maxWidth:"80%",fontSize:15,color:"#fff",lineHeight:1.5}}>{msg.text}</div>
                </div>
              )}
              {msg.role==="ai"&&<AIMessage msg={msg} theme={t}/>}
              {msg.role==="error"&&(
                <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,background:`${t.error}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>⚠️</div>
                  <div style={{background:`${t.error}10`,border:`1px solid ${t.error}25`,borderRadius:12,padding:"12px 16px",flex:1}}>
                    <div style={{fontSize:13,color:t.error,fontWeight:600,marginBottom:4}}>Error de conexión</div>
                    <div style={{fontSize:13,color:t.textSecondary,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{msg.text}</div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading */}
          {loading&&(
            <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:24}}>
              <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,background:t.aiBubble,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff"}}>AI</div>
              <div style={{display:"flex",gap:4,padding:"16px 0"}}>
                {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:t.textMuted,animation:`dot 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}
                <style>{`@keyframes dot{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1.1)}}`}</style>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
      </div>

      {/* ─── INPUT ─── */}
      <div style={{borderTop:`1px solid ${t.bgSecondary}`,padding:"14px 20px",flexShrink:0}}>
        <div style={{maxWidth:760,margin:"0 auto",display:"flex",gap:10,alignItems:"flex-end"}}>
          <div style={{flex:1,background:t.inputBg,border:`1px solid ${t.border}`,borderRadius:14,padding:"4px 4px 4px 16px",display:"flex",alignItems:"center",gap:8}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Haz una pregunta sobre tránsito..." disabled={loading}
              style={{flex:1,background:"transparent",border:"none",outline:"none",color:t.text,fontSize:14,padding:"10px 0"}}/>
            <button onClick={sendMessage} disabled={loading||!input.trim()} style={{
              width:36,height:36,borderRadius:10,border:"none",
              cursor:loading||!input.trim()?"default":"pointer",
              background:input.trim()&&!loading?t.accent:t.border,
              color:input.trim()&&!loading?"#fff":t.textMuted,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,transition:"all 0.15s",
            }}>↑</button>
          </div>
        </div>
      </div>
    </div>
  );
}
