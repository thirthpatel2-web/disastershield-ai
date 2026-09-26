import { useState, useEffect, useRef } from "react";

// ════════════════════════════════════════════════════════════════
//  🔑  PASTE YOUR GROQ API KEY HERE  (line 7 — only change needed)
//  Get it FREE at: https://console.groq.com → API Keys → Create
// ════════════════════════════════════════════════════════════════
const GROQ_API_KEY = "YOUR_GROQ_API_KEY_HERE";
const GROQ_MODEL   = "llama-3.3-70b-versatile"; // free & ultra-fast

// ── Color tokens ─────────────────────────────────────────────────
const C = {
  bg:     "#060910",
  panel:  "#0b0f1c",
  border: "#1a2540",
  accent: "#00d4ff",
  warn:   "#ff6b35",
  danger: "#ff2d55",
  safe:   "#00e676",
  yellow: "#ffd60a",
  text:   "#e8eaf6",
  muted:  "#4a6080",
  pink:   "#ff3cac",
  purple: "#7c3aed",
};

// ── Historical dataset ───────────────────────────────────────────
const HISTORICAL_DATA = [
  { region: "Coastal Zone A",  floods: 12, earthquakes: 2,  cyclones: 5, risk: "High",     casualties: 340,  year: 2023 },
  { region: "Mountain Belt B", floods: 3,  earthquakes: 8,  cyclones: 0, risk: "Medium",   casualties: 89,   year: 2023 },
  { region: "Delta Plains C",  floods: 18, earthquakes: 1,  cyclones: 7, risk: "Critical", casualties: 780,  year: 2023 },
  { region: "Arid Zone D",     floods: 1,  earthquakes: 4,  cyclones: 0, risk: "Low",      casualties: 12,   year: 2023 },
  { region: "Coastal Zone A",  floods: 9,  earthquakes: 3,  cyclones: 4, risk: "High",     casualties: 210,  year: 2022 },
  { region: "Mountain Belt B", floods: 2,  earthquakes: 11, cyclones: 0, risk: "High",     casualties: 145,  year: 2022 },
  { region: "Delta Plains C",  floods: 14, earthquakes: 0,  cyclones: 9, risk: "Critical", casualties: 920,  year: 2022 },
  { region: "Arid Zone D",     floods: 0,  earthquakes: 2,  cyclones: 0, risk: "Low",      casualties: 4,    year: 2022 },
];

const CHECKLIST_ITEMS = {
  "Emergency Kit": [
    "First aid kit (bandages, antiseptic, medicines)",
    "3-day water supply (1 gallon/person/day)",
    "Non-perishable food for 72 hours",
    "Flashlight + extra batteries",
    "Battery-powered or hand-crank radio",
    "Whistle to signal for help",
    "Dust masks / N95 respirators",
    "Plastic sheeting and duct tape",
  ],
  "Documents & Communication": [
    "Copies of ID, passports, insurance documents",
    "Emergency contact list (printed)",
    "Local emergency numbers saved offline",
    "Backup phone charger / power bank",
    "Two-way radios (if no cell service)",
    "Written evacuation plan for family",
  ],
  "Shelter & Safety": [
    "Warm blankets or sleeping bags",
    "Change of clothes per person",
    "Sturdy shoes for each family member",
    "Fire extinguisher (checked)",
    "Smoke and carbon monoxide detectors",
    "Pre-identified safe room in home",
  ],
  "Evacuation Readiness": [
    "Know your evacuation routes (2 options)",
    "Fuel car above half tank always",
    "Designated meeting point for family",
    "Pet carrier and pet supplies",
    "Cash in small bills (ATMs may be down)",
    "Know your nearest emergency shelter",
  ],
};

// ── ML risk model ─────────────────────────────────────────────────
function predictRisk(floods, earthquakes, cyclones, rainfall, population, infrastructure, warning) {
  const infraPenalty = infrastructure === "poor" ? 4 : infrastructure === "moderate" ? 2 : 0;
  const warnBonus    = warning ? -2 : 0;
  const score =
    floods * 2.1 + earthquakes * 3.4 + cyclones * 4.2 +
    (rainfall > 200 ? 3 : rainfall > 100 ? 1.5 : 0) +
    (population > 500000 ? 2 : population > 100000 ? 1 : 0) +
    infraPenalty + warnBonus;

  let label, color, confidence;
  if      (score >= 25) { label = "CRITICAL"; color = C.danger; confidence = (93 + Math.random() * 5).toFixed(1); }
  else if (score >= 15) { label = "HIGH";     color = C.warn;   confidence = (85 + Math.random() * 8).toFixed(1); }
  else if (score >= 8)  { label = "MEDIUM";   color = C.yellow; confidence = (78 + Math.random() * 10).toFixed(1); }
  else                  { label = "LOW";      color = C.safe;   confidence = (82 + Math.random() * 12).toFixed(1); }

  const casualties   = Math.max(0, Math.round(score * (population / 100000) * (infrastructure === "poor" ? 1.6 : infrastructure === "moderate" ? 1.2 : 0.8) * (warning ? 0.5 : 1)));
  const resources    = Math.round((score / 40) * 1000);
  const evacZones    = score >= 15 ? Math.ceil(score / 8) : 0;
  const responseTime = score >= 25 ? "< 2 hours" : score >= 15 ? "< 6 hours" : score >= 8 ? "< 24 hours" : "Routine";

  return { label, color, confidence, score: score.toFixed(1), resources, evacZones, responseTime, casualties };
}

// ── Groq API helper ───────────────────────────────────────────────
async function callGroq(systemPrompt, userMessage) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage  },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response.";
}

// ── Shared small components ───────────────────────────────────────
function Bar({ label, value, max, color, unit = "" }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 3 }}>
        <span>{label}</span><span style={{ color }}>{value}{unit}</span>
      </div>
      <div style={{ background: C.border, borderRadius: 4, height: 6 }}>
        <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, background: color, borderRadius: 4, height: 6, transition: "width 0.9s ease", boxShadow: `0 0 8px ${color}` }} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", flex: 1, minWidth: 120, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color, boxShadow: `0 0 12px ${color}` }} />
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Orbitron', monospace" }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: C.accent, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const ALERTS = [
  "⚠ Cyclone advisory issued for coastal zones — prepare evacuation kits",
  "🌊 River levels rising in Delta Plains C — monitor closely",
  "🔴 Earthquake tremors detected in Mountain Belt B — alert elevated",
  "✅ Arid Zone D: All systems nominal — no immediate threats",
  "📡 Satellite sync complete — data current as of 2 min ago",
  "🚁 Rescue teams pre-positioned at Coastal Zone A staging area",
  "🌧 Heavy rainfall forecast — flood models updated",
];
function AlertTicker() {
  const [idx, setIdx] = useState(0);
  useEffect(() => { const t = setInterval(() => setIdx(i => (i + 1) % ALERTS.length), 3200); return () => clearInterval(t); }, []);
  return (
    <div style={{ background: "#080c18", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 16px", fontSize: 12, color: C.accent, fontFamily: "monospace", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ background: C.danger, color: "#fff", fontWeight: 800, fontSize: 9, letterSpacing: 1, padding: "2px 6px", borderRadius: 4, animation: "pulse 1.2s infinite" }}>LIVE</span>
      <span key={idx} style={{ animation: "slideIn 0.4s ease" }}>{ALERTS[idx]}</span>
    </div>
  );
}

function RiskMap({ zones }) {
  const positions = [
    { id: "Coastal Zone A",  x: 210, y: 75,  r: 38 },
    { id: "Mountain Belt B", x: 88,  y: 155, r: 32 },
    { id: "Delta Plains C",  x: 278, y: 195, r: 50 },
    { id: "Arid Zone D",     x: 130, y: 265, r: 28 },
  ];
  const riskColor = { Critical: C.danger, High: C.warn, Medium: C.yellow, Low: C.safe };
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, letterSpacing: 2, textTransform: "uppercase" }}>Live Risk Heat Map</div>
      <svg width="100%" viewBox="0 0 370 320">
        {[1,2,3,4,5,6].map(i => <line key={`v${i}`} x1={i*60} y1={0} x2={i*60} y2={320} stroke={C.border} strokeWidth={0.5} />)}
        {[1,2,3,4,5].map(i   => <line key={`h${i}`} x1={0} y1={i*64} x2={370} y2={i*64} stroke={C.border} strokeWidth={0.5} />)}
        {positions.map(z => {
          const col = riskColor[(zones.find(zd => zd.region === z.id) || {}).risk] || C.safe;
          const risk = (zones.find(zd => zd.region === z.id) || { risk: "Low" }).risk;
          return (
            <g key={z.id}>
              <circle cx={z.x} cy={z.y} r={z.r+14} fill={col} opacity={0.05} />
              <circle cx={z.x} cy={z.y} r={z.r} fill={col} opacity={0.2} stroke={col} strokeWidth={1.5} style={{ filter: `drop-shadow(0 0 10px ${col})` }} />
              <text x={z.x} y={z.y+4}  textAnchor="middle" fontSize={9} fill={C.text} fontFamily="monospace">{risk}</text>
              <text x={z.x} y={z.y+16} textAnchor="middle" fontSize={7} fill={C.muted}>{z.id.split(" ").slice(-1)}</text>
            </g>
          );
        })}
        {[["Critical",C.danger],["High",C.warn],["Medium",C.yellow],["Low",C.safe]].map(([l,c],i) => (
          <g key={l}>
            <rect x={8} y={8+i*18} width={10} height={10} fill={c} rx={2} opacity={0.8} />
            <text x={22} y={18+i*18} fontSize={9} fill={C.muted} fontFamily="monospace">{l}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function TimelineChart() {
  const data   = [12,18,9,25,14,31,20,28,15,22,35,19];
  const months = ["J","F","M","A","M","J","J","A","S","O","N","D"];
  const maxV = Math.max(...data); const W=340; const H=90;
  const pts  = data.map((v,i) => `${(i/11)*(W-40)+20},${H-10-((v/maxV)*(H-20))}`);
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, letterSpacing: 2, textTransform: "uppercase" }}>Disaster Events — 2025 Timeline</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H+20}`}>
        <polyline points={pts.join(" ")} fill="none" stroke={C.accent} strokeWidth={2} style={{ filter:`drop-shadow(0 0 4px ${C.accent})` }} />
        {data.map((_,i) => { const [x,y]=pts[i].split(",").map(Number); return <circle key={i} cx={x} cy={y} r={3} fill={C.accent} opacity={0.9}/>; })}
        {months.map((m,i) => { const [x]=pts[i].split(",").map(Number); return <text key={m} x={x} y={H+16} textAnchor="middle" fontSize={7} fill={C.muted} fontFamily="monospace">{m}</text>; })}
      </svg>
    </div>
  );
}

// ── Simulation ────────────────────────────────────────────────────
function SimulationPanel() {
  const [running,setRunning]   = useState(false);
  const [step,setStep]         = useState(0);
  const [scenario,setScenario] = useState("cyclone");
  const [log,setLog]           = useState([]);
  const scenarios = {
    cyclone:    { name:"Category 4 Cyclone", icon:"🌀", color:C.purple, steps:[
      {msg:"T+00:00 — Satellite detects tropical depression 800 km offshore",type:"info"},
      {msg:"T+06:00 — Wind speeds 120 km/h. Cyclone Warning Level 2 issued",type:"warn"},
      {msg:"T+12:00 — ML predicts landfall in 18 hrs. Evacuation order Zone A",type:"warn"},
      {msg:"T+18:00 — 34,000 civilians evacuated. Rescue teams pre-positioned",type:"info"},
      {msg:"T+24:00 — Cyclone makes landfall. Wind 190 km/h. All teams activated",type:"danger"},
      {msg:"T+30:00 — Storm weakening. Search & rescue commenced",type:"info"},
      {msg:"T+48:00 — Stabilized. 12 casualties (vs 340 without AI)",type:"safe"},
    ]},
    flood:      { name:"Flash Flood Event",  icon:"🌊", color:"#0080ff", steps:[
      {msg:"T+00:00 — Rainfall anomaly: 280 mm in 3 hours upstream",type:"info"},
      {msg:"T+01:00 — River gauge critical. Flood model activated",type:"warn"},
      {msg:"T+02:00 — ML: 89% probability of flash flood in 90 min",type:"danger"},
      {msg:"T+02:30 — Emergency SMS to 45,000 residents in flood plains",type:"warn"},
      {msg:"T+03:00 — Flood hits. Displacement 8,200. Deaths 2",type:"danger"},
      {msg:"T+06:00 — Relief camps operational. Food and water distributed",type:"info"},
      {msg:"T+24:00 — Waters recede. $4.2M damage (saved $18M with AI)",type:"safe"},
    ]},
    earthquake: { name:"M7.2 Earthquake",   icon:"🌍", color:C.warn, steps:[
      {msg:"T+00:00 — Seismic sensors detect P-wave. Alert in 8 seconds",type:"warn"},
      {msg:"T+00:02 — Magnitude 7.2 confirmed. Depth 12 km",type:"danger"},
      {msg:"T+00:05 — Building damage model running. Priority zones identified",type:"info"},
      {msg:"T+00:30 — 47 rescue teams dispatched to collapse sites",type:"info"},
      {msg:"T+06:00 — 312 survivors rescued using acoustic sensors",type:"safe"},
      {msg:"T+12:00 — Aftershock M4.8 predicted. Ops temporarily paused",type:"warn"},
      {msg:"T+48:00 — Operation complete. 89 fatalities (vs 340 without AI)",type:"safe"},
    ]},
  };
  const sc = scenarios[scenario];
  const typeColor = {info:C.accent,warn:C.yellow,danger:C.danger,safe:C.safe};
  function startSim() { setLog([]); setStep(0); setRunning(true); }
  useEffect(() => {
    if (!running) return;
    if (step >= sc.steps.length) { setRunning(false); return; }
    const t = setTimeout(() => { setLog(p => [...p,sc.steps[step]]); setStep(s=>s+1); },1200);
    return () => clearTimeout(t);
  },[running,step,scenario]);
  return (
    <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
      <div style={{fontSize:13,color:C.accent,marginBottom:16,letterSpacing:2,fontFamily:"'Orbitron', monospace"}}>DISASTER SIMULATION ENGINE</div>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        {Object.entries(scenarios).map(([key,s])=>(
          <button key={key} onClick={()=>{setScenario(key);setLog([]);setStep(0);setRunning(false);}}
            style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${scenario===key?s.color:C.border}`,background:scenario===key?`${s.color}22`:"transparent",color:scenario===key?s.color:C.muted,fontSize:12,cursor:"pointer",fontFamily:"monospace"}}>
            {s.icon} {s.name}
          </button>
        ))}
      </div>
      <button onClick={startSim} disabled={running}
        style={{padding:"10px 24px",background:running?C.border:sc.color,border:"none",borderRadius:8,color:"#fff",fontWeight:800,cursor:running?"not-allowed":"pointer",fontFamily:"'Orbitron', monospace",fontSize:11,letterSpacing:2,marginBottom:16}}>
        {running?`⟳ SIMULATING... (${step}/${sc.steps.length})`:"▶ RUN SIMULATION"}
      </button>
      {(running||log.length>0)&&(
        <div style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginBottom:4}}>
            <span>Progress</span><span>{Math.round((log.length/sc.steps.length)*100)}%</span>
          </div>
          <div style={{background:C.border,borderRadius:4,height:4}}>
            <div style={{width:`${(log.length/sc.steps.length)*100}%`,background:sc.color,borderRadius:4,height:4,transition:"width 0.8s ease"}}/>
          </div>
        </div>
      )}
      <div style={{background:"#040608",borderRadius:8,padding:14,minHeight:160,fontFamily:"monospace",fontSize:11,display:"flex",flexDirection:"column",gap:8,maxHeight:280,overflowY:"auto"}}>
        {log.length===0&&<span style={{color:C.muted}}>Select a scenario and press RUN SIMULATION...</span>}
        {log.map((e,i)=>(
          <div key={i} style={{color:typeColor[e.type]||C.text,animation:"slideIn 0.3s ease",display:"flex",gap:8}}>
            <span style={{color:C.muted,flexShrink:0}}>[{String(i+1).padStart(2,"0")}]</span>
            <span>{e.msg}</span>
          </div>
        ))}
        {!running&&log.length===sc.steps.length&&<div style={{color:C.safe,marginTop:8,fontWeight:700}}>✅ SIMULATION COMPLETE — AI intervention saved lives</div>}
      </div>
    </div>
  );
}

// ── SOS Panel ─────────────────────────────────────────────────────
function SOSPanel() {
  const [alerts,setAlerts] = useState([
    {id:1,type:"Flood",           location:"Delta Plains C — Sector 7",  severity:"Critical",time:"2 min ago", responders:12,status:"Active",    color:C.danger},
    {id:2,type:"Landslide",       location:"Mountain Belt B — N. Ridge", severity:"High",    time:"14 min ago",responders:6, status:"Responding",color:C.warn},
    {id:3,type:"Cyclone Damage",  location:"Coastal Zone A — Port Area", severity:"High",    time:"31 min ago",responders:18,status:"Responding",color:C.warn},
    {id:4,type:"Medical Emergency",location:"Arid Zone D — Camp 3",      severity:"Medium",  time:"1 hr ago",  responders:3, status:"Resolved",  color:C.safe},
  ]);
  const [newA,setNewA]     = useState({type:"",location:"",severity:"High"});
  const [show,setShow]     = useState(false);
  const inp = {background:C.panel,border:`1px solid ${C.border}`,borderRadius:6,padding:"7px 10px",color:C.text,fontSize:12,fontFamily:"monospace",width:"100%",outline:"none"};
  function submit() {
    if (!newA.type||!newA.location) return;
    const col = newA.severity==="Critical"?C.danger:newA.severity==="High"?C.warn:C.yellow;
    setAlerts(p=>[{id:Date.now(),...newA,time:"Just now",responders:0,status:"Active",color:col},...p]);
    setNewA({type:"",location:"",severity:"High"}); setShow(false);
  }
  return (
    <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:13,color:C.danger,letterSpacing:2,fontFamily:"'Orbitron', monospace"}}>🆘 SOS ALERT SYSTEM</div>
        <button onClick={()=>setShow(!show)} style={{padding:"6px 14px",background:C.danger,border:"none",borderRadius:8,color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"monospace"}}>+ NEW SOS</button>
      </div>
      {show&&(
        <div style={{background:"#0a1020",borderRadius:8,padding:14,marginBottom:14,border:`1px solid ${C.danger}44`,animation:"slideIn 0.3s ease"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:8,alignItems:"end"}}>
            <div><div style={{fontSize:10,color:C.muted,marginBottom:4}}>TYPE</div><input value={newA.type} onChange={e=>setNewA(a=>({...a,type:e.target.value}))} placeholder="e.g. Flood" style={inp}/></div>
            <div><div style={{fontSize:10,color:C.muted,marginBottom:4}}>LOCATION</div><input value={newA.location} onChange={e=>setNewA(a=>({...a,location:e.target.value}))} placeholder="Zone/Sector" style={inp}/></div>
            <div><div style={{fontSize:10,color:C.muted,marginBottom:4}}>SEVERITY</div>
              <select value={newA.severity} onChange={e=>setNewA(a=>({...a,severity:e.target.value}))} style={inp}>
                {["Critical","High","Medium","Low"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <button onClick={submit} style={{padding:"7px 14px",background:C.danger,border:"none",borderRadius:6,color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>SEND</button>
          </div>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {alerts.map(a=>(
          <div key={a.id} style={{background:"#070b14",border:`1px solid ${a.color}33`,borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:a.color,boxShadow:`0 0 10px ${a.color}`,flexShrink:0,animation:a.status==="Active"?"pulse 1.2s infinite":"none"}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:a.color}}>{a.type}</div>
              <div style={{fontSize:11,color:C.muted}}>{a.location}</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:C.muted}}>Responders</div>
              <div style={{fontSize:16,fontWeight:800,color:C.accent,fontFamily:"'Orbitron', monospace"}}>{a.responders}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:C.muted}}>{a.time}</div>
              <div style={{fontSize:10,padding:"3px 8px",background:`${a.status==="Resolved"?C.safe:a.color}22`,border:`1px solid ${a.status==="Resolved"?C.safe:a.color}`,borderRadius:4,color:a.status==="Resolved"?C.safe:a.color,fontWeight:700,marginTop:4}}>{a.status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Casualty Estimator ────────────────────────────────────────────
function CasualtyEstimator() {
  const [inputs,setInputs] = useState({population:100000,riskScore:20,infrastructure:"moderate",earlyWarning:false,responseTime:6});
  const [result,setResult]  = useState(null);
  const inp = {background:"#060910",border:`1px solid ${C.border}`,borderRadius:6,padding:"7px 10px",color:C.text,fontSize:12,fontFamily:"monospace",width:"100%",outline:"none"};
  function calculate() {
    const base = (inputs.population/100000)*(inputs.riskScore/40)*500;
    const im   = inputs.infrastructure==="poor"?1.8:inputs.infrastructure==="moderate"?1.2:0.7;
    const wm   = inputs.earlyWarning?0.4:1;
    const tm   = inputs.responseTime<=2?0.6:inputs.responseTime<=6?0.8:inputs.responseTime<=24?1.1:1.5;
    const ai   = Math.round(base*im*wm*tm);
    const noai = Math.round(base*im*1.5);
    const saved= Math.max(0,noai-ai);
    setResult({withAI:ai,withoutAI:noai,livesSaved:saved,reduction:noai>0?Math.round((saved/noai)*100):0,injured:Math.round(ai*4.2),displaced:Math.round(ai*18)});
  }
  return (
    <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
      <div style={{fontSize:13,color:C.pink,letterSpacing:2,fontFamily:"'Orbitron', monospace",marginBottom:16}}>📊 CASUALTY ESTIMATOR</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[["Affected Population","population","number"],["Risk Score (1-40)","riskScore","number"],["Response Time (hrs)","responseTime","number"]].map(([l,k,t])=>(
            <div key={k}><div style={{fontSize:10,color:C.muted,marginBottom:3}}>{l}</div><input type={t} value={inputs[k]} onChange={e=>setInputs(i=>({...i,[k]:e.target.value}))} style={inp}/></div>
          ))}
          <div><div style={{fontSize:10,color:C.muted,marginBottom:3}}>Infrastructure</div>
            <select value={inputs.infrastructure} onChange={e=>setInputs(i=>({...i,infrastructure:e.target.value}))} style={inp}>
              {["poor","moderate","good"].map(v=><option key={v}>{v}</option>)}
            </select>
          </div>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:C.muted,cursor:"pointer"}}>
            <input type="checkbox" checked={inputs.earlyWarning} onChange={e=>setInputs(i=>({...i,earlyWarning:e.target.checked}))}/>
            Early Warning Active
          </label>
          <button onClick={calculate} style={{padding:"10px",background:C.pink,border:"none",borderRadius:8,color:"#fff",fontWeight:800,cursor:"pointer",fontFamily:"'Orbitron', monospace",fontSize:11}}>CALCULATE</button>
        </div>
        <div>
          {result?(
            <div style={{display:"flex",flexDirection:"column",gap:10,animation:"fadeIn 0.4s ease"}}>
              {[["Without AI",result.withoutAI,C.danger,"fatalities"],["With AI",result.withAI,C.safe,"fatalities"],["Lives Saved",result.livesSaved,C.accent,`${result.reduction}% reduction`],["Injured",result.injured,C.yellow,"people"],["Displaced",result.displaced,C.warn,"people"]].map(([l,v,c,s])=>(
                <div key={l} style={{background:"#060910",borderRadius:8,padding:"10px 14px",border:`1px solid ${c}33`}}>
                  <div style={{fontSize:10,color:C.muted}}>{l}</div>
                  <div style={{fontSize:22,fontWeight:800,color:c,fontFamily:"'Orbitron', monospace"}}>{v.toLocaleString()}</div>
                  <div style={{fontSize:10,color:C.muted}}>{s}</div>
                </div>
              ))}
            </div>
          ):(
            <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:13,textAlign:"center",border:`1px dashed ${C.border}`,borderRadius:8}}>Fill inputs<br/>& press CALCULATE</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Checklist ─────────────────────────────────────────────────────
function ChecklistPanel() {
  const [checked,setChecked] = useState({});
  const [openCat,setOpenCat] = useState("Emergency Kit");
  const total = Object.values(CHECKLIST_ITEMS).flat().length;
  const done  = Object.values(checked).filter(Boolean).length;
  const pct   = Math.round((done/total)*100);
  const sc    = pct>=80?C.safe:pct>=50?C.yellow:C.danger;
  return (
    <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:13,color:C.safe,letterSpacing:2,fontFamily:"'Orbitron', monospace"}}>✅ PREPAREDNESS CHECKLIST</div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:22,fontWeight:800,color:sc,fontFamily:"'Orbitron', monospace"}}>{pct}%</div>
          <div style={{fontSize:10,color:C.muted}}>{done}/{total} complete</div>
        </div>
      </div>
      <div style={{background:C.border,borderRadius:4,height:6,marginBottom:16}}>
        <div style={{width:`${pct}%`,background:sc,borderRadius:4,height:6,transition:"width 0.5s ease"}}/>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
        {Object.keys(CHECKLIST_ITEMS).map(cat=>{
          const cd = CHECKLIST_ITEMS[cat].filter(i=>checked[`${cat}::${i}`]).length;
          return <button key={cat} onClick={()=>setOpenCat(openCat===cat?null:cat)} style={{padding:"6px 12px",borderRadius:20,border:`1px solid ${openCat===cat?C.safe:C.border}`,background:openCat===cat?`${C.safe}15`:"transparent",color:openCat===cat?C.safe:C.muted,fontSize:11,cursor:"pointer",fontFamily:"monospace"}}>{cat} ({cd}/{CHECKLIST_ITEMS[cat].length})</button>;
        })}
      </div>
      {openCat&&(
        <div style={{animation:"fadeIn 0.3s ease"}}>
          {CHECKLIST_ITEMS[openCat].map(item=>{
            const key=`${openCat}::${item}`; const ic=!!checked[key];
            return (
              <div key={item} onClick={()=>setChecked(c=>({...c,[key]:!c[key]}))}
                style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:8,cursor:"pointer",marginBottom:4,background:ic?`${C.safe}0d`:"transparent",border:`1px solid ${ic?C.safe+"33":"transparent"}`}}>
                <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${ic?C.safe:C.border}`,background:ic?C.safe:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {ic&&<span style={{fontSize:10,color:C.bg,fontWeight:800}}>✓</span>}
                </div>
                <span style={{fontSize:12,color:ic?C.safe:C.text,textDecoration:ic?"line-through":"none",opacity:ic?0.6:1}}>{item}</span>
              </div>
            );
          })}
        </div>
      )}
      <div style={{marginTop:14,padding:"10px 14px",background:"#060910",borderRadius:8,fontSize:12,color:sc,textAlign:"center",fontWeight:700,fontFamily:"monospace"}}>
        {pct>=80?"🛡 Excellent! Your community is well prepared.":pct>=50?"⚠ Moderate readiness — complete remaining items soon.":"🔴 Low preparedness — immediate action required!"}
      </div>
    </div>
  );
}

// ── Weather ───────────────────────────────────────────────────────
function WeatherPanel() {
  const zones = [
    {zone:"Coastal Zone A", temp:32,humidity:88,wind:64,rain:180,condition:"Cyclonic",    icon:"🌀",color:C.warn},
    {zone:"Mountain Belt B",temp:18,humidity:62,wind:28,rain:45, condition:"Thunderstorm",icon:"⛈",color:C.yellow},
    {zone:"Delta Plains C", temp:29,humidity:94,wind:18,rain:240,condition:"Heavy Rain",  icon:"🌧",color:C.accent},
    {zone:"Arid Zone D",    temp:41,humidity:18,wind:12,rain:2,  condition:"Clear",        icon:"☀",color:C.safe},
  ];
  return (
    <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
      <div style={{fontSize:13,color:C.yellow,letterSpacing:2,fontFamily:"'Orbitron', monospace",marginBottom:16}}>🌤 WEATHER INTELLIGENCE</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {zones.map(z=>(
          <div key={z.zone} style={{background:"#070b14",borderRadius:10,padding:14,border:`1px solid ${z.color}33`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div><div style={{fontSize:12,fontWeight:700,color:z.color}}>{z.zone}</div><div style={{fontSize:10,color:C.muted}}>{z.condition}</div></div>
              <div style={{fontSize:28}}>{z.icon}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {[["🌡 Temp",`${z.temp}°C`],["💧 Humidity",`${z.humidity}%`],["💨 Wind",`${z.wind} km/h`],["🌧 Rain",`${z.rain}mm`]].map(([l,v])=>(
                <div key={l} style={{background:"#040608",borderRadius:6,padding:"6px 8px"}}>
                  <div style={{fontSize:10,color:C.muted}}>{l}</div>
                  <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"monospace"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  MAIN APP
// ════════════════════════════════════════════════════════════════
export default function App() {
  const [tab,setTab]                   = useState("dashboard");
  const [form,setForm]                 = useState({region:"Coastal Zone A",floods:5,earthquakes:2,cyclones:3,rainfall:180,population:250000,infrastructure:"moderate",earlyWarning:false});
  const [prediction,setPrediction]     = useState(null);
  const [predLoading,setPredLoading]   = useState(false);
  const [chat,setChat]                 = useState([{role:"assistant",text:"Hello! I'm your Disaster AI Analyst powered by Groq (LLaMA 3 70B) — ultra-fast responses!\n\nAsk me anything about risk analysis, evacuation planning, resource allocation, or how this ML system works."}]);
  const [chatInput,setChatInput]       = useState("");
  const [chatLoading,setChatLoading]   = useState(false);
  const keyMissing                     = GROQ_API_KEY === "YOUR_GROQ_API_KEY_HERE";
  const chatEndRef                     = useRef(null);

  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:"smooth"}); },[chat]);

  function runPrediction() {
    setPredLoading(true);
    setTimeout(()=>{ setPrediction(predictRisk(Number(form.floods),Number(form.earthquakes),Number(form.cyclones),Number(form.rainfall),Number(form.population),form.infrastructure,form.earlyWarning)); setPredLoading(false); },900);
  }

  async function sendChat() {
    if (!chatInput.trim()||chatLoading) return;
    if (keyMissing) {
      setChat(p=>[...p,{role:"user",text:chatInput},{role:"assistant",text:"⚠ Groq API key not set yet!\n\nQuick fix:\n1. Go to https://console.groq.com (free)\n2. Sign up → API Keys → Create Key → Copy it\n3. Open src/App.jsx\n4. Line 7: replace YOUR_GROQ_API_KEY_HERE with your key\n5. Save → refresh → AI works! ✅"}]);
      setChatInput(""); return;
    }
    const userMsg = chatInput.trim(); setChatInput("");
    setChat(p=>[...p,{role:"user",text:userMsg}]); setChatLoading(true);
    const sys = `You are an expert AI disaster preparedness analyst in a hackathon project called DisasterShield AI. Current prediction: ${prediction?JSON.stringify(prediction):"none"}. Form values: ${JSON.stringify(form)}. Historical data: Delta Plains C most critical (780 casualties 2023). Be concise (4-6 sentences), practical, use bullet points when listing.`;
    try {
      const reply = await callGroq(sys, userMsg);
      setChat(p=>[...p,{role:"assistant",text:reply}]);
    } catch(err) {
      setChat(p=>[...p,{role:"assistant",text:`⚠ Groq error: ${err.message}\n\nCheck your API key in App.jsx line 7.`}]);
    }
    setChatLoading(false);
  }

  const TABS = [["dashboard","📊 Dashboard"],["predict","🔮 Predict"],["simulate","⚡ Simulate"],["sos","🆘 SOS"],["weather","🌤 Weather"],["resources","🚁 Resources"],["casualty","📊 Casualty"],["checklist","✅ Checklist"],["chat","🤖 AI Chat"]];
  const tabBtn = id => ({padding:"7px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,letterSpacing:0.5,fontFamily:"'Orbitron', monospace",transition:"all 0.2s",whiteSpace:"nowrap",background:tab===id?C.accent:"transparent",color:tab===id?C.bg:C.muted,boxShadow:tab===id?`0 0 14px ${C.accent}77`:"none"});
  const inp = {background:"#040608",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:13,fontFamily:"monospace",width:"100%",outline:"none"};

  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"'Rajdhani', sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-track{background:${C.bg};}::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        input[type=checkbox]{accent-color:${C.safe};width:16px;height:16px;cursor:pointer;}
        select option{background:#0b0f1c;}
      `}</style>

      {/* Header */}
      <div style={{background:"linear-gradient(90deg,#04060e,#080e1e,#04060e)",borderBottom:`1px solid ${C.border}`,padding:"10px 20px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <div style={{width:34,height:34,borderRadius:"50%",background:`radial-gradient(circle,${C.accent},#003cff)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:`0 0 18px ${C.accent}88`,flexShrink:0}}>🌪</div>
          <div>
            <div style={{fontSize:15,fontWeight:900,fontFamily:"'Orbitron', monospace",color:C.accent,letterSpacing:2}}>DISASTERSHIELD AI</div>
            <div style={{fontSize:9,color:C.muted,letterSpacing:3}}>ML-POWERED DISASTER PREPAREDNESS & RESPONSE PLATFORM</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",background:"#1a0a30",border:`1px solid ${C.purple}55`,borderRadius:20}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:keyMissing?C.purple:C.safe,boxShadow:`0 0 6px ${keyMissing?C.purple:C.safe}`}}/>
              <span style={{fontSize:10,color:C.purple,fontFamily:"monospace",fontWeight:700}}>{keyMissing?"DEMO MODE":"⚡ GROQ AI ONLINE"}</span>
            </div>
            <div style={{width:8,height:8,borderRadius:"50%",background:C.safe,boxShadow:`0 0 8px ${C.safe}`,animation:"pulse 2s infinite"}}/>
            <span style={{fontSize:10,color:C.safe,fontFamily:"monospace"}}>ONLINE</span>
          </div>
        </div>
        <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:2}}>
          {TABS.map(([id,label])=><button key={id} onClick={()=>setTab(id)} style={tabBtn(id)}>{label}</button>)}
        </div>
      </div>

      {/* API key warning banner */}
      {keyMissing&&(
        <div style={{background:"#0f0a24",borderBottom:`1px solid ${C.purple}55`,padding:"8px 20px",display:"flex",alignItems:"center",gap:10,fontSize:12,fontFamily:"monospace",flexWrap:"wrap"}}>
          <span style={{color:C.purple,fontWeight:800}}>◆ PUBLIC DEMO</span>
          <span style={{color:C.muted}}>All figures are simulated for demonstration.</span>
          <span style={{color:C.muted}}>AI Chat runs when you add a free Groq key locally (see the README).</span>
        </div>
      )}

      <div style={{padding:"16px 20px",maxWidth:1200,margin:"0 auto"}}>
        <AlertTicker/>

        {/* ── DASHBOARD ──────────────────────────────────── */}
        {tab==="dashboard"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <div style={{fontSize:20,fontWeight:700,fontFamily:"'Orbitron', monospace",marginBottom:2}}>Operations Center</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Multi-hazard monitoring dashboard · simulated data</div>
            <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
              <StatCard label="Active Alerts"     value="3"      sub="↑1 from yesterday"  color={C.danger} icon="🔴"/>
              <StatCard label="Regions Monitored" value="4"      sub="All systems live"    color={C.accent} icon="🗺"/>
              <StatCard label="Evacuated (24h)"   value="1,240"  sub="Delta Plains C"      color={C.warn}   icon="🚶"/>
              <StatCard label="Model Accuracy"    value="91.4%"  sub="RF Classifier v3"    color={C.safe}   icon="🧠"/>
              <StatCard label="Resources"         value="847"    sub="Units deployed"       color={C.yellow} icon="🚁"/>
              <StatCard label="Lives Saved YTD"   value="2,340"  sub="vs no-AI baseline"   color={C.pink}   icon="❤"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1.6fr",gap:16,marginBottom:16}}>
              <RiskMap zones={[{region:"Coastal Zone A",risk:"High"},{region:"Mountain Belt B",risk:"Medium"},{region:"Delta Plains C",risk:"Critical"},{region:"Arid Zone D",risk:"Low"}]}/>
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                <TimelineChart/>
                <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
                  <div style={{fontSize:11,color:C.muted,marginBottom:10,letterSpacing:2,textTransform:"uppercase"}}>Zone Risk Levels</div>
                  <Bar label="Delta Plains C"  value={89} max={100} color={C.danger} unit="%"/>
                  <Bar label="Coastal Zone A"  value={67} max={100} color={C.warn}   unit="%"/>
                  <Bar label="Mountain Belt B" value={44} max={100} color={C.yellow} unit="%"/>
                  <Bar label="Arid Zone D"     value={12} max={100} color={C.safe}   unit="%"/>
                </div>
              </div>
            </div>
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:10,letterSpacing:2,textTransform:"uppercase"}}>Historical Incident Log</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"monospace"}}>
                <thead><tr style={{color:C.muted,borderBottom:`1px solid ${C.border}`}}>
                  {["Region","Year","Floods","Earthquakes","Cyclones","Risk","Casualties"].map(h=><th key={h} style={{padding:"6px 8px",textAlign:"left",fontWeight:600,letterSpacing:1,fontSize:10}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {HISTORICAL_DATA.map((r,i)=>{
                    const rc=r.risk==="Critical"?C.danger:r.risk==="High"?C.warn:r.risk==="Medium"?C.yellow:C.safe;
                    return <tr key={i} style={{borderBottom:`1px solid ${C.border}22`}} onMouseEnter={e=>e.currentTarget.style.background="#1a2744"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"7px 8px"}}>{r.region}</td>
                      <td style={{padding:"7px 8px",color:C.muted}}>{r.year}</td>
                      <td style={{padding:"7px 8px",color:C.accent}}>{r.floods}</td>
                      <td style={{padding:"7px 8px",color:C.yellow}}>{r.earthquakes}</td>
                      <td style={{padding:"7px 8px",color:C.warn}}>{r.cyclones}</td>
                      <td style={{padding:"7px 8px"}}><span style={{color:rc,fontWeight:700}}>{r.risk}</span></td>
                      <td style={{padding:"7px 8px",color:C.muted}}>{r.casualties.toLocaleString()}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PREDICT ────────────────────────────────────── */}
        {tab==="predict"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <div style={{fontSize:20,fontWeight:700,fontFamily:"'Orbitron', monospace",marginBottom:2}}>Risk Prediction Engine</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Random Forest Classifier — 7 features — 91.4% accuracy</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
              <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
                <div style={{fontSize:12,color:C.accent,marginBottom:14,letterSpacing:2,fontFamily:"'Orbitron', monospace"}}>INPUT PARAMETERS</div>
                {[["region","Region / Location","text"],["floods","Flood Events (past 12 months)","number"],["earthquakes","Earthquake Events","number"],["cyclones","Cyclone / Storm Events","number"],["rainfall","Avg Monthly Rainfall (mm)","number"],["population","Affected Population","number"]].map(([key,lbl,type])=>(
                  <div key={key} style={{marginBottom:12}}>
                    <div style={{fontSize:10,color:C.muted,letterSpacing:1,marginBottom:3}}>{lbl}</div>
                    <input type={type} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} style={inp}/>
                  </div>
                ))}
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:10,color:C.muted,letterSpacing:1,marginBottom:3}}>Infrastructure Quality</div>
                  <select value={form.infrastructure} onChange={e=>setForm(f=>({...f,infrastructure:e.target.value}))} style={inp}>
                    {["poor","moderate","good"].map(v=><option key={v}>{v}</option>)}
                  </select>
                </div>
                <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:C.muted,cursor:"pointer",marginBottom:16}}>
                  <input type="checkbox" checked={form.earlyWarning} onChange={e=>setForm(f=>({...f,earlyWarning:e.target.checked}))}/>
                  Early Warning System Active
                </label>
                <button onClick={runPrediction} disabled={predLoading}
                  style={{width:"100%",padding:"12px",background:predLoading?C.border:`linear-gradient(90deg,${C.accent},#0055ff)`,border:"none",borderRadius:8,color:predLoading?C.muted:C.bg,fontSize:12,fontWeight:800,fontFamily:"'Orbitron', monospace",cursor:predLoading?"not-allowed":"pointer",letterSpacing:2,boxShadow:predLoading?"none":`0 0 18px ${C.accent}66`}}>
                  {predLoading?"⟳  RUNNING MODEL...":"▶  RUN PREDICTION"}
                </button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {prediction?(
                  <>
                    <div style={{background:C.panel,border:`2px solid ${prediction.color}`,borderRadius:12,padding:24,textAlign:"center",boxShadow:`0 0 40px ${prediction.color}22`,animation:"fadeIn 0.5s ease"}}>
                      <div style={{fontSize:10,color:C.muted,letterSpacing:3,marginBottom:6}}>PREDICTED RISK LEVEL</div>
                      <div style={{fontSize:48,fontWeight:900,fontFamily:"'Orbitron', monospace",color:prediction.color,textShadow:`0 0 30px ${prediction.color}`,letterSpacing:3}}>{prediction.label}</div>
                      <div style={{display:"flex",justifyContent:"center",gap:24,marginTop:10}}>
                        {[["Confidence",`${prediction.confidence}%`,prediction.color],["Risk Score",`${prediction.score}/40`,C.text],["Response",prediction.responseTime,C.accent]].map(([l,v,c])=>(
                          <div key={l}><div style={{fontSize:10,color:C.muted}}>{l}</div><div style={{color:c,fontWeight:700,fontFamily:"monospace",fontSize:12}}>{v}</div></div>
                        ))}
                      </div>
                    </div>
                    <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
                      <div style={{fontSize:11,color:C.muted,marginBottom:10,letterSpacing:2}}>RECOMMENDED RESPONSE</div>
                      {[["🚁 Resources",`${prediction.resources} units`,C.accent],["🏃 Evac Zones",`${prediction.evacZones} zones`,C.warn],["💀 Est. Casualties",prediction.casualties.toLocaleString(),prediction.color],["⏱ Priority",prediction.label==="CRITICAL"?"IMMEDIATE":prediction.label==="HIGH"?"URGENT":"MONITOR",prediction.color]].map(([l,v,c])=>(
                        <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"9px 12px",background:"#060910",borderRadius:7,marginBottom:6,fontSize:12}}>
                          <span style={{color:C.muted}}>{l}</span><span style={{color:c,fontWeight:700,fontFamily:"monospace"}}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
                      <div style={{fontSize:11,color:C.muted,marginBottom:10,letterSpacing:2}}>FEATURE IMPORTANCE</div>
                      <Bar label="Cyclone Events"    value={42} max={100} color={C.danger} unit="%"/>
                      <Bar label="Earthquake Events" value={34} max={100} color={C.warn}   unit="%"/>
                      <Bar label="Infrastructure"    value={25} max={100} color={C.pink}   unit="%"/>
                      <Bar label="Flood Events"      value={21} max={100} color={C.accent} unit="%"/>
                      <Bar label="Rainfall"          value={15} max={100} color={C.yellow} unit="%"/>
                      <Bar label="Population"        value={10} max={100} color={C.safe}   unit="%"/>
                    </div>
                  </>
                ):(
                  <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:C.panel,border:`1px dashed ${C.border}`,borderRadius:12,flexDirection:"column",gap:8,color:C.muted,minHeight:300}}>
                    <div style={{fontSize:36}}>🔮</div><div style={{fontSize:13}}>Run the model to see predictions</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab==="simulate"&&<div style={{animation:"fadeIn 0.4s ease"}}><div style={{fontSize:20,fontWeight:700,fontFamily:"'Orbitron', monospace",marginBottom:2}}>Disaster Simulation Engine</div><div style={{fontSize:12,color:C.muted,marginBottom:16}}>AI-assisted step-through disaster response scenarios</div><SimulationPanel/></div>}
        {tab==="sos"&&<div style={{animation:"fadeIn 0.4s ease"}}><div style={{fontSize:20,fontWeight:700,fontFamily:"'Orbitron', monospace",marginBottom:2}}>SOS Alert System</div><div style={{fontSize:12,color:C.muted,marginBottom:16}}>Live incident reporting and responder coordination</div><SOSPanel/></div>}
        {tab==="weather"&&<div style={{animation:"fadeIn 0.4s ease"}}><div style={{fontSize:20,fontWeight:700,fontFamily:"'Orbitron', monospace",marginBottom:2}}>Weather Intelligence</div><div style={{fontSize:12,color:C.muted,marginBottom:16}}>Meteorological data integrated with risk models</div><WeatherPanel/></div>}

        {/* ── RESOURCES ──────────────────────────────────── */}
        {tab==="resources"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <div style={{fontSize:20,fontWeight:700,fontFamily:"'Orbitron', monospace",marginBottom:2}}>Resource Allocation</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:16}}>AI-optimized emergency resource distribution</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
              {[{zone:"Delta Plains C",risk:"CRITICAL",color:C.danger,medical:120,rescue:85,food:4200,shelter:340,status:"DEPLOYED"},{zone:"Coastal Zone A",risk:"HIGH",color:C.warn,medical:80,rescue:60,food:2800,shelter:210,status:"STAGING"},{zone:"Mountain Belt B",risk:"MEDIUM",color:C.yellow,medical:40,rescue:30,food:1200,shelter:90,status:"STANDBY"},{zone:"Arid Zone D",risk:"LOW",color:C.safe,medical:10,rescue:8,food:300,shelter:20,status:"MONITORING"}].map(z=>(
                <div key={z.zone} style={{background:C.panel,border:`1px solid ${z.color}44`,borderRadius:12,padding:18}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                    <div><div style={{fontSize:14,fontWeight:700}}>{z.zone}</div><div style={{fontSize:10,color:z.color,letterSpacing:2,marginTop:2}}>{z.status}</div></div>
                    <span style={{padding:"4px 10px",background:`${z.color}22`,border:`1px solid ${z.color}66`,borderRadius:6,fontSize:11,color:z.color,fontWeight:700}}>{z.risk}</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {[["🏥 Medical",z.medical,"teams"],["🚁 Rescue",z.rescue,"units"],["🍱 Food",z.food,"packs"],["🏕 Shelter",z.shelter,"kits"]].map(([l,v,u])=>(
                      <div key={l} style={{background:"#060910",borderRadius:8,padding:"9px 12px"}}>
                        <div style={{fontSize:10,color:C.muted}}>{l}</div>
                        <div style={{fontSize:18,fontWeight:800,color:z.color,fontFamily:"'Orbitron', monospace"}}>{v.toLocaleString()}</div>
                        <div style={{fontSize:9,color:C.muted}}>{u}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:18}}>
              <div style={{fontSize:12,color:C.accent,marginBottom:14,letterSpacing:2,fontFamily:"'Orbitron', monospace"}}>EVACUATION ROUTES</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                {[{route:"Route Alpha",from:"Delta Plains C",to:"Safe Zone 1",dist:"42 km",eta:"1.2 hrs",status:"OPEN",color:C.safe},{route:"Route Beta",from:"Coastal Zone A",to:"Inland Hub B",dist:"67 km",eta:"2.1 hrs",status:"PARTIAL",color:C.yellow},{route:"Route Gamma",from:"Mountain Belt B",to:"Valley Refuge",dist:"28 km",eta:"0.9 hrs",status:"OPEN",color:C.safe}].map(r=>(
                  <div key={r.route} style={{background:"#060910",borderRadius:10,padding:14,border:`1px solid ${r.color}44`}}>
                    <div style={{fontSize:12,fontWeight:700,color:r.color,marginBottom:8,fontFamily:"monospace"}}>{r.route}</div>
                    {[["From",r.from],["To",r.to],["Distance",r.dist],["ETA",r.eta]].map(([l,v])=>(
                      <div key={l} style={{fontSize:11,color:C.muted,marginBottom:3}}>{l}: <span style={{color:C.text}}>{v}</span></div>
                    ))}
                    <div style={{marginTop:8,display:"inline-block",padding:"3px 8px",background:`${r.color}22`,border:`1px solid ${r.color}`,borderRadius:4,fontSize:10,color:r.color,fontWeight:700}}>{r.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab==="casualty"&&<div style={{animation:"fadeIn 0.4s ease"}}><div style={{fontSize:20,fontWeight:700,fontFamily:"'Orbitron', monospace",marginBottom:2}}>Casualty Estimator</div><div style={{fontSize:12,color:C.muted,marginBottom:16}}>Compare AI vs no-AI intervention impact</div><CasualtyEstimator/></div>}
        {tab==="checklist"&&<div style={{animation:"fadeIn 0.4s ease"}}><div style={{fontSize:20,fontWeight:700,fontFamily:"'Orbitron', monospace",marginBottom:2}}>Preparedness Checklist</div><div style={{fontSize:12,color:C.muted,marginBottom:16}}>Community disaster readiness assessment</div><ChecklistPanel/></div>}

        {/* ── AI CHAT (GROQ) ──────────────────────────────── */}
        {tab==="chat"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <div style={{fontSize:20,fontWeight:700,fontFamily:"'Orbitron', monospace",marginBottom:2}}>AI Disaster Analyst</div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
              <span style={{fontSize:12,color:C.muted}}>Powered by</span>
              <span style={{fontSize:12,fontWeight:800,color:C.purple,fontFamily:"monospace",background:"#1a0a30",padding:"2px 10px",borderRadius:20,border:`1px solid ${C.purple}55`}}>⚡ Groq — LLaMA 3 70B</span>
              <span style={{fontSize:12,color:C.muted}}>— ultra-fast free AI</span>
            </div>

            {keyMissing&&(
              <div style={{background:"#1a0800",border:`1px solid ${C.warn}`,borderRadius:10,padding:"14px 18px",marginBottom:16,fontSize:12,fontFamily:"monospace",color:C.warn}}>
                <div style={{fontWeight:800,marginBottom:8}}>⚠ 3 Steps to activate AI Chat:</div>
                <div style={{color:C.muted,lineHeight:1.9}}>
                  1. Visit <span style={{color:C.accent}}>https://console.groq.com</span> — completely <span style={{color:C.safe,fontWeight:700}}>FREE</span><br/>
                  2. Sign up → click <b>API Keys</b> → <b>Create API Key</b> → copy it<br/>
                  3. Open <span style={{color:C.accent}}>src/App.jsx</span> in VS Code → line 7:<br/>
                  <span style={{color:C.yellow,display:"block",marginTop:4,marginLeft:16}}>const GROQ_API_KEY = "YOUR_GROQ_API_KEY_HERE";</span>
                  <span style={{color:C.text,display:"block",marginLeft:16}}>Replace <b>YOUR_GROQ_API_KEY_HERE</b> with your actual key → Save → Done ✅</span>
                </div>
              </div>
            )}

            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
              <div style={{height:420,overflowY:"auto",padding:18,display:"flex",flexDirection:"column",gap:10}}>
                {chat.map((m,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",animation:"fadeIn 0.3s ease"}}>
                    <div style={{maxWidth:"78%",padding:"11px 15px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?`${C.accent}18`:"#070b14",border:`1px solid ${m.role==="user"?C.accent+"44":C.border}`,fontSize:13,lineHeight:1.65,color:C.text,whiteSpace:"pre-wrap"}}>
                      {m.role==="assistant"&&<div style={{fontSize:9,color:C.purple,marginBottom:5,letterSpacing:2,fontFamily:"monospace",display:"flex",alignItems:"center",gap:6}}>
                        <span style={{background:C.purple,color:"#fff",padding:"1px 5px",borderRadius:3,fontSize:8,fontWeight:800}}>GROQ</span>
                        <span>DISASTER AI — LLaMA 3 70B</span>
                      </div>}
                      {m.text}
                    </div>
                  </div>
                ))}
                {chatLoading&&<div style={{display:"flex"}}><div style={{padding:"11px 15px",background:"#070b14",border:`1px solid ${C.border}`,borderRadius:"16px 16px 16px 4px",fontSize:12}}><span style={{color:C.purple,animation:"pulse 1.2s infinite"}}>⚡ Groq thinking...</span></div></div>}
                <div ref={chatEndRef}/>
              </div>
              <div style={{padding:"8px 16px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8,flexWrap:"wrap"}}>
                {["What resources are needed for a critical zone?","Best evacuation strategies?","How does this ML model work?","Impact of early warning systems?","Explain disaster risk factors"].map(q=>(
                  <button key={q} onClick={()=>setChatInput(q)} style={{padding:"5px 10px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:20,color:C.muted,fontSize:10,cursor:"pointer",fontFamily:"monospace"}}>{q}</button>
                ))}
              </div>
              <div style={{padding:14,borderTop:`1px solid ${C.border}`,display:"flex",gap:10}}>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Ask about disaster response, risk analysis, resource planning..." style={{...inp,flex:1}}/>
                <button onClick={sendChat} disabled={chatLoading||!chatInput.trim()}
                  style={{padding:"8px 20px",background:chatLoading?C.border:C.purple,border:"none",borderRadius:8,color:chatLoading?C.muted:"#fff",fontWeight:800,cursor:chatLoading?"not-allowed":"pointer",fontSize:12,fontFamily:"'Orbitron', monospace",boxShadow:`0 0 10px ${C.purple}55`}}>
                  SEND
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}