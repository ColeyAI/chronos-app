import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth, useSyncedData } from "./useSync";

const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const FULL_DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const HOURS=Array.from({length:24},(_,i)=>i);
const COLORS=[
  {name:"Amber",bg:"#b8860b",text:"#fff",accent:"#d4a017"},
  {name:"Ocean",bg:"#1a6b8a",text:"#fff",accent:"#2196F3"},
  {name:"Rose",bg:"#9b4d6e",text:"#fff",accent:"#e91e63"},
  {name:"Emerald",bg:"#2d6a4f",text:"#fff",accent:"#4caf50"},
  {name:"Violet",bg:"#5c3d8f",text:"#fff",accent:"#9c27b0"},
  {name:"Slate",bg:"#4a5568",text:"#fff",accent:"#718096"},
  {name:"Coral",bg:"#c0553a",text:"#fff",accent:"#ff6b4a"},
  {name:"Teal",bg:"#0d7377",text:"#fff",accent:"#14b8a6"},
  {name:"Crimson",bg:"#8b1a1a",text:"#fff",accent:"#dc2626"},
  {name:"Gold",bg:"#92700c",text:"#fff",accent:"#f59e0b"},
];
const HCOLORS=["#d4a017","#2196F3","#e91e63","#4caf50","#9c27b0","#ff6b4a","#14b8a6","#dc2626","#f59e0b","#718096"];

const fmt=(h,m=0)=>{const ap=h>=12?"PM":"AM";const hh=h===0?12:h>12?h-12:h;return m>0?`${hh}:${String(m).padStart(2,"0")} ${ap}`:`${hh} ${ap}`;};
const dkey=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const sow=(d)=>{const s=new Date(d);s.setDate(s.getDate()-s.getDay());s.setHours(0,0,0,0);return s;};
const addD=(d,n)=>{const r=new Date(d);r.setDate(r.getDate()+n);return r;};
const same=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
const mdays=(y,m)=>new Date(y,m+1,0).getDate();
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 768);
  useEffect(() => { const h = () => setM(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  return m;
}

const IC={
  Cal:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Chk:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  ChkS:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Bar:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Plus:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  X:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  CL:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
  CR:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Del:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="m19 6-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6m5 0V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/></svg>,
  Rep:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  Lnk:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  CC:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11.5 14.5 16 9.5"/></svg>,
  CCF:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11.5 14.5 16 9.5" fill="none" stroke="#0f0f0f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Out:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Sync:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>,
  Menu:()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
};

const nb={display:"flex",alignItems:"center",justifyContent:"center",padding:"4px 8px",background:"#1e1e1e",border:"1px solid #333",borderRadius:6,color:"#aaa",cursor:"pointer"};

// ── Auth Screen ──
function AuthScreen(){
  const{signIn,signUp}=useAuth();
  const[mode,setMode]=useState("signin");const[email,setEmail]=useState("");const[pass,setPass]=useState("");
  const[error,setError]=useState("");const[msg,setMsg]=useState("");const[loading,setLoading]=useState(false);
  const handle=async()=>{setError("");setMsg("");setLoading(true);
    if(mode==="signin"){const{error:e}=await signIn(email,pass);if(e)setError(e.message)}
    else{const{error:e}=await signUp(email,pass);if(e)setError(e.message);else setMsg("Check your email to confirm, then sign in!")}
    setLoading(false)};
  return(
    <div style={{minHeight:"100vh",background:"#0f0f0f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",color:"#e8e4de",padding:20}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet"/>
      <div style={{width:"100%",maxWidth:380,padding:36,background:"#161616",borderRadius:20,border:"1px solid #252525"}}>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700,margin:"0 0 4px",background:"linear-gradient(135deg,#d4a017,#f5c842)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Chronos</h1>
        <p style={{fontSize:13,color:"#666",margin:"0 0 28px"}}>Time blocking + habit tracking</p>
        <div style={{display:"flex",background:"#1e1e1e",borderRadius:8,overflow:"hidden",marginBottom:20}}>
          {["signin","signup"].map(m=>(<button key={m} onClick={()=>{setMode(m);setError("");setMsg("")}} style={{flex:1,padding:"10px 0",background:mode===m?"#333":"transparent",border:"none",color:mode===m?"#d4a017":"#666",cursor:"pointer",fontSize:13,fontWeight:500}}>{m==="signin"?"Sign In":"Sign Up"}</button>))}
        </div>
        <div style={{marginBottom:14}}><label style={{fontSize:12,color:"#888",marginBottom:4,display:"block"}}>Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@email.com" style={{width:"100%",padding:"12px",background:"#1e1e1e",border:"1px solid #333",borderRadius:8,color:"#e8e4de",fontSize:16,outline:"none",boxSizing:"border-box"}} onKeyDown={e=>e.key==="Enter"&&handle()}/></div>
        <div style={{marginBottom:20}}><label style={{fontSize:12,color:"#888",marginBottom:4,display:"block"}}>Password</label>
          <input value={pass} onChange={e=>setPass(e.target.value)} type="password" placeholder="••••••••" style={{width:"100%",padding:"12px",background:"#1e1e1e",border:"1px solid #333",borderRadius:8,color:"#e8e4de",fontSize:16,outline:"none",boxSizing:"border-box"}} onKeyDown={e=>e.key==="Enter"&&handle()}/></div>
        {error&&<div style={{padding:"8px 12px",background:"#3a1a1a",border:"1px solid #5a2a2a",borderRadius:8,color:"#ef4444",fontSize:12,marginBottom:14}}>{error}</div>}
        {msg&&<div style={{padding:"8px 12px",background:"#1a3a1a",border:"1px solid #2a5a2a",borderRadius:8,color:"#4ade80",fontSize:12,marginBottom:14}}>{msg}</div>}
        <button onClick={handle} disabled={loading} style={{width:"100%",padding:"12px 0",background:"linear-gradient(135deg,#d4a017,#b8860b)",border:"none",borderRadius:8,color:"#fff",cursor:loading?"wait":"pointer",fontSize:15,fontWeight:600,opacity:loading?.7:1}}>{loading?"...":(mode==="signin"?"Sign In":"Create Account")}</button>
      </div>
    </div>);
}

// ── Main App ──
export default function App(){
  const{user,loading:authLoading,signOut}=useAuth();
  if(authLoading)return(<div style={{minHeight:"100vh",background:"#0f0f0f",display:"flex",alignItems:"center",justifyContent:"center",color:"#d4a017",fontFamily:"'Playfair Display',serif",fontSize:24}}><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&display=swap" rel="stylesheet"/>Chronos</div>);
  if(!user)return<AuthScreen/>;
  return<MainApp user={user} signOut={signOut}/>;
}

function MainApp({user,signOut}){
  const{events,setEvents,habits,setHabits,habitLog,setHabitLog,completedBlocks:comp,setCompletedBlocks:setComp,loaded}=useSyncedData(user);
  const[page,setPage]=useState("calendar");
  const mob=useIsMobile();

  const addEv=(ev)=>setEvents(p=>[...p,{...ev,id:uid()}]);
  const delEv=(id)=>setEvents(p=>p.filter(e=>e.id!==id));
  const updEv=(id,patch)=>setEvents(p=>p.map(e=>e.id===id?{...e,...patch}:e));
  const addRec=(ev,w)=>{const ne=[];const g=uid();for(let i=0;i<w;i++){const d=new Date(ev.date+"T12:00:00");d.setDate(d.getDate()+i*7);ne.push({...ev,id:uid(),date:dkey(d),recurringGroup:g})}setEvents(p=>[...p,...ne])};
  const addHab=(h)=>setHabits(p=>[...p,{...h,id:uid()}]);
  const delHab=(id)=>{setHabits(p=>p.filter(h=>h.id!==id));setHabitLog(p=>{const n={...p};Object.keys(n).forEach(k=>{if(k.startsWith(id))delete n[k]});return n});setEvents(p=>p.map(e=>e.linkedHabitId===id?{...e,linkedHabitId:null}:e))};

  const toggle=useCallback((eid,hid,day)=>{
    const hk=hid?`${hid}_${day}`:null;const bk=eid?`${eid}_${day}`:null;
    const done=(hk&&habitLog[hk])||(bk&&comp[bk]);const nv=!done;
    if(hid)setHabitLog(p=>{const n={...p};if(nv)n[`${hid}_${day}`]=true;else delete n[`${hid}_${day}`];return n});
    if(eid)setComp(p=>{const n={...p};if(nv)n[`${eid}_${day}`]=true;else delete n[`${eid}_${day}`];return n});
    if(hid)events.forEach(ev=>{if(ev.linkedHabitId===hid&&ev.date===day&&ev.id!==eid)setComp(p=>{const n={...p};if(nv)n[`${ev.id}_${day}`]=true;else delete n[`${ev.id}_${day}`];return n})});
    if(eid&&!hid){const ev=events.find(e=>e.id===eid);if(ev?.linkedHabitId){setHabitLog(p=>{const n={...p};if(nv)n[`${ev.linkedHabitId}_${day}`]=true;else delete n[`${ev.linkedHabitId}_${day}`];return n});events.forEach(o=>{if(o.linkedHabitId===ev.linkedHabitId&&o.date===day&&o.id!==eid)setComp(p=>{const n={...p};if(nv)n[`${o.id}_${day}`]=true;else delete n[`${o.id}_${day}`];return n})})}}
  },[events,habitLog,comp]);

  const togBlock=useCallback((eid,day)=>{const ev=events.find(e=>e.id===eid);if(ev?.linkedHabitId)toggle(eid,ev.linkedHabitId,day);else setComp(p=>{const n={...p};const k=`${eid}_${day}`;if(n[k])delete n[k];else n[k]=true;return n})},[events,toggle]);
  const togHab=useCallback((hid,day)=>{const le=events.find(e=>e.linkedHabitId===hid&&e.date===day);toggle(le?.id||null,hid,day)},[events,toggle]);
  const isComp=(eid,day)=>!!comp[`${eid}_${day}`];

  if(!loaded)return(<div style={{minHeight:"100vh",background:"#0f0f0f",display:"flex",alignItems:"center",justifyContent:"center",color:"#888",fontFamily:"'DM Sans',sans-serif",fontSize:14}}>Loading your data...</div>);

  return(
    <div style={{minHeight:"100vh",background:"#0f0f0f",color:"#e8e4de",fontFamily:"'DM Sans','Segoe UI',sans-serif",display:"flex",flexDirection:mob?"column":"row"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet"/>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}} *{box-sizing:border-box} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:#0f0f0f} ::-webkit-scrollbar-thumb{background:#333;border-radius:3px} html{overflow:hidden;height:100%} body{height:100%;overflow:hidden}`}</style>

      {/* Desktop Sidebar */}
      {!mob&&<div style={{width:220,minHeight:"100vh",background:"#161616",borderRight:"1px solid #252525",padding:"20px 0",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"0 20px 24px",borderBottom:"1px solid #252525"}}>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,margin:0,background:"linear-gradient(135deg,#d4a017,#f5c842)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Chronos</h1>
          <p style={{fontSize:11,color:"#666",margin:"4px 0 0",letterSpacing:1.5,textTransform:"uppercase"}}>Time Blocking</p>
        </div>
        <nav style={{padding:"16px 12px",flex:1}}>
          {[{id:"calendar",icon:IC.Cal,label:"Calendar"},{id:"habits",icon:IC.Chk,label:"Habits"},{id:"analytics",icon:IC.Bar,label:"Analytics"}].map(({id,icon:Ico,label})=>(
            <button key={id} onClick={()=>setPage(id)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 12px",marginBottom:4,background:page===id?"#252525":"transparent",border:"none",borderRadius:8,color:page===id?"#d4a017":"#888",cursor:"pointer",fontSize:14,fontWeight:page===id?600:400,transition:"all .15s"}}><Ico/>{label}</button>))}
        </nav>
        <div style={{padding:"12px 20px",borderTop:"1px solid #252525"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><IC.Sync/><span style={{fontSize:10,color:"#4ade80"}}>Synced</span></div>
          <p style={{fontSize:10,color:"#555",margin:"0 0 8px"}}>{events.length} blocks · {habits.length} habits</p>
          <button onClick={signOut} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:"#666",cursor:"pointer",fontSize:11,padding:0}}><IC.Out/>Sign out</button>
        </div>
      </div>}

      {/* Main content */}
      <div style={{flex:1,overflow:"auto",height:mob?"calc(100vh - 64px)":"100vh"}}>
        {page==="calendar"&&<CalPage ev={events} hab={habits} addEv={addEv} addRec={addRec} delEv={delEv} updEv={updEv} togBlock={togBlock} isComp={isComp} comp={comp} mob={mob}/>}
        {page==="habits"&&<HabPage hab={habits} hLog={habitLog} addHab={addHab} delHab={delHab} togHab={togHab} ev={events} mob={mob}/>}
        {page==="analytics"&&<AnaPage ev={events} hab={habits} hLog={habitLog} comp={comp} mob={mob} signOut={signOut}/>}
      </div>

      {/* Mobile Bottom Tab Bar */}
      {mob&&<div style={{display:"flex",background:"#161616",borderTop:"1px solid #252525",height:64,flexShrink:0,paddingBottom:"env(safe-area-inset-bottom)"}}>
        {[{id:"calendar",icon:IC.Cal,label:"Calendar"},{id:"habits",icon:IC.Chk,label:"Habits"},{id:"analytics",icon:IC.Bar,label:"Analytics"}].map(({id,icon:Ico,label})=>(
          <button key={id} onClick={()=>setPage(id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,background:"none",border:"none",color:page===id?"#d4a017":"#666",cursor:"pointer",fontSize:10,fontWeight:page===id?600:400,transition:"color .15s"}}>
            <Ico/><span>{label}</span>
          </button>))}
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════
// Calendar Page
// ═══════════════════════════════════════════
function CalPage({ev,hab,addEv,addRec,delEv,updEv,togBlock,isComp,comp,mob}){
  const[cur,setCur]=useState(new Date());const[view,setView]=useState(mob?"day":"week");
  const[modal,setModal]=useState(false);const[edit,setEdit]=useState(null);const[pre,setPre]=useState(null);
  const ws=sow(cur);const wd=Array.from({length:7},(_,i)=>addD(ws,i));
  const nav=(dir)=>{const d=new Date(cur);if(view==="week")d.setDate(d.getDate()+dir*7);else if(view==="day")d.setDate(d.getDate()+dir);else d.setMonth(d.getMonth()+dir);setCur(d)};
  const efd=(day)=>ev.filter(e=>e.date===dkey(day));const today=new Date();
  const dayDays=view==="day"?[cur]:wd;

  return(
    <div style={{height:mob?"calc(100vh - 64px)":"100vh",display:"flex",flexDirection:"column"}}>
      {/* Header */}
      <div style={{padding:mob?"12px 16px":"16px 28px",borderBottom:"1px solid #252525",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#141414",flexShrink:0,gap:8,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:mob?8:16,minWidth:0}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:mob?18:24,fontWeight:600,margin:0,whiteSpace:"nowrap"}}>{MONTHS[cur.getMonth()].slice(0,mob?3:99)} {cur.getFullYear()}</h2>
          <div style={{display:"flex",gap:4}}>
            <button onClick={()=>nav(-1)} style={nb}><IC.CL/></button>
            <button onClick={()=>setCur(new Date())} style={{...nb,fontSize:11,padding:"4px 8px"}}>Today</button>
            <button onClick={()=>nav(1)} style={nb}><IC.CR/></button>
          </div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <div style={{display:"flex",background:"#1e1e1e",borderRadius:8,overflow:"hidden"}}>
            {(mob?["day","week","month"]:["week","month"]).map(v=><button key={v} onClick={()=>setView(v)} style={{padding:mob?"6px 10px":"6px 16px",background:view===v?"#333":"transparent",border:"none",color:view===v?"#d4a017":"#777",cursor:"pointer",fontSize:mob?11:13,fontWeight:500,textTransform:"capitalize"}}>{v}</button>)}
          </div>
          <button onClick={()=>{setPre(null);setEdit(null);setModal(true)}} style={{display:"flex",alignItems:"center",gap:4,padding:mob?"7px 10px":"7px 16px",background:"linear-gradient(135deg,#d4a017,#b8860b)",border:"none",borderRadius:8,color:"#fff",cursor:"pointer",fontSize:mob?12:13,fontWeight:600}}>
            <IC.Plus/>{mob?"":"New Block"}
          </button>
        </div>
      </div>

      {(view==="week"||view==="day")?<WkView wd={dayDays} efd={efd} today={today} onSlot={(d,h)=>{setPre({date:dkey(d),startHour:h,endHour:Math.min(h+1,23)});setModal(true)}} onEv={e=>{setEdit(e);setModal(true)}} togBlock={togBlock} isComp={isComp} hab={hab} mob={mob}/>
      :<MoView cur={cur} ev={ev} today={today} onDay={d=>{setCur(d);setView(mob?"day":"week")}} comp={comp} mob={mob}/>}

      {modal&&<EvModal pre={pre} edit={edit} hab={hab} mob={mob}
        onClose={()=>{setModal(false);setEdit(null);setPre(null)}}
        onSave={(e,w)=>{if(edit)updEv(edit.id,e);else if(w>1)addRec(e,w);else addEv(e);setModal(false);setEdit(null);setPre(null)}}
        onDel={edit?()=>{delEv(edit.id);setModal(false);setEdit(null)}:null}/>}
    </div>
  );
}

// ═══════════════════════════════════════════
// Week/Day View
// ═══════════════════════════════════════════
function WkView({wd,efd,today,onSlot,onEv,togBlock,isComp,hab,mob}){
  const ref=useRef(null);
  useEffect(()=>{if(ref.current)ref.current.scrollTop=7*60},[]);
  const RH=mob?52:64; // row height
  const LW=mob?44:64; // label width
  return(
    <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",borderBottom:"1px solid #252525",flexShrink:0}}>
        <div style={{width:LW,flexShrink:0}}/>
        {wd.map((d,i)=>{const t=same(d,today);return(
          <div key={i} style={{flex:1,padding:mob?"6px 0":"10px 0",textAlign:"center",borderLeft:"1px solid #1e1e1e"}}>
            <div style={{fontSize:mob?10:11,color:"#666",textTransform:"uppercase",letterSpacing:1}}>{DAYS[d.getDay()]}</div>
            <div style={{fontSize:mob?16:22,fontWeight:600,marginTop:2,color:t?"#0f0f0f":"#bbb",background:t?"#d4a017":"transparent",borderRadius:"50%",width:mob?28:36,height:mob?28:36,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{d.getDate()}</div>
          </div>)})}
      </div>
      <div ref={ref} style={{flex:1,overflow:"auto",WebkitOverflowScrolling:"touch"}}>
        <div style={{position:"relative"}}>
          {HOURS.map(h=>(
            <div key={h} style={{display:"flex",height:RH,borderBottom:"1px solid #1a1a1a"}}>
              <div style={{width:LW,flexShrink:0,textAlign:"right",paddingRight:mob?6:12,fontSize:mob?9:11,color:"#555",lineHeight:"1"}}>{fmt(h)}</div>
              {wd.map((d,i)=><div key={i} onClick={()=>onSlot(d,h)} style={{flex:1,borderLeft:"1px solid #1a1a1a",cursor:"pointer",transition:"background .1s",minHeight:RH}} onMouseEnter={e=>e.currentTarget.style.background="#1a1a1a"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}/>)}
            </div>
          ))}
          {wd.map((d,di)=>efd(d).map(ev=>{
            const top=(ev.startHour+(ev.startMin||0)/60)*RH;const h=((ev.endHour+(ev.endMin||0)/60)-(ev.startHour+(ev.startMin||0)/60))*RH;
            const done=isComp(ev.id,ev.date);const lh=ev.linkedHabitId?hab.find(x=>x.id===ev.linkedHabitId):null;
            return(
              <div key={ev.id} style={{position:"absolute",top:top+1,left:`calc(${LW}px + ${di} * ((100% - ${LW}px)/${wd.length}) + 2px)`,width:`calc((100% - ${LW}px)/${wd.length} - 4px)`,height:Math.max(h-2,24),background:done?`${ev.color||"#b8860b"}77`:(ev.color||"#b8860b"),borderRadius:6,padding:mob?"3px 6px":"4px 8px",cursor:"pointer",overflow:"hidden",borderLeft:`3px solid ${done?"#4ade80":(ev.accent||"#f5c842")}`,transition:"transform .1s,box-shadow .1s",zIndex:10,opacity:done?.55:1}}
                onMouseEnter={e=>{if(!mob){e.currentTarget.style.transform="scale(1.02)";e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.4)"}}} onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="none"}}>
                <button onClick={e=>{e.stopPropagation();togBlock(ev.id,ev.date)}} style={{position:"absolute",top:mob?2:4,right:mob?2:4,background:"none",border:"none",color:done?"#4ade80":"rgba(255,255,255,.4)",cursor:"pointer",padding:2,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",zIndex:11}}>{done?<IC.CCF/>:<IC.CC/>}</button>
                <div onClick={e=>{e.stopPropagation();onEv(ev)}} style={{height:"100%"}}>
                  <div style={{fontSize:mob?10:12,fontWeight:600,color:ev.textColor||"#fff",lineHeight:1.2,textDecoration:done?"line-through":"none",opacity:done?.7:1,paddingRight:18}}>{ev.title}</div>
                  {h>28&&<div style={{fontSize:mob?8:10,color:"rgba(255,255,255,.7)",marginTop:1}}>{fmt(ev.startHour,ev.startMin)} – {fmt(ev.endHour,ev.endMin)}</div>}
                  {lh&&h>40&&<div style={{fontSize:8,marginTop:2,display:"inline-flex",alignItems:"center",gap:2,background:"rgba(0,0,0,.3)",padding:"1px 4px",borderRadius:8,color:lh.color}}><IC.Lnk/>{lh.name}</div>}
                </div>
                {done&&<div style={{position:"absolute",inset:0,pointerEvents:"none",background:"repeating-linear-gradient(135deg,transparent,transparent 6px,rgba(74,222,128,.06) 6px,rgba(74,222,128,.06) 12px)",borderRadius:6}}/>}
              </div>);}))}
          {wd.some(d=>same(d,today))&&(()=>{const now=new Date();const di=wd.findIndex(d=>same(d,today));const t=(now.getHours()+now.getMinutes()/60)*RH;return(
            <div style={{position:"absolute",top:t,left:`calc(${LW}px + ${di} * ((100% - ${LW}px)/${wd.length}))`,width:`calc((100% - ${LW}px)/${wd.length})`,zIndex:20,pointerEvents:"none"}}>
              <div style={{display:"flex",alignItems:"center"}}><div style={{width:8,height:8,borderRadius:"50%",background:"#ef4444",marginLeft:-4}}/><div style={{flex:1,height:2,background:"#ef4444"}}/></div></div>)})()}
        </div>
      </div>
    </div>);
}

// ═══════════════════════════════════════════
// Month View
// ═══════════════════════════════════════════
function MoView({cur,ev,today,onDay,comp,mob}){
  const y=cur.getFullYear(),m=cur.getMonth(),fd=new Date(y,m,1).getDay(),dm=mdays(y,m);
  const cells=[];for(let i=0;i<fd;i++)cells.push(null);for(let d=1;d<=dm;d++)cells.push(new Date(y,m,d));
  return(
    <div style={{flex:1,overflow:"auto",padding:mob?10:20,WebkitOverflowScrolling:"touch"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,background:"#1a1a1a",borderRadius:12,overflow:"hidden"}}>
        {DAYS.map(d=><div key={d} style={{background:"#161616",padding:mob?"6px 0":"10px 0",textAlign:"center",fontSize:mob?9:11,color:"#666",textTransform:"uppercase",letterSpacing:1}}>{mob?d.charAt(0):d}</div>)}
        {cells.map((d,i)=>{
          if(!d)return<div key={i} style={{background:"#0f0f0f",minHeight:mob?50:100}}/>;
          const k=dkey(d);const de=ev.filter(e=>e.date===k);const t=same(d,today);
          return(<div key={i} onClick={()=>onDay(d)} style={{background:t?"#1a1a0f":"#0f0f0f",minHeight:mob?50:100,padding:mob?4:8,cursor:"pointer",transition:"background .1s",borderTop:t?"2px solid #d4a017":"none"}}
            onMouseEnter={e=>!mob&&(e.currentTarget.style.background="#1a1a1a")} onMouseLeave={e=>!mob&&(e.currentTarget.style.background=t?"#1a1a0f":"#0f0f0f")}>
            <div style={{fontSize:mob?11:13,fontWeight:t?700:400,color:t?"#d4a017":"#888",marginBottom:mob?2:6}}>{d.getDate()}</div>
            {de.slice(0,mob?2:3).map(ev=>{const dn=!!comp[`${ev.id}_${ev.date}`];return(<div key={ev.id} style={{fontSize:mob?8:10,padding:mob?"1px 3px":"2px 6px",marginBottom:1,background:dn?`${ev.color||"#b8860b"}88`:(ev.color||"#b8860b"),borderRadius:3,color:"#fff",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",textDecoration:dn?"line-through":"none",opacity:dn?.6:1}}>{ev.title}</div>)})}
            {de.length>(mob?2:3)&&<div style={{fontSize:mob?8:10,color:"#666"}}>+{de.length-(mob?2:3)}</div>}
          </div>);})}
      </div>
    </div>);
}

// ═══════════════════════════════════════════
// Event Modal
// ═══════════════════════════════════════════
function EvModal({pre,edit,hab,onClose,onSave,onDel,mob}){
  const[title,setT]=useState(edit?.title||"");const[date,setD]=useState(edit?.date||pre?.date||dkey(new Date()));
  const[sh,setSH]=useState(edit?.startHour??pre?.startHour??9);const[sm,setSM]=useState(edit?.startMin??0);
  const[eh,setEH]=useState(edit?.endHour??pre?.endHour??10);const[em,setEM]=useState(edit?.endMin??0);
  const[ci,setCI]=useState(()=>{if(edit){const x=COLORS.findIndex(c=>c.bg===edit.color);return x>=0?x:0}return 0});
  const[wks,setWks]=useState(1);const[lhid,setLH]=useState(edit?.linkedHabitId||"");
  const[dow,setDow]=useState(()=>{const d=new Date((edit?.date||pre?.date||dkey(new Date()))+"T12:00:00");return isNaN(d.getTime())?0:d.getDay()});
  const linkH=(hid)=>{setLH(hid);if(hid){const h=hab.find(x=>x.id===hid);if(h){if(!title.trim())setT(h.name);const cm=COLORS.findIndex(c=>c.accent===h.color||c.bg===h.color);if(cm>=0)setCI(cm)}}};
  const save=()=>{if(!title.trim())return;const c=COLORS[ci];onSave({title:title.trim(),date,startHour:+sh,startMin:+sm,endHour:+eh,endMin:+em,color:c.bg,textColor:c.text,accent:c.accent,linkedHabitId:lhid||null},wks)};
  useEffect(()=>{const d=new Date(date+"T12:00:00");if(!isNaN(d.getTime()))setDow(d.getDay())},[date]);
  const is={width:"100%",padding:mob?"10px 12px":"8px 12px",background:"#1e1e1e",border:"1px solid #333",borderRadius:6,color:"#e8e4de",fontSize:mob?16:14,outline:"none",boxSizing:"border-box"};
  const ls={fontSize:12,color:"#888",marginBottom:4,display:"block",fontWeight:500};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:1000,display:"flex",alignItems:mob?"flex-end":"center",justifyContent:"center",backdropFilter:"blur(4px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#1a1a1a",borderRadius:mob?"20px 20px 0 0":16,padding:mob?"24px 20px 40px":28,width:mob?"100%":440,maxWidth:mob?"100%":440,border:mob?"none":"1px solid #333",maxHeight:mob?"85vh":"90vh",overflow:"auto",animation:"fadeIn .2s ease",WebkitOverflowScrolling:"touch"}}>
        {mob&&<div style={{width:40,height:4,borderRadius:2,background:"#444",margin:"0 auto 16px"}}/>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{margin:0,fontSize:18,fontFamily:"'Playfair Display',serif"}}>{edit?"Edit Block":"New Time Block"}</h3>
          {!mob&&<button onClick={onClose} style={{background:"none",border:"none",color:"#666",cursor:"pointer"}}><IC.X/></button>}
        </div>
        <div style={{marginBottom:14}}><label style={ls}>Title</label><input value={title} onChange={e=>setT(e.target.value)} placeholder="e.g. Deep Work, Exercise..." style={is} autoFocus={!mob}/></div>
        <div style={{marginBottom:14}}><label style={ls}>Date</label><input type="date" value={date} onChange={e=>setD(e.target.value)} style={{...is,colorScheme:"dark"}}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div><label style={ls}>Start</label><div style={{display:"flex",gap:4}}><select value={sh} onChange={e=>setSH(+e.target.value)} style={{...is,flex:1}}>{HOURS.map(h=><option key={h} value={h}>{fmt(h)}</option>)}</select><select value={sm} onChange={e=>setSM(+e.target.value)} style={{...is,width:56}}>{[0,15,30,45].map(m=><option key={m} value={m}>:{String(m).padStart(2,"0")}</option>)}</select></div></div>
          <div><label style={ls}>End</label><div style={{display:"flex",gap:4}}><select value={eh} onChange={e=>setEH(+e.target.value)} style={{...is,flex:1}}>{HOURS.map(h=><option key={h} value={h}>{fmt(h)}</option>)}</select><select value={em} onChange={e=>setEM(+e.target.value)} style={{...is,width:56}}>{[0,15,30,45].map(m=><option key={m} value={m}>:{String(m).padStart(2,"0")}</option>)}</select></div></div>
        </div>
        <div style={{marginBottom:14}}><label style={ls}>Color</label><div style={{display:"flex",gap:mob?10:8,flexWrap:"wrap"}}>{COLORS.map((c,i)=><button key={c.name} onClick={()=>setCI(i)} style={{width:mob?32:28,height:mob?32:28,borderRadius:"50%",border:ci===i?"2px solid #fff":"2px solid transparent",background:c.bg,cursor:"pointer",transition:"all .15s",transform:ci===i?"scale(1.15)":"scale(1)"}}/>)}</div></div>
        <div style={{marginBottom:14,padding:12,background:"#141414",borderRadius:10,border:lhid?"1px solid #4ade8044":"1px solid #252525"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><IC.Lnk/><label style={{...ls,margin:0,color:lhid?"#4ade80":"#888"}}>Link to Habit</label>{lhid&&<span style={{fontSize:10,background:"#4ade8022",color:"#4ade80",padding:"2px 8px",borderRadius:10,marginLeft:"auto"}}>Synced</span>}</div>
          {hab.length===0?<p style={{fontSize:12,color:"#555",margin:0}}>No habits yet</p>:
          <select value={lhid} onChange={e=>linkH(e.target.value)} style={{...is,background:"#1a1a1a"}}><option value="">None (standalone block)</option>{hab.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select>}
        </div>
        {!edit&&<div style={{marginBottom:16,padding:12,background:"#141414",borderRadius:10,border:"1px solid #252525"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><IC.Rep/><label style={{...ls,margin:0}}>Repeat every {FULL_DAYS[dow]}</label></div>
          <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13,color:"#888"}}>For</span><input type="number" min={1} max={52} value={wks} onChange={e=>setWks(Math.max(1,Math.min(52,+e.target.value)))} style={{...is,width:70,textAlign:"center"}}/><span style={{fontSize:13,color:"#888"}}>week{wks!==1?"s":""}</span></div>
        </div>}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
          {onDel&&<button onClick={onDel} style={{padding:"10px 16px",background:"#3a1a1a",border:"1px solid #5a2a2a",borderRadius:8,color:"#ef4444",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",gap:6,marginRight:"auto"}}><IC.Del/>Delete</button>}
          <button onClick={onClose} style={{padding:"10px 20px",background:"#252525",border:"none",borderRadius:8,color:"#aaa",cursor:"pointer",fontSize:13}}>Cancel</button>
          <button onClick={save} style={{padding:"10px 24px",background:"linear-gradient(135deg,#d4a017,#b8860b)",border:"none",borderRadius:8,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}>{edit?"Update":wks>1?`Create ${wks} Blocks`:"Create Block"}</button>
        </div>
      </div>
    </div>);
}

// ═══════════════════════════════════════════
// Habits Page
// ═══════════════════════════════════════════
function HabPage({hab,hLog,addHab,delHab,togHab,ev,mob}){
  const[showAdd,setAdd]=useState(false);const[nn,setNN]=useState("");const[nci,setNCI]=useState(0);const[wo,setWO]=useState(0);
  const base=new Date();base.setDate(base.getDate()+wo*7);const ws=sow(base);const days=Array.from({length:7},(_,i)=>addD(ws,i));const today=new Date();
  const doAdd=()=>{if(!nn.trim())return;addHab({name:nn.trim(),color:HCOLORS[nci]});setNN("");setNCI(0);setAdd(false)};
  return(
    <div style={{padding:mob?"16px 12px":"24px 32px",maxWidth:950}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:mob?16:28,gap:8}}>
        <div style={{minWidth:0}}><h2 style={{fontFamily:"'Playfair Display',serif",fontSize:mob?20:26,margin:0}}>Habits</h2>
          {!mob&&<p style={{color:"#666",margin:"4px 0 0",fontSize:13}}>Linked blocks sync automatically</p>}</div>
        <button onClick={()=>setAdd(true)} style={{display:"flex",alignItems:"center",gap:4,padding:mob?"8px 12px":"8px 16px",background:"linear-gradient(135deg,#d4a017,#b8860b)",border:"none",borderRadius:8,color:"#fff",cursor:"pointer",fontSize:mob?12:13,fontWeight:600,flexShrink:0}}><IC.Plus/>{mob?"Add":"Add Habit"}</button>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:mob?8:12,marginBottom:mob?12:20}}>
        <button onClick={()=>setWO(w=>w-1)} style={nb}><IC.CL/></button>
        <button onClick={()=>setWO(0)} style={{...nb,fontSize:11,padding:"4px 8px"}}>This Week</button>
        <button onClick={()=>setWO(w=>w+1)} style={nb}><IC.CR/></button>
        {!mob&&<span style={{fontSize:14,color:"#888"}}>{MONTHS[ws.getMonth()]} {ws.getDate()} – {MONTHS[addD(ws,6).getMonth()]} {addD(ws,6).getDate()}</span>}
      </div>
      {hab.length===0?<div style={{textAlign:"center",padding:"40px 20px",background:"#161616",borderRadius:16,border:"1px dashed #333"}}><p style={{fontSize:14,color:"#666"}}>No habits yet. Add your first one!</p></div>
      :<div style={{background:"#161616",borderRadius:16,overflow:"hidden",border:"1px solid #252525"}}>
        <div style={{display:"grid",gridTemplateColumns:`${mob?"100px":"220px"} repeat(7,1fr) ${mob?"32px":"40px"}`,borderBottom:"1px solid #252525"}}>
          <div style={{padding:mob?"8px":"12px 16px",fontSize:mob?10:12,color:"#666",fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Habit</div>
          {days.map((d,i)=><div key={i} style={{padding:mob?"4px 0":"8px 0",textAlign:"center",borderLeft:"1px solid #1e1e1e"}}><div style={{fontSize:mob?8:10,color:"#555",textTransform:"uppercase"}}>{mob?DAYS[d.getDay()].charAt(0):DAYS[d.getDay()]}</div><div style={{fontSize:mob?12:15,fontWeight:600,color:same(d,today)?"#d4a017":"#888"}}>{d.getDate()}</div></div>)}<div/>
        </div>
        {hab.map(h=>{const cd=days.filter(d=>hLog[`${h.id}_${dkey(d)}`]).length;const le=ev.filter(e=>e.linkedHabitId===h.id);return(
          <div key={h.id} style={{display:"grid",gridTemplateColumns:`${mob?"100px":"220px"} repeat(7,1fr) ${mob?"32px":"40px"}`,borderBottom:"1px solid #1e1e1e"}}>
            <div style={{padding:mob?"10px 8px":"14px 16px",display:"flex",alignItems:"center",gap:mob?6:10,minWidth:0}}>
              <div style={{width:mob?8:10,height:mob?8:10,borderRadius:"50%",background:h.color,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0,overflow:"hidden"}}><span style={{fontSize:mob?11:14,fontWeight:500,display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</span>
                {!mob&&le.length>0&&<span style={{fontSize:10,color:"#4ade80",display:"inline-flex",alignItems:"center",gap:3,marginTop:2}}><IC.Lnk/>{le.length} block{le.length>1?"s":""}</span>}
              </div>
              {!mob&&<span style={{fontSize:11,color:"#555"}}>{cd}/7</span>}
            </div>
            {days.map((d,i)=>{const key=`${h.id}_${dkey(d)}`;const done=hLog[key];const past=d<=today||same(d,today);return(
              <div key={i} onClick={()=>past&&togHab(h.id,dkey(d))} style={{display:"flex",alignItems:"center",justifyContent:"center",borderLeft:"1px solid #1e1e1e",cursor:past?"pointer":"default",transition:"background .15s",padding:mob?2:0}}>
                <div style={{width:mob?24:28,height:mob?24:28,borderRadius:mob?6:7,border:done?"none":"2px solid #333",background:done?h.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",transform:done?"scale(1)":"scale(.9)",opacity:past?1:.3}}>{done&&<IC.Chk/>}</div>
              </div>)})}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}><button onClick={()=>delHab(h.id)} style={{background:"none",border:"none",color:"#444",cursor:"pointer",padding:2}}><IC.Del/></button></div>
          </div>);})}
      </div>}

      {hab.length>0&&<div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(auto-fit,minmax(200px,1fr))",gap:mob?8:12,marginTop:mob?12:20}}>
        {hab.map(h=>{let s=0;const d=new Date(today);while(hLog[`${h.id}_${dkey(d)}`]){s++;d.setDate(d.getDate()-1)}return(
          <div key={h.id} style={{background:"#161616",borderRadius:12,padding:mob?12:16,border:"1px solid #252525",display:"flex",alignItems:"center",gap:mob?8:12}}>
            <div style={{width:mob?32:40,height:mob?32:40,borderRadius:mob?8:10,background:h.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:mob?16:18,fontWeight:700,color:h.color}}>{s}</div>
            <div><div style={{fontSize:mob?12:13,fontWeight:600}}>{h.name}</div><div style={{fontSize:mob?10:11,color:"#666"}}>day streak</div></div>
          </div>)})}
      </div>}

      {showAdd&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:1000,display:"flex",alignItems:mob?"flex-end":"center",justifyContent:"center",backdropFilter:"blur(4px)"}} onClick={()=>setAdd(false)}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#1a1a1a",borderRadius:mob?"20px 20px 0 0":16,padding:mob?"24px 20px 40px":28,width:mob?"100%":380,border:mob?"none":"1px solid #333",animation:"fadeIn .2s ease"}}>
          {mob&&<div style={{width:40,height:4,borderRadius:2,background:"#444",margin:"0 auto 16px"}}/>}
          <h3 style={{margin:"0 0 20px",fontSize:18,fontFamily:"'Playfair Display',serif"}}>New Habit</h3>
          <div style={{marginBottom:16}}><label style={{fontSize:12,color:"#888",marginBottom:4,display:"block"}}>Name</label><input value={nn} onChange={e=>setNN(e.target.value)} placeholder="e.g. Meditate, Read..." style={{width:"100%",padding:"12px",background:"#1e1e1e",border:"1px solid #333",borderRadius:6,color:"#e8e4de",fontSize:16,outline:"none",boxSizing:"border-box"}} autoFocus={!mob} onKeyDown={e=>e.key==="Enter"&&doAdd()}/></div>
          <div style={{marginBottom:20}}><label style={{fontSize:12,color:"#888",marginBottom:4,display:"block"}}>Color</label><div style={{display:"flex",gap:mob?10:8}}>{HCOLORS.map((c,i)=><button key={i} onClick={()=>setNCI(i)} style={{width:mob?32:28,height:mob?32:28,borderRadius:"50%",background:c,border:nci===i?"2px solid #fff":"2px solid transparent",cursor:"pointer",transform:nci===i?"scale(1.15)":"scale(1)",transition:"all .15s"}}/>)}</div></div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button onClick={()=>setAdd(false)} style={{padding:"10px 20px",background:"#252525",border:"none",borderRadius:8,color:"#aaa",cursor:"pointer",fontSize:13}}>Cancel</button>
            <button onClick={doAdd} style={{padding:"10px 24px",background:"linear-gradient(135deg,#d4a017,#b8860b)",border:"none",borderRadius:8,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}>Add Habit</button>
          </div>
        </div>
      </div>}
    </div>);
}

// ═══════════════════════════════════════════
// Analytics Page
// ═══════════════════════════════════════════
function AnaPage({ev,hab,hLog,comp,mob,signOut}){
  const today=new Date();
  const cDist=useMemo(()=>{const d={};ev.forEach(e=>{const k=e.title;const dur=(e.endHour+(e.endMin||0)/60)-(e.startHour+(e.startMin||0)/60);if(!d[k])d[k]={hours:0,color:e.color||"#b8860b",count:0,done:0};d[k].hours+=dur;d[k].count++;if(comp[`${e.id}_${e.date}`])d[k].done++});return Object.entries(d).sort((a,b)=>b[1].hours-a[1].hours)},[ev,comp]);
  const wHrs=useMemo(()=>{const w={};ev.forEach(e=>{const d=new Date(e.date+"T12:00:00");const ws=sow(d);const wk=dkey(ws);const dur=(e.endHour+(e.endMin||0)/60)-(e.startHour+(e.startMin||0)/60);w[wk]=(w[wk]||0)+dur});const s=Object.entries(w).sort((a,b)=>a[0].localeCompare(b[0])).slice(-8);const mx=Math.max(...s.map(([,v])=>v),1);return{data:s,max:mx}},[ev]);
  const hStats=useMemo(()=>hab.map(h=>{let t=0,d=0;for(let i=0;i<30;i++){t++;if(hLog[`${h.id}_${dkey(addD(today,-i))}`])d++}const lc=ev.filter(e=>e.linkedHabitId===h.id).length;return{...h,rate:t>0?d/t:0,done:d,total:t,lc}}),[hab,hLog,ev]);
  const dPat=useMemo(()=>{const t=Array(7).fill(0);ev.forEach(e=>{const d=new Date(e.date+"T12:00:00").getDay();t[d]+=(e.endHour+(e.endMin||0)/60)-(e.startHour+(e.startMin||0)/60)});const mx=Math.max(...t,1);return DAYS.map((n,i)=>({n,h:t[i],mx}))},[ev]);
  const hmap=useMemo(()=>{const wks=[];for(let w=11;w>=0;w--){const wd=[];for(let d=0;d<7;d++){const day=addD(today,-(w*7+(6-d)));let c=0;hab.forEach(h=>{if(hLog[`${h.id}_${dkey(day)}`])c++});wd.push({date:day,c,t:hab.length})}wks.push(wd)}return wks},[hab,hLog]);
  const bRate=useMemo(()=>{const t=ev.length;const c=Object.keys(comp).length;return t>0?c/t:0},[ev,comp]);
  const tH=cDist.reduce((s,[,v])=>s+v.hours,0);

  return(
    <div style={{padding:mob?"16px 12px":"24px 32px",maxWidth:1100}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:mob?16:28}}>
        <div><h2 style={{fontFamily:"'Playfair Display',serif",fontSize:mob?20:26,margin:0}}>Analytics</h2>{!mob&&<p style={{color:"#666",margin:"4px 0 0",fontSize:13}}>Insights into your time and habits</p>}</div>
        {mob&&<button onClick={signOut} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"1px solid #333",borderRadius:8,color:"#888",cursor:"pointer",fontSize:11,padding:"6px 10px"}}><IC.Out/>Sign out</button>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(auto-fit,minmax(180px,1fr))",gap:mob?8:12,marginBottom:mob?16:28}}>
        {[{l:"Blocks",v:ev.length,c:"#d4a017"},{l:"Hours",v:tH.toFixed(1),c:"#2196F3"},{l:"Done",v:(bRate*100).toFixed(0)+"%",c:"#4ade80"},{l:"Habits",v:hab.length,c:"#4caf50"}].map(x=>(<div key={x.l} style={{background:"#161616",borderRadius:mob?10:14,padding:mob?"14px":"18px 20px",border:"1px solid #252525"}}><div style={{fontSize:mob?9:11,color:"#666",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{x.l}</div><div style={{fontSize:mob?22:28,fontWeight:700,color:x.c,fontFamily:"'Playfair Display',serif"}}>{x.v}</div></div>))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:mob?12:20,marginBottom:mob?12:20}}>
        <div style={{background:"#161616",borderRadius:mob?10:14,padding:mob?14:20,border:"1px solid #252525"}}><h3 style={{margin:"0 0 12px",fontSize:mob?13:15,fontWeight:600}}>Time Distribution</h3>
          {cDist.length===0?<p style={{color:"#555",fontSize:13}}>No blocks yet</p>:<div>
            <div style={{display:"flex",borderRadius:8,overflow:"hidden",height:mob?10:14,marginBottom:12}}>{cDist.map(([n,v])=><div key={n} style={{width:`${(v.hours/tH)*100}%`,background:v.color,minWidth:4}}/>)}</div>
            {cDist.slice(0,mob?5:8).map(([n,v])=><div key={n} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><div style={{width:8,height:8,borderRadius:3,background:v.color,flexShrink:0}}/><span style={{fontSize:mob?11:13,flex:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{n}</span><span style={{fontSize:mob?10:11,color:"#4ade80"}}>{v.done}/{v.count}</span><span style={{fontSize:mob?11:13,fontWeight:600,color:v.color}}>{v.hours.toFixed(1)}h</span></div>)}</div>}
        </div>
        <div style={{background:"#161616",borderRadius:mob?10:14,padding:mob?14:20,border:"1px solid #252525"}}><h3 style={{margin:"0 0 12px",fontSize:mob?13:15,fontWeight:600}}>Weekly Hours</h3>
          {wHrs.data.length===0?<p style={{color:"#555",fontSize:13}}>No data yet</p>:
          <div style={{display:"flex",alignItems:"flex-end",gap:mob?4:8,height:mob?120:160}}>{wHrs.data.map(([wk,hrs])=>{const d=new Date(wk+"T12:00:00");return(<div key={wk} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}><div style={{fontSize:mob?9:11,color:"#888",marginBottom:4}}>{hrs.toFixed(0)}h</div><div style={{width:"100%",maxWidth:mob?24:36,height:`${(hrs/wHrs.max)*((mob?90:120))}px`,background:"linear-gradient(180deg,#d4a017,#92700c)",borderRadius:"6px 6px 0 0",minHeight:4}}/><div style={{fontSize:mob?7:9,color:"#555",marginTop:4}}>{MONTHS[d.getMonth()].slice(0,3)}</div></div>)})}</div>}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:mob?12:20,marginBottom:mob?12:20}}>
        <div style={{background:"#161616",borderRadius:mob?10:14,padding:mob?14:20,border:"1px solid #252525"}}><h3 style={{margin:"0 0 12px",fontSize:mob?13:15,fontWeight:600}}>Daily Pattern</h3>
          <div style={{display:"flex",alignItems:"flex-end",gap:mob?4:6,height:mob?80:120}}>{dPat.map(d=>(<div key={d.n} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}><div style={{fontSize:mob?8:10,color:"#888",marginBottom:4}}>{d.h.toFixed(0)}h</div><div style={{width:"100%",height:`${d.mx>0?(d.h/d.mx)*(mob?50:90):0}px`,background:d.n==="Sat"||d.n==="Sun"?"#333":"#1a6b8a",borderRadius:"4px 4px 0 0",minHeight:2}}/><div style={{fontSize:mob?8:10,color:"#666",marginTop:4}}>{mob?d.n.charAt(0):d.n}</div></div>))}</div>
        </div>
        <div style={{background:"#161616",borderRadius:mob?10:14,padding:mob?14:20,border:"1px solid #252525"}}><h3 style={{margin:"0 0 12px",fontSize:mob?13:15,fontWeight:600}}>Habit Rate (30d)</h3>
          {hStats.length===0?<p style={{color:"#555",fontSize:13}}>No habits yet</p>:<div>{hStats.map(h=>(<div key={h.id} style={{marginBottom:mob?10:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontSize:mob?11:13}}>{h.name}</span><span style={{fontSize:mob?11:12,color:h.color,fontWeight:600}}>{(h.rate*100).toFixed(0)}%</span></div>
            <div style={{height:mob?6:8,background:"#1e1e1e",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${h.rate*100}%`,background:h.color,borderRadius:4,transition:"width .4s"}}/></div></div>))}</div>}
        </div>
      </div>
      {hab.length>0&&<div style={{background:"#161616",borderRadius:mob?10:14,padding:mob?14:20,border:"1px solid #252525"}}><h3 style={{margin:"0 0 12px",fontSize:mob?13:15,fontWeight:600}}>Heatmap (12 weeks)</h3>
        <div style={{display:"flex",gap:mob?2:3,overflow:"auto",WebkitOverflowScrolling:"touch"}}>
          <div style={{display:"flex",flexDirection:"column",gap:mob?2:3,marginRight:4}}>{DAYS.map(d=><div key={d} style={{height:mob?10:14,fontSize:mob?7:9,color:"#555",display:"flex",alignItems:"center"}}>{d.charAt(0)}</div>)}</div>
          {hmap.map((wk,wi)=><div key={wi} style={{display:"flex",flexDirection:"column",gap:mob?2:3}}>{wk.map((day,di)=>{const int=day.t>0?day.c/day.t:0;return<div key={di} style={{width:mob?10:14,height:mob?10:14,borderRadius:mob?2:3,background:int===0?"#1e1e1e":int<=.33?"#2d4a1f":int<=.66?"#4a7c2e":"#6abf3b"}}/>})}</div>)}</div>
      </div>}
    </div>);
}
