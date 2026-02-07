import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth, useSyncedData } from "./useSync";

const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],FULL_DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"],HOURS=Array.from({length:24},(_,i)=>i);
const COLORS=[{n:"Amber",bg:"#b8860b",t:"#fff",a:"#d4a017"},{n:"Ocean",bg:"#1a6b8a",t:"#fff",a:"#2196F3"},{n:"Rose",bg:"#9b4d6e",t:"#fff",a:"#e91e63"},{n:"Emerald",bg:"#2d6a4f",t:"#fff",a:"#4caf50"},{n:"Violet",bg:"#5c3d8f",t:"#fff",a:"#9c27b0"},{n:"Slate",bg:"#4a5568",t:"#fff",a:"#718096"},{n:"Coral",bg:"#c0553a",t:"#fff",a:"#ff6b4a"},{n:"Teal",bg:"#0d7377",t:"#fff",a:"#14b8a6"},{n:"Crimson",bg:"#8b1a1a",t:"#fff",a:"#dc2626"},{n:"Gold",bg:"#92700c",t:"#fff",a:"#f59e0b"}];
const HC=["#d4a017","#2196F3","#e91e63","#4caf50","#9c27b0","#ff6b4a","#14b8a6","#dc2626","#f59e0b","#718096"];
const fmt=(h,m=0)=>{const ap=h>=12?"PM":"AM";const hh=h===0?12:h>12?h-12:h;return m>0?`${hh}:${String(m).padStart(2,"0")} ${ap}`:`${hh} ${ap}`};
const dk=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const sw=(d)=>{const s=new Date(d);s.setDate(s.getDate()-s.getDay());s.setHours(0,0,0,0);return s};
const ad=(d,n)=>{const r=new Date(d);r.setDate(r.getDate()+n);return r};
const sm=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
const md=(y,m)=>new Date(y,m+1,0).getDate();
const id=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
function useM(){const[m,s]=useState(window.innerWidth<768);useEffect(()=>{const h=()=>s(window.innerWidth<768);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h)},[]);return m}

// Undo system
function useUndo(){
  const[toast,setToast]=useState(null);const timer=useRef(null);
  const show=(label,undoFn)=>{if(timer.current)clearTimeout(timer.current);setToast({label,undoFn});timer.current=setTimeout(()=>setToast(null),4000)};
  const doUndo=()=>{if(toast?.undoFn)toast.undoFn();setToast(null);if(timer.current)clearTimeout(timer.current)};
  const dismiss=()=>{setToast(null);if(timer.current)clearTimeout(timer.current)};
  return{toast,show,doUndo,dismiss};
}

// Overlap detection
function getOverlaps(evs){const ol=new Set();for(let i=0;i<evs.length;i++){for(let j=i+1;j<evs.length;j++){const a=evs[i],b=evs[j];if(a.date===b.date){const as=a.startHour+(a.startMin||0)/60,ae=a.endHour+(a.endMin||0)/60,bs=b.startHour+(b.startMin||0)/60,be=b.endHour+(b.endMin||0)/60;if(as<be&&bs<ae){ol.add(a.id);ol.add(b.id)}}}}return ol}

const I={
  Cal:()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Chk:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  ChkS:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Bar:()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
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
  Focus:()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  Fire:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>,
  Star:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  Up:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>,
  Down:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
  Copy:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Clr:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6"/></svg>,
  Warn:()=><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2L1 21h22L12 2zm0 4l7.5 13h-15L12 6z"/><rect x="11" y="10" width="2" height="5"/><rect x="11" y="16" width="2" height="2"/></svg>,
};
const nb={display:"flex",alignItems:"center",justifyContent:"center",padding:"4px 8px",background:"#1e1e1e",border:"1px solid #333",borderRadius:6,color:"#aaa",cursor:"pointer"};

// ── Auth ──
function Auth(){
  const{signIn,signUp}=useAuth();const[mode,setMode]=useState("signin");const[email,setE]=useState("");const[pass,setP]=useState("");const[err,setErr]=useState("");const[msg,setMsg]=useState("");const[ld,setLd]=useState(false);
  const go=async()=>{setErr("");setMsg("");setLd(true);if(mode==="signin"){const{error:e}=await signIn(email,pass);if(e)setErr(e.message)}else{const{error:e}=await signUp(email,pass);if(e)setErr(e.message);else setMsg("Check email to confirm, then sign in!")}setLd(false)};
  return(<div style={{minHeight:"100vh",background:"#0f0f0f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",color:"#e8e4de",padding:20}}>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet"/>
    <div style={{width:"100%",maxWidth:380,padding:36,background:"#161616",borderRadius:20,border:"1px solid #252525"}}>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700,margin:"0 0 4px",background:"linear-gradient(135deg,#d4a017,#f5c842)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Chronos</h1>
      <p style={{fontSize:13,color:"#666",margin:"0 0 28px"}}>Time blocking + focus + habits</p>
      <div style={{display:"flex",background:"#1e1e1e",borderRadius:8,overflow:"hidden",marginBottom:20}}>{["signin","signup"].map(m=><button key={m} onClick={()=>{setMode(m);setErr("");setMsg("")}} style={{flex:1,padding:"10px 0",background:mode===m?"#333":"transparent",border:"none",color:mode===m?"#d4a017":"#666",cursor:"pointer",fontSize:13,fontWeight:500}}>{m==="signin"?"Sign In":"Sign Up"}</button>)}</div>
      <div style={{marginBottom:14}}><label style={{fontSize:12,color:"#888",marginBottom:4,display:"block"}}>Email</label><input value={email} onChange={e=>setE(e.target.value)} type="email" placeholder="you@email.com" style={{width:"100%",padding:"12px",background:"#1e1e1e",border:"1px solid #333",borderRadius:8,color:"#e8e4de",fontSize:16,outline:"none",boxSizing:"border-box"}} onKeyDown={e=>e.key==="Enter"&&go()}/></div>
      <div style={{marginBottom:20}}><label style={{fontSize:12,color:"#888",marginBottom:4,display:"block"}}>Password</label><input value={pass} onChange={e=>setP(e.target.value)} type="password" placeholder="••••••••" style={{width:"100%",padding:"12px",background:"#1e1e1e",border:"1px solid #333",borderRadius:8,color:"#e8e4de",fontSize:16,outline:"none",boxSizing:"border-box"}} onKeyDown={e=>e.key==="Enter"&&go()}/></div>
      {err&&<div style={{padding:"8px 12px",background:"#3a1a1a",border:"1px solid #5a2a2a",borderRadius:8,color:"#ef4444",fontSize:12,marginBottom:14}}>{err}</div>}
      {msg&&<div style={{padding:"8px 12px",background:"#1a3a1a",border:"1px solid #2a5a2a",borderRadius:8,color:"#4ade80",fontSize:12,marginBottom:14}}>{msg}</div>}
      <button onClick={go} disabled={ld} style={{width:"100%",padding:"12px 0",background:"linear-gradient(135deg,#d4a017,#b8860b)",border:"none",borderRadius:8,color:"#fff",cursor:ld?"wait":"pointer",fontSize:15,fontWeight:600,opacity:ld?.7:1}}>{ld?"...":(mode==="signin"?"Sign In":"Create Account")}</button>
    </div>
  </div>);
}

// ── Main Export ──
export default function App(){
  const{user,loading:al,signOut}=useAuth();
  if(al)return(<div style={{minHeight:"100vh",background:"#0f0f0f",display:"flex",alignItems:"center",justifyContent:"center",color:"#d4a017",fontFamily:"'Playfair Display',serif",fontSize:24}}><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&display=swap" rel="stylesheet"/>Chronos</div>);
  if(!user)return<Auth/>;
  return<Main user={user} signOut={signOut}/>;
}

function Main({user,signOut}){
  const{events,setEvents,habits,setHabits,habitLog,setHabitLog,completedBlocks:comp,setCompletedBlocks:setComp,tasks,setTasks,profile,setProfile,loaded}=useSyncedData(user);
  const[page,setPage]=useState("focus");
  const mob=useM();
  const undo=useUndo();
  const overlaps=useMemo(()=>getOverlaps(events),[events]);

  const addEv=ev=>setEvents(p=>[...p,{...ev,id:id()}]);
  const delEv=i=>{const ev=events.find(e=>e.id===i);setEvents(p=>p.filter(e=>e.id!==i));if(ev)undo.show(`Deleted "${ev.title}"`,()=>setEvents(p=>[...p,ev]))};
  const updEv=(i,pa)=>setEvents(p=>p.map(e=>e.id===i?{...e,...pa}:e));
  const dupEv=(ev)=>{const tmr=dk(ad(new Date(ev.date+"T12:00:00"),1));const ne={...ev,id:id(),date:tmr};setEvents(p=>[...p,ne]);undo.show(`Duplicated to ${tmr}`,()=>setEvents(p=>p.filter(e=>e.id!==ne.id)))};
  const addRec=(ev,w)=>{const ne=[],g=id();for(let i=0;i<w;i++){const d=new Date(ev.date+"T12:00:00");d.setDate(d.getDate()+i*7);ne.push({...ev,id:id(),date:dk(d),recurringGroup:g})}setEvents(p=>[...p,...ne])};
  const clearWeek=(weekStart)=>{const ws=dk(weekStart);const we=dk(ad(weekStart,6));const removed=events.filter(e=>e.date>=ws&&e.date<=we);if(removed.length===0)return;setEvents(p=>p.filter(e=>e.date<ws||e.date>we));undo.show(`Cleared ${removed.length} blocks`,()=>setEvents(p=>[...p,...removed]))};
  const clearPast=()=>{const t=dk(new Date());const removed=events.filter(e=>e.date<t);if(removed.length===0)return;setEvents(p=>p.filter(e=>e.date>=t));undo.show(`Cleared ${removed.length} past blocks`,()=>setEvents(p=>[...p,...removed]))};
  const addH=h=>setHabits(p=>[...p,{...h,id:id()}]);
  const delH=i=>{setHabits(p=>p.filter(h=>h.id!==i));setHabitLog(p=>{const n={...p};Object.keys(n).forEach(k=>{if(k.startsWith(i))delete n[k]});return n});setEvents(p=>p.map(e=>e.linkedHabitId===i?{...e,linkedHabitId:null}:e))};

  const tog=useCallback((eid,hid,day)=>{
    const hk=hid?`${hid}_${day}`:null,bk=eid?`${eid}_${day}`:null;
    const done=(hk&&habitLog[hk])||(bk&&comp[bk]);const nv=!done;
    if(hid)setHabitLog(p=>{const n={...p};if(nv)n[`${hid}_${day}`]=true;else delete n[`${hid}_${day}`];return n});
    if(eid)setComp(p=>{const n={...p};if(nv)n[`${eid}_${day}`]=true;else delete n[`${eid}_${day}`];return n});
    if(hid)events.forEach(ev=>{if(ev.linkedHabitId===hid&&ev.date===day&&ev.id!==eid)setComp(p=>{const n={...p};if(nv)n[`${ev.id}_${day}`]=true;else delete n[`${ev.id}_${day}`];return n})});
    if(eid&&!hid){const ev=events.find(e=>e.id===eid);if(ev?.linkedHabitId){setHabitLog(p=>{const n={...p};if(nv)n[`${ev.linkedHabitId}_${day}`]=true;else delete n[`${ev.linkedHabitId}_${day}`];return n});events.forEach(o=>{if(o.linkedHabitId===ev.linkedHabitId&&o.date===day&&o.id!==eid)setComp(p=>{const n={...p};if(nv)n[`${o.id}_${day}`]=true;else delete n[`${o.id}_${day}`];return n})})}}
  },[events,habitLog,comp]);
  const togB=useCallback((eid,day)=>{const ev=events.find(e=>e.id===eid);if(ev?.linkedHabitId)tog(eid,ev.linkedHabitId,day);else setComp(p=>{const n={...p};const k=`${eid}_${day}`;if(n[k])delete n[k];else n[k]=true;return n})},[events,tog]);
  const togH=useCallback((hid,day)=>{const le=events.find(e=>e.linkedHabitId===hid&&e.date===day);tog(le?.id||null,hid,day)},[events,tog]);
  const isC=(eid,day)=>!!comp[`${eid}_${day}`];

  if(!loaded)return(<div style={{minHeight:"100vh",background:"#0f0f0f",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=Playfair+Display:wght@600&display=swap" rel="stylesheet"/>
    <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:"#d4a017",marginBottom:16}}>Chronos</div>
    <div style={{width:200,display:"flex",flexDirection:"column",gap:8}}>
      {[.9,.7,.5].map((o,i)=><div key={i} style={{height:12,background:"#1e1e1e",borderRadius:6,opacity:o,animation:"pulse 1.5s ease infinite"}}/>)}
    </div>
    <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:.6}}`}</style>
  </div>);

  return(
    <div style={{minHeight:"100vh",maxHeight:"100vh",background:"#0f0f0f",color:"#e8e4de",fontFamily:"'DM Sans','Segoe UI',sans-serif",display:"flex",flexDirection:mob?"column":"row",overflow:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet"/>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes pop{0%{transform:scale(1)}50%{transform:scale(1.15)}100%{transform:scale(1)}}@keyframes fadeOut{to{opacity:0;transform:translateY(10px)}}*{box-sizing:border-box}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#0f0f0f}::-webkit-scrollbar-thumb{background:#333;border-radius:3px}html,body,#root{height:100%;overflow:hidden;margin:0}`}</style>

      {/* Desktop Sidebar */}
      {!mob&&<div style={{width:220,height:"100vh",background:"#161616",borderRight:"1px solid #252525",padding:"20px 0",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"0 20px 24px",borderBottom:"1px solid #252525"}}><h1 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,margin:0,background:"linear-gradient(135deg,#d4a017,#f5c842)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Chronos</h1><p style={{fontSize:11,color:"#666",margin:"4px 0 0",letterSpacing:1.5,textTransform:"uppercase"}}>Time Blocking</p></div>
        <nav style={{padding:"16px 12px",flex:1}}>
          {[{id:"focus",ic:I.Focus,lb:"Focus"},{id:"calendar",ic:I.Cal,lb:"Calendar"},{id:"habits",ic:I.Chk,lb:"Habits"}].map(({id:pid,ic:Ic,lb})=>(<button key={pid} onClick={()=>setPage(pid)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 12px",marginBottom:4,background:page===pid?"#252525":"transparent",border:"none",borderRadius:8,color:page===pid?"#d4a017":"#888",cursor:"pointer",fontSize:14,fontWeight:page===pid?600:400}}><Ic/>{lb}</button>))}
        </nav>
        <div style={{padding:"12px 20px",borderTop:"1px solid #252525"}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><I.Sync/><span style={{fontSize:10,color:"#4ade80"}}>Synced</span></div><p style={{fontSize:10,color:"#555",margin:"0 0 8px"}}>{events.length} blocks · {habits.length} habits</p><button onClick={signOut} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:"#666",cursor:"pointer",fontSize:11,padding:0}}><I.Out/>Sign out</button></div>
      </div>}

      <div style={{flex:1,overflow:"auto",height:mob?"calc(100vh - 64px)":"100vh",WebkitOverflowScrolling:"touch"}}>
        {page==="focus"&&<FocusPage tasks={tasks} setTasks={setTasks} profile={profile} setProfile={setProfile} mob={mob} signOut={mob?signOut:null}/>}
        {page==="calendar"&&<CalPage ev={events} hab={habits} addEv={addEv} addRec={addRec} delEv={delEv} updEv={updEv} dupEv={dupEv} togB={togB} isC={isC} comp={comp} mob={mob} clearWeek={clearWeek} clearPast={clearPast} overlaps={overlaps}/>}
        {page==="habits"&&<HabPage hab={habits} hLog={habitLog} addH={addH} delH={delH} togH={togH} ev={events} mob={mob}/>}
      </div>

      {/* Undo Toast */}
      {undo.toast&&<div style={{position:"fixed",bottom:mob?80:24,left:"50%",transform:"translateX(-50%)",background:"#2a2a2a",border:"1px solid #444",borderRadius:12,padding:"10px 16px",display:"flex",alignItems:"center",gap:12,zIndex:2000,animation:"slideUp .2s ease",boxShadow:"0 8px 32px rgba(0,0,0,.5)"}}>
        <span style={{fontSize:13,color:"#ccc"}}>{undo.toast.label}</span>
        <button onClick={undo.doUndo} style={{padding:"4px 12px",background:"#d4a017",border:"none",borderRadius:6,color:"#fff",cursor:"pointer",fontSize:12,fontWeight:600}}>Undo</button>
        <button onClick={undo.dismiss} style={{background:"none",border:"none",color:"#666",cursor:"pointer",padding:2}}><I.X/></button>
      </div>}

      {/* Mobile Bottom Tab */}
      {mob&&<div style={{display:"flex",background:"#161616",borderTop:"1px solid #252525",height:64,flexShrink:0,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        {[{id:"focus",ic:I.Focus,lb:"Focus"},{id:"calendar",ic:I.Cal,lb:"Calendar"},{id:"habits",ic:I.Chk,lb:"Habits"}].map(({id:pid,ic:Ic,lb})=>(<button key={pid} onClick={()=>setPage(pid)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,background:"none",border:"none",color:page===pid?"#d4a017":"#555",cursor:"pointer",fontSize:10,fontWeight:page===pid?600:400}}><Ic/><span>{lb}</span></button>))}
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════
// FOCUS PAGE — Daily priorities, one at a time
// ═══════════════════════════════════════════
function FocusPage({tasks,setTasks,profile,setProfile,mob,signOut}){
  const[input,setInput]=useState("");
  const[editInt,setEditInt]=useState(false);
  const[intDraft,setIntDraft]=useState("");
  const[showReview,setShowReview]=useState(false);
  const[reviewDraft,setReviewDraft]=useState({wins:"",goal:""});
  const today=dk(new Date());
  const isSunday=new Date().getDay()===0;
  
  // Intention
  const intention=profile.intention||"";
  const saveInt=()=>{setProfile(p=>({...p,intention:intDraft.trim()}));setEditInt(false)};

  // Weekly reviews stored as {weekKey: {wins, goal, date}}
  const reviews=profile.reviews||{};
  const thisWeekKey=dk(sw(new Date()));
  const hasReviewedThisWeek=!!reviews[thisWeekKey];

  // Get last week's review for context
  const lastWeekKey=dk(sw(ad(new Date(),-7)));
  const lastReview=reviews[lastWeekKey];

  const saveReview=()=>{
    const updated={...reviews,[thisWeekKey]:{wins:reviewDraft.wins.trim(),goal:reviewDraft.goal.trim(),date:new Date().toISOString()}};
    setProfile(p=>({...p,reviews:updated}));setShowReview(false);
  };

  // Get today's tasks, carry forward incomplete from yesterday
  const todayTasks=useMemo(()=>{
    return tasks.filter(t=>t.date===today);
  },[tasks,today]);

  // Carry forward incomplete tasks from previous days
  useEffect(()=>{
    const tt=tasks.filter(t=>t.date===today);
    if(tt.length===0){
      const prev=tasks.filter(t=>t.date<today&&!t.done);
      if(prev.length>0){
        const carried=prev.map(t=>({...t,id:id(),date:today,carriedFrom:t.id}));
        setTasks(p=>[...p,...carried]);
      }
    }
  },[today]);

  const activeTasks=todayTasks.filter(t=>!t.done);
  const doneTasks=todayTasks.filter(t=>t.done);
  const currentFocus=activeTasks[0];
  const doneCount=doneTasks.length;
  const totalCount=todayTasks.length;
  const pct=totalCount>0?Math.round((doneCount/totalCount)*100):0;

  const streak=useMemo(()=>{
    let s=0;const d=new Date();
    if(totalCount>0&&doneCount<totalCount)d.setDate(d.getDate()-1);
    else if(totalCount>0&&doneCount===totalCount)s=1;
    if(s===0)d.setDate(d.getDate()-1);
    for(let i=0;i<365;i++){
      const key=dk(d);const dayTasks=tasks.filter(t=>t.date===key);
      if(dayTasks.length===0)break;
      if(dayTasks.every(t=>t.done)){s++;d.setDate(d.getDate()-1)}else break;
    }
    return s;
  },[tasks,today,doneCount,totalCount]);

  const addTask=()=>{if(!input.trim())return;setTasks(p=>[...p,{id:id(),text:input.trim(),date:today,done:false,order:todayTasks.length}]);setInput("")};
  const toggleTask=tid=>{setTasks(p=>p.map(t=>t.id===tid?{...t,done:!t.done,doneAt:!t.done?new Date().toISOString():null}:t))};
  const deleteTask=tid=>{setTasks(p=>p.filter(t=>t.id!==tid))};
  const moveTask=(tid,dir)=>{const active=[...activeTasks];const idx=active.findIndex(t=>t.id===tid);if(idx<0)return;const ni=idx+dir;if(ni<0||ni>=active.length)return;[active[idx],active[ni]]=[active[ni],active[idx]];const ids=active.map(t=>t.id);setTasks(p=>p.map(t=>{const oi=ids.indexOf(t.id);return oi>=0?{...t,order:oi}:t}).sort((a,b)=>(a.order||0)-(b.order||0)))};

  const now=new Date();
  const greeting=now.getHours()<12?"Good morning":now.getHours()<17?"Good afternoon":"Good evening";
  const dayName=FULL_DAYS[now.getDay()];

  return(
    <div style={{padding:mob?"20px 16px":"32px 40px",maxWidth:700,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:mob?12:20}}>
        <div>
          <p style={{fontSize:mob?12:13,color:"#666",margin:"0 0 4px"}}>{greeting} — {dayName}</p>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:mob?24:32,fontWeight:700,margin:0}}>Today's Focus</h2>
        </div>
        {mob&&signOut&&<button onClick={signOut} style={{background:"none",border:"1px solid #333",borderRadius:8,color:"#888",cursor:"pointer",fontSize:10,padding:"6px 10px",display:"flex",alignItems:"center",gap:4}}><I.Out/>Sign out</button>}
      </div>

      {/* Intention / Mantra */}
      {!editInt?
        <div onClick={()=>{setIntDraft(intention);setEditInt(true)}} style={{marginBottom:mob?16:24,cursor:"pointer",padding:mob?"10px 14px":"12px 20px",background:intention?"transparent":"#161616",border:intention?"1px solid #252525":"1px dashed #333",borderRadius:12,transition:"all .15s"}}>
          {intention?
            <p style={{margin:0,fontSize:mob?14:16,color:"#d4a017",fontStyle:"italic",fontFamily:"'Playfair Display',serif",fontWeight:400,lineHeight:1.4}}>"{intention}"</p>
            :<p style={{margin:0,fontSize:mob?12:13,color:"#555"}}>Tap to set your intention — a mantra or weekly theme that anchors your decisions</p>}
        </div>
        :<div style={{marginBottom:mob?16:24,padding:mob?"12px":"16px",background:"#161616",border:"1px solid #d4a01744",borderRadius:12}}>
          <label style={{fontSize:11,color:"#d4a017",textTransform:"uppercase",letterSpacing:1,marginBottom:8,display:"block"}}>Your Intention</label>
          <input value={intDraft} onChange={e=>setIntDraft(e.target.value)} placeholder="e.g. Ship fast, iterate later" autoFocus style={{width:"100%",padding:"10px 0",background:"transparent",border:"none",borderBottom:"1px solid #333",color:"#e8e4de",fontSize:mob?15:17,outline:"none",fontFamily:"'Playfair Display',serif",fontStyle:"italic",boxSizing:"border-box"}} onKeyDown={e=>{if(e.key==="Enter")saveInt();if(e.key==="Escape"){setEditInt(false)}}}/>
          <div style={{display:"flex",gap:8,marginTop:10,justifyContent:"flex-end"}}>
            <button onClick={()=>setEditInt(false)} style={{padding:"6px 14px",background:"#252525",border:"none",borderRadius:6,color:"#888",cursor:"pointer",fontSize:12}}>Cancel</button>
            <button onClick={saveInt} style={{padding:"6px 14px",background:"#d4a017",border:"none",borderRadius:6,color:"#fff",cursor:"pointer",fontSize:12,fontWeight:600}}>Save</button>
          </div>
        </div>}

      {/* Sunday Weekly Review Prompt */}
      {isSunday&&!hasReviewedThisWeek&&!showReview&&<div onClick={()=>{setReviewDraft({wins:"",goal:""});setShowReview(true)}} style={{marginBottom:mob?16:24,padding:mob?"14px":"18px",background:"linear-gradient(135deg,#1a1a2a,#161616)",border:"1px solid #5c3d8f44",borderRadius:14,cursor:"pointer"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
          <span style={{fontSize:16}}>📋</span>
          <span style={{fontSize:12,color:"#9c27b0",textTransform:"uppercase",letterSpacing:1,fontWeight:600}}>Weekly Review</span>
        </div>
        <p style={{margin:0,fontSize:mob?13:14,color:"#aaa"}}>Take 5 minutes to reflect on your week and set your direction for next week.</p>
      </div>}

      {/* Show last week's review on non-Sundays for context */}
      {!isSunday&&lastReview&&<div style={{marginBottom:mob?12:16,padding:mob?"10px 12px":"12px 16px",background:"#161616",border:"1px solid #252525",borderRadius:10}}>
        <div style={{fontSize:10,color:"#9c27b0",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>This Week's Goal</div>
        <p style={{margin:0,fontSize:mob?13:14,color:"#ccc"}}>{lastReview.goal||"—"}</p>
      </div>}

      {/* Completed review badge */}
      {isSunday&&hasReviewedThisWeek&&!showReview&&<div style={{marginBottom:mob?12:16,padding:mob?"10px 12px":"12px 16px",background:"#161616",border:"1px solid #252525",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{color:"#4ade80"}}>✓</span>
          <span style={{fontSize:12,color:"#888"}}>Weekly review complete</span>
        </div>
        <button onClick={()=>{const r=reviews[thisWeekKey];setReviewDraft({wins:r?.wins||"",goal:r?.goal||""});setShowReview(true)}} style={{fontSize:11,color:"#666",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Edit</button>
      </div>}

      {/* Stats row */}
      <div style={{display:"flex",gap:mob?8:12,marginBottom:mob?16:24}}>
        <div style={{flex:1,background:"#161616",borderRadius:12,padding:mob?"12px":"16px",border:"1px solid #252525",textAlign:"center"}}>
          <div style={{fontSize:mob?24:32,fontWeight:700,color:pct===100?"#4ade80":"#d4a017",fontFamily:"'Playfair Display',serif"}}>{pct}%</div>
          <div style={{fontSize:mob?9:11,color:"#666",textTransform:"uppercase",letterSpacing:1}}>Done</div>
        </div>
        <div style={{flex:1,background:"#161616",borderRadius:12,padding:mob?"12px":"16px",border:"1px solid #252525",textAlign:"center"}}>
          <div style={{fontSize:mob?24:32,fontWeight:700,color:"#f59e0b",fontFamily:"'Playfair Display',serif",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>{streak}<I.Fire/></div>
          <div style={{fontSize:mob?9:11,color:"#666",textTransform:"uppercase",letterSpacing:1}}>Streak</div>
        </div>
        <div style={{flex:1,background:"#161616",borderRadius:12,padding:mob?"12px":"16px",border:"1px solid #252525",textAlign:"center"}}>
          <div style={{fontSize:mob?24:32,fontWeight:700,color:"#2196F3",fontFamily:"'Playfair Display',serif"}}>{activeTasks.length}</div>
          <div style={{fontSize:mob?9:11,color:"#666",textTransform:"uppercase",letterSpacing:1}}>Left</div>
        </div>
      </div>

      {/* Current Focus Highlight */}
      {currentFocus&&<div style={{background:"linear-gradient(135deg,#1a1a0f,#161616)",border:"1px solid #d4a01744",borderRadius:16,padding:mob?"16px":"24px",marginBottom:mob?16:24}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <I.Star/><span style={{fontSize:11,color:"#d4a017",textTransform:"uppercase",letterSpacing:1.5,fontWeight:600}}>Current Focus</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>toggleTask(currentFocus.id)} style={{width:mob?36:40,height:mob?36:40,borderRadius:"50%",border:"2px solid #d4a017",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#d4a017",flexShrink:0}}><I.Chk/></button>
          <span style={{fontSize:mob?18:22,fontWeight:600,fontFamily:"'Playfair Display',serif"}}>{currentFocus.text}</span>
        </div>
      </div>}

      {/* All done */}
      {totalCount>0&&activeTasks.length===0&&<div style={{background:"#1a2a1a",border:"1px solid #2a5a2a",borderRadius:16,padding:mob?"20px":"32px",marginBottom:mob?16:24,textAlign:"center"}}>
        <div style={{fontSize:mob?28:36,marginBottom:8}}>✓</div>
        <div style={{fontSize:mob?18:22,fontWeight:700,color:"#4ade80",fontFamily:"'Playfair Display',serif",marginBottom:4}}>All tasks complete</div>
        <div style={{fontSize:13,color:"#666"}}>You crushed it today. Rest or push further.</div>
      </div>}

      {/* Add task */}
      <div style={{display:"flex",gap:8,marginBottom:mob?16:24}}>
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder={totalCount===0?"What's your #1 priority today?":"Add another priority..."} onKeyDown={e=>e.key==="Enter"&&addTask()} style={{flex:1,padding:mob?"12px":"12px 16px",background:"#161616",border:"1px solid #252525",borderRadius:10,color:"#e8e4de",fontSize:mob?15:16,outline:"none"}}/>
        <button onClick={addTask} style={{padding:"0 16px",background:"linear-gradient(135deg,#d4a017,#b8860b)",border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontSize:14,fontWeight:600,display:"flex",alignItems:"center"}}><I.Plus/></button>
      </div>

      {/* Up Next */}
      {activeTasks.length>1&&<div style={{marginBottom:mob?16:24}}>
        <p style={{fontSize:11,color:"#555",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Up Next</p>
        {activeTasks.slice(1).map((t,i)=>(
          <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:mob?"10px 12px":"12px 16px",background:"#161616",borderRadius:10,marginBottom:6,border:"1px solid #1e1e1e"}}>
            <button onClick={()=>toggleTask(t.id)} style={{width:24,height:24,borderRadius:"50%",border:"2px solid #444",background:"none",cursor:"pointer",flexShrink:0}}/>
            <span style={{flex:1,fontSize:mob?14:15,color:"#bbb"}}>{t.text}</span>
            <div style={{display:"flex",gap:2}}>
              <button onClick={()=>moveTask(t.id,-1)} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:2}}><I.Up/></button>
              <button onClick={()=>moveTask(t.id,1)} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:2}}><I.Down/></button>
              <button onClick={()=>deleteTask(t.id)} style={{background:"none",border:"none",color:"#444",cursor:"pointer",padding:2}}><I.Del/></button>
            </div>
          </div>
        ))}
      </div>}

      {/* Completed */}
      {doneTasks.length>0&&<div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <p style={{fontSize:11,color:"#555",textTransform:"uppercase",letterSpacing:1,margin:0}}>Completed ({doneTasks.length})</p>
          <button onClick={()=>{const ids=doneTasks.map(t=>t.id);setTasks(p=>p.filter(t=>!ids.includes(t.id)))}} style={{fontSize:10,color:"#555",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Clear all</button>
        </div>
        {doneTasks.map(t=>(
          <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:mob?"8px 12px":"10px 16px",marginBottom:4,borderRadius:8}}>
            <button onClick={()=>toggleTask(t.id)} style={{width:22,height:22,borderRadius:"50%",border:"none",background:"#4ade80",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#0f0f0f"}}><I.ChkS/></button>
            <span style={{fontSize:mob?13:14,color:"#555",textDecoration:"line-through"}}>{t.text}</span>
          </div>
        ))}
      </div>}

      {totalCount===0&&<div style={{textAlign:"center",padding:"40px 20px",color:"#444"}}>
        <div style={{fontSize:mob?16:18,marginBottom:8,fontFamily:"'Playfair Display',serif"}}>What matters most today?</div>
        <p style={{fontSize:13,color:"#555"}}>Add your top priorities above. Focus on #1 until it's done.</p>
      </div>}

      {/* Weekly Review Modal */}
      {showReview&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:1000,display:"flex",alignItems:mob?"flex-end":"center",justifyContent:"center",backdropFilter:"blur(4px)"}} onClick={()=>setShowReview(false)}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#1a1a1a",borderRadius:mob?"20px 20px 0 0":16,padding:mob?"24px 20px 40px":"32px",width:mob?"100%":500,border:mob?"none":"1px solid #333",maxHeight:mob?"90vh":"85vh",overflow:"auto",animation:"fadeIn .2s ease"}}>
          {mob&&<div style={{width:40,height:4,borderRadius:2,background:"#444",margin:"0 auto 16px"}}/>}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:24}}>
            <span style={{fontSize:24}}>📋</span>
            <div>
              <h3 style={{margin:0,fontSize:mob?20:24,fontFamily:"'Playfair Display',serif"}}>Weekly Review</h3>
              <p style={{margin:"2px 0 0",fontSize:12,color:"#666"}}>5 minutes that compound into massive results</p>
            </div>
          </div>

          <div style={{marginBottom:20}}>
            <label style={{fontSize:12,color:"#d4a017",textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:8,fontWeight:600}}>What were your 3 wins this week?</label>
            <p style={{fontSize:11,color:"#555",margin:"0 0 8px"}}>Big or small — what did you accomplish, learn, or move forward?</p>
            <textarea value={reviewDraft.wins} onChange={e=>setReviewDraft(p=>({...p,wins:e.target.value}))} placeholder={"1. \n2. \n3. "} rows={4} style={{width:"100%",padding:"12px",background:"#161616",border:"1px solid #333",borderRadius:10,color:"#e8e4de",fontSize:mob?15:15,outline:"none",resize:"vertical",fontFamily:"'DM Sans',sans-serif",boxSizing:"border-box",lineHeight:1.6}}/>
          </div>

          <div style={{marginBottom:24}}>
            <label style={{fontSize:12,color:"#2196F3",textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:8,fontWeight:600}}>What's your #1 goal for next week?</label>
            <p style={{fontSize:11,color:"#555",margin:"0 0 8px"}}>One goal. The thing that, if done, makes everything else easier or unnecessary.</p>
            <input value={reviewDraft.goal} onChange={e=>setReviewDraft(p=>({...p,goal:e.target.value}))} placeholder="e.g. Finish the proposal draft" style={{width:"100%",padding:"12px",background:"#161616",border:"1px solid #333",borderRadius:10,color:"#e8e4de",fontSize:mob?15:16,outline:"none",boxSizing:"border-box"}} onKeyDown={e=>e.key==="Enter"&&reviewDraft.goal.trim()&&saveReview()}/>
          </div>

          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button onClick={()=>setShowReview(false)} style={{padding:"10px 20px",background:"#252525",border:"none",borderRadius:8,color:"#aaa",cursor:"pointer",fontSize:13}}>Cancel</button>
            <button onClick={saveReview} style={{padding:"10px 24px",background:"linear-gradient(135deg,#d4a017,#b8860b)",border:"none",borderRadius:8,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}>Save Review</button>
          </div>
        </div>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════
// CALENDAR PAGE
// ═══════════════════════════════════════════
function CalPage({ev,hab,addEv,addRec,delEv,updEv,dupEv,togB,isC,comp,mob,clearWeek,clearPast,overlaps}){
  const[cur,setCur]=useState(new Date());const[view,setView]=useState(mob?"day":"week");
  const[modal,setModal]=useState(false);const[edit,setEdit]=useState(null);const[pre,setPre]=useState(null);
  const[menu,setMenu]=useState(false);
  const ws=sw(cur);const wd=Array.from({length:7},(_,i)=>ad(ws,i));
  const nav=dir=>{const d=new Date(cur);if(view==="week")d.setDate(d.getDate()+dir*7);else if(view==="day")d.setDate(d.getDate()+dir);else d.setMonth(d.getMonth()+dir);setCur(d)};
  const efd=day=>ev.filter(e=>e.date===dk(day));const today=new Date();
  const dayDays=view==="day"?[cur]:wd;
  const weekBlockCount=wd.reduce((s,d)=>s+efd(d).length,0);
  return(
    <div style={{height:mob?"calc(100vh - 64px)":"100vh",display:"flex",flexDirection:"column"}}>
      <div style={{padding:mob?"10px 12px":"16px 28px",borderBottom:"1px solid #252525",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#141414",flexShrink:0,gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:mob?6:16}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:mob?16:24,fontWeight:600,margin:0,whiteSpace:"nowrap"}}>{MONTHS[cur.getMonth()].slice(0,mob?3:99)} {cur.getFullYear()}</h2>
          <div style={{display:"flex",gap:4}}><button onClick={()=>nav(-1)} style={nb}><I.CL/></button><button onClick={()=>setCur(new Date())} style={{...nb,fontSize:11,padding:"4px 8px"}}>Today</button><button onClick={()=>nav(1)} style={nb}><I.CR/></button></div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",position:"relative"}}>
          <div style={{display:"flex",background:"#1e1e1e",borderRadius:8,overflow:"hidden"}}>{(mob?["day","week","month"]:["week","month"]).map(v=><button key={v} onClick={()=>setView(v)} style={{padding:mob?"6px 8px":"6px 16px",background:view===v?"#333":"transparent",border:"none",color:view===v?"#d4a017":"#777",cursor:"pointer",fontSize:mob?11:13,fontWeight:500,textTransform:"capitalize"}}>{v}</button>)}</div>
          <button onClick={()=>{setPre(null);setEdit(null);setModal(true)}} style={{display:"flex",alignItems:"center",gap:4,padding:mob?"7px 10px":"7px 16px",background:"linear-gradient(135deg,#d4a017,#b8860b)",border:"none",borderRadius:8,color:"#fff",cursor:"pointer",fontSize:mob?12:13,fontWeight:600}}><I.Plus/></button>
          <button onClick={()=>setMenu(!menu)} style={{...nb,padding:"6px 8px"}}><I.Clr/></button>
          {menu&&<div style={{position:"absolute",top:"100%",right:0,marginTop:8,background:"#1e1e1e",border:"1px solid #333",borderRadius:10,padding:6,zIndex:100,minWidth:180,animation:"fadeIn .15s ease"}}>
            <button onClick={()=>{clearWeek(ws);setMenu(false)}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"10px 12px",background:"none",border:"none",borderRadius:6,color:"#e8e4de",cursor:"pointer",fontSize:13,textAlign:"left"}} onMouseEnter={e=>e.currentTarget.style.background="#2a2a2a"} onMouseLeave={e=>e.currentTarget.style.background="none"}><I.Del/>Clear this week ({weekBlockCount})</button>
            <button onClick={()=>{clearPast();setMenu(false)}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"10px 12px",background:"none",border:"none",borderRadius:6,color:"#e8e4de",cursor:"pointer",fontSize:13,textAlign:"left"}} onMouseEnter={e=>e.currentTarget.style.background="#2a2a2a"} onMouseLeave={e=>e.currentTarget.style.background="none"}><I.Clr/>Clear all past blocks</button>
          </div>}
        </div>
      </div>
      {(view==="week"||view==="day")?<WkView wd={dayDays} efd={efd} today={today} onSlot={(d,h)=>{setPre({date:dk(d),startHour:h,endHour:Math.min(h+1,23)});setModal(true)}} onEv={e=>{setEdit(e);setModal(true)}} togB={togB} isC={isC} hab={hab} mob={mob} overlaps={overlaps}/>
      :<MoView cur={cur} ev={ev} today={today} onDay={d=>{setCur(d);setView(mob?"day":"week")}} comp={comp} mob={mob}/>}
      {modal&&<EvModal pre={pre} edit={edit} hab={hab} mob={mob} onClose={()=>{setModal(false);setEdit(null);setPre(null)}} onSave={(e,w)=>{if(edit)updEv(edit.id,e);else if(w>1)addRec(e,w);else addEv(e);setModal(false);setEdit(null);setPre(null)}} onDel={edit?()=>{delEv(edit.id);setModal(false);setEdit(null)}:null} onDup={edit?()=>{dupEv(edit);setModal(false);setEdit(null)}:null}/>}
      {menu&&<div style={{position:"fixed",inset:0,zIndex:99}} onClick={()=>setMenu(false)}/>}
    </div>);
}

// ═══════════════════════════════════════════
// WEEK VIEW
// ═══════════════════════════════════════════
function WkView({wd,efd,today,onSlot,onEv,togB,isC,hab,mob,overlaps}){
  const ref=useRef(null);useEffect(()=>{if(ref.current)ref.current.scrollTop=7*60},[]);
  const RH=mob?52:64,LW=mob?40:64;
  return(<div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <div style={{display:"flex",borderBottom:"1px solid #252525",flexShrink:0}}><div style={{width:LW,flexShrink:0}}/>
      {wd.map((d,i)=>{const t=sm(d,today);return(<div key={i} style={{flex:1,padding:mob?"4px 0":"10px 0",textAlign:"center",borderLeft:"1px solid #1e1e1e"}}><div style={{fontSize:mob?9:11,color:"#666",textTransform:"uppercase"}}>{DAYS[d.getDay()]}</div><div style={{fontSize:mob?15:22,fontWeight:600,marginTop:1,color:t?"#0f0f0f":"#bbb",background:t?"#d4a017":"transparent",borderRadius:"50%",width:mob?26:36,height:mob?26:36,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{d.getDate()}</div></div>)})}</div>
    <div ref={ref} style={{flex:1,overflow:"auto",WebkitOverflowScrolling:"touch"}}><div style={{position:"relative"}}>
      {HOURS.map(h=>(<div key={h} style={{display:"flex",height:RH,borderBottom:"1px solid #1a1a1a"}}><div style={{width:LW,flexShrink:0,textAlign:"right",paddingRight:mob?4:12,fontSize:mob?8:11,color:"#555"}}>{fmt(h)}</div>{wd.map((d,i)=><div key={i} onClick={()=>onSlot(d,h)} style={{flex:1,borderLeft:"1px solid #1a1a1a",cursor:"pointer",transition:"background .1s"}} onMouseEnter={e=>e.currentTarget.style.background="#1a1a1a"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}/>)}</div>))}
      {wd.map((d,di)=>efd(d).map(ev=>{const top=(ev.startHour+(ev.startMin||0)/60)*RH;const h=((ev.endHour+(ev.endMin||0)/60)-(ev.startHour+(ev.startMin||0)/60))*RH;const done=isC(ev.id,ev.date);const lh=ev.linkedHabitId?hab.find(x=>x.id===ev.linkedHabitId):null;const hasOL=overlaps.has(ev.id);
        return(<div key={ev.id} style={{position:"absolute",top:top+1,left:`calc(${LW}px + ${di} * ((100% - ${LW}px)/${wd.length}) + 2px)`,width:`calc((100% - ${LW}px)/${wd.length} - 4px)`,height:Math.max(h-2,22),background:done?`${ev.color||"#b8860b"}77`:(ev.color||"#b8860b"),borderRadius:6,padding:mob?"2px 5px":"4px 8px",cursor:"pointer",overflow:"hidden",borderLeft:`3px solid ${hasOL?"#ef4444":done?"#4ade80":(ev.accent||"#f5c842")}`,zIndex:10,opacity:done?.55:1,animation:"slideUp .2s ease"}}>
          <button onClick={e=>{e.stopPropagation();togB(ev.id,ev.date)}} style={{position:"absolute",top:2,right:2,background:"none",border:"none",color:done?"#4ade80":"rgba(255,255,255,.4)",cursor:"pointer",padding:1,display:"flex",zIndex:11}}>{done?<I.CCF/>:<I.CC/>}</button>
          {hasOL&&<div style={{position:"absolute",top:2,right:mob?18:20,color:"#ef4444",display:"flex"}} title="Overlapping"><I.Warn/></div>}
          <div onClick={e=>{e.stopPropagation();onEv(ev)}} style={{height:"100%"}}><div style={{fontSize:mob?9:12,fontWeight:600,color:ev.textColor||"#fff",textDecoration:done?"line-through":"none",opacity:done?.7:1,paddingRight:hasOL?28:16,lineHeight:1.1}}>{ev.title}</div>
            {h>26&&<div style={{fontSize:mob?7:10,color:"rgba(255,255,255,.6)",marginTop:1}}>{fmt(ev.startHour,ev.startMin)}–{fmt(ev.endHour,ev.endMin)}</div>}
            {lh&&h>38&&<div style={{fontSize:7,marginTop:1,display:"inline-flex",alignItems:"center",gap:2,background:"rgba(0,0,0,.3)",padding:"0 4px",borderRadius:8,color:lh.color}}><I.Lnk/>{lh.name}</div>}
          </div></div>)}))}
      {wd.some(d=>sm(d,today))&&(()=>{const now=new Date(),di=wd.findIndex(d=>sm(d,today)),t=(now.getHours()+now.getMinutes()/60)*RH;return(<div style={{position:"absolute",top:t,left:`calc(${LW}px + ${di} * ((100% - ${LW}px)/${wd.length}))`,width:`calc((100% - ${LW}px)/${wd.length})`,zIndex:20,pointerEvents:"none"}}><div style={{display:"flex",alignItems:"center"}}><div style={{width:8,height:8,borderRadius:"50%",background:"#ef4444",marginLeft:-4}}/><div style={{flex:1,height:2,background:"#ef4444"}}/></div></div>)})()}
    </div></div></div>);
}

// ═══════════════════════════════════════════
// MONTH VIEW
// ═══════════════════════════════════════════
function MoView({cur,ev,today,onDay,comp,mob}){
  const y=cur.getFullYear(),m=cur.getMonth(),fd=new Date(y,m,1).getDay(),dm=md(y,m);
  const cells=[];for(let i=0;i<fd;i++)cells.push(null);for(let d=1;d<=dm;d++)cells.push(new Date(y,m,d));
  return(<div style={{flex:1,overflow:"auto",padding:mob?8:20,WebkitOverflowScrolling:"touch"}}><div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,background:"#1a1a1a",borderRadius:12,overflow:"hidden"}}>
    {DAYS.map(d=><div key={d} style={{background:"#161616",padding:mob?"6px 0":"10px 0",textAlign:"center",fontSize:mob?9:11,color:"#666",textTransform:"uppercase"}}>{mob?d.charAt(0):d}</div>)}
    {cells.map((d,i)=>{if(!d)return<div key={i} style={{background:"#0f0f0f",minHeight:mob?48:100}}/>;const k=dk(d),de=ev.filter(e=>e.date===k),t=sm(d,today);
      return(<div key={i} onClick={()=>onDay(d)} style={{background:t?"#1a1a0f":"#0f0f0f",minHeight:mob?48:100,padding:mob?3:8,cursor:"pointer",borderTop:t?"2px solid #d4a017":"none"}}><div style={{fontSize:mob?11:13,fontWeight:t?700:400,color:t?"#d4a017":"#888",marginBottom:mob?1:6}}>{d.getDate()}</div>
        {de.slice(0,mob?1:3).map(ev=>{const dn=!!comp[`${ev.id}_${ev.date}`];return(<div key={ev.id} style={{fontSize:mob?7:10,padding:mob?"1px 2px":"2px 6px",marginBottom:1,background:dn?`${ev.color||"#b8860b"}88`:(ev.color||"#b8860b"),borderRadius:2,color:"#fff",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",opacity:dn?.6:1}}>{ev.title}</div>)})}
        {de.length>(mob?1:3)&&<div style={{fontSize:mob?7:10,color:"#666"}}>+{de.length-(mob?1:3)}</div>}
      </div>)})}
  </div></div>);
}

// ═══════════════════════════════════════════
// EVENT MODAL
// ═══════════════════════════════════════════
function EvModal({pre,edit,hab,onClose,onSave,onDel,onDup,mob}){
  const[title,setT]=useState(edit?.title||"");const[date,setD]=useState(edit?.date||pre?.date||dk(new Date()));
  const[sh,setSH]=useState(edit?.startHour??pre?.startHour??9);const[sm2,setSM]=useState(edit?.startMin??0);
  const[eh,setEH]=useState(edit?.endHour??pre?.endHour??10);const[em2,setEM]=useState(edit?.endMin??0);
  const[ci,setCI]=useState(()=>{if(edit){const x=COLORS.findIndex(c=>c.bg===edit.color);return x>=0?x:0}return 0});
  const[wks,setWks]=useState(1);const[lhid,setLH]=useState(edit?.linkedHabitId||"");
  const[dow,setDow]=useState(()=>{const d=new Date((edit?.date||pre?.date||dk(new Date()))+"T12:00:00");return isNaN(d.getTime())?0:d.getDay()});
  const linkH=hid=>{setLH(hid);if(hid){const h=hab.find(x=>x.id===hid);if(h){if(!title.trim())setT(h.name);const cm=COLORS.findIndex(c=>c.a===h.color||c.bg===h.color);if(cm>=0)setCI(cm)}}};
  const save=()=>{if(!title.trim())return;const c=COLORS[ci];onSave({title:title.trim(),date,startHour:+sh,startMin:+sm2,endHour:+eh,endMin:+em2,color:c.bg,textColor:c.t,accent:c.a,linkedHabitId:lhid||null},wks)};
  useEffect(()=>{const d=new Date(date+"T12:00:00");if(!isNaN(d.getTime()))setDow(d.getDay())},[date]);
  const is={width:"100%",padding:mob?"10px":"8px 12px",background:"#1e1e1e",border:"1px solid #333",borderRadius:6,color:"#e8e4de",fontSize:mob?16:14,outline:"none",boxSizing:"border-box"};
  const ls={fontSize:12,color:"#888",marginBottom:4,display:"block",fontWeight:500};
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:1000,display:"flex",alignItems:mob?"flex-end":"center",justifyContent:"center",backdropFilter:"blur(4px)"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#1a1a1a",borderRadius:mob?"20px 20px 0 0":16,padding:mob?"20px 16px 36px":28,width:mob?"100%":440,border:mob?"none":"1px solid #333",maxHeight:mob?"85vh":"90vh",overflow:"auto",animation:"fadeIn .2s ease",WebkitOverflowScrolling:"touch"}}>
      {mob&&<div style={{width:40,height:4,borderRadius:2,background:"#444",margin:"0 auto 12px"}}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h3 style={{margin:0,fontSize:18,fontFamily:"'Playfair Display',serif"}}>{edit?"Edit Block":"New Block"}</h3>{!mob&&<button onClick={onClose} style={{background:"none",border:"none",color:"#666",cursor:"pointer"}}><I.X/></button>}</div>
      <div style={{marginBottom:12}}><label style={ls}>Title</label><input value={title} onChange={e=>setT(e.target.value)} placeholder="e.g. Deep Work..." style={is} autoFocus={!mob}/></div>
      <div style={{marginBottom:12}}><label style={ls}>Date</label><input type="date" value={date} onChange={e=>setD(e.target.value)} style={{...is,colorScheme:"dark"}}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <div><label style={ls}>Start</label><div style={{display:"flex",gap:4}}><select value={sh} onChange={e=>setSH(+e.target.value)} style={{...is,flex:1}}>{HOURS.map(h=><option key={h} value={h}>{fmt(h)}</option>)}</select><select value={sm2} onChange={e=>setSM(+e.target.value)} style={{...is,width:52}}>{[0,15,30,45].map(m=><option key={m} value={m}>:{String(m).padStart(2,"0")}</option>)}</select></div></div>
        <div><label style={ls}>End</label><div style={{display:"flex",gap:4}}><select value={eh} onChange={e=>setEH(+e.target.value)} style={{...is,flex:1}}>{HOURS.map(h=><option key={h} value={h}>{fmt(h)}</option>)}</select><select value={em2} onChange={e=>setEM(+e.target.value)} style={{...is,width:52}}>{[0,15,30,45].map(m=><option key={m} value={m}>:{String(m).padStart(2,"0")}</option>)}</select></div></div>
      </div>
      <div style={{marginBottom:12}}><label style={ls}>Color</label><div style={{display:"flex",gap:mob?8:8,flexWrap:"wrap"}}>{COLORS.map((c,i)=><button key={c.n} onClick={()=>setCI(i)} style={{width:mob?30:28,height:mob?30:28,borderRadius:"50%",border:ci===i?"2px solid #fff":"2px solid transparent",background:c.bg,cursor:"pointer",transform:ci===i?"scale(1.15)":"scale(1)"}}/>)}</div></div>
      <div style={{marginBottom:12,padding:10,background:"#141414",borderRadius:10,border:lhid?"1px solid #4ade8044":"1px solid #252525"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><I.Lnk/><label style={{...ls,margin:0,color:lhid?"#4ade80":"#888"}}>Link to Habit</label></div>
        {hab.length===0?<p style={{fontSize:12,color:"#555",margin:0}}>No habits yet</p>:<select value={lhid} onChange={e=>linkH(e.target.value)} style={{...is,background:"#1a1a1a"}}><option value="">None</option>{hab.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select>}
      </div>
      {!edit&&<div style={{marginBottom:14,padding:10,background:"#141414",borderRadius:10,border:"1px solid #252525"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><I.Rep/><label style={{...ls,margin:0}}>Repeat {FULL_DAYS[dow]}</label></div>
        <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13,color:"#888"}}>For</span><input type="number" min={1} max={52} value={wks} onChange={e=>setWks(Math.max(1,Math.min(52,+e.target.value)))} style={{...is,width:60,textAlign:"center"}}/><span style={{fontSize:13,color:"#888"}}>wk{wks!==1?"s":""}</span></div>
      </div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        {onDel&&<button onClick={onDel} style={{padding:"10px 14px",background:"#3a1a1a",border:"1px solid #5a2a2a",borderRadius:8,color:"#ef4444",cursor:"pointer",fontSize:13,marginRight:"auto"}}><I.Del/></button>}
        {onDup&&<button onClick={onDup} style={{padding:"10px 14px",background:"#1a2a3a",border:"1px solid #2a4a5a",borderRadius:8,color:"#2196F3",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",gap:4}}><I.Copy/>Tomorrow</button>}
        <button onClick={onClose} style={{padding:"10px 18px",background:"#252525",border:"none",borderRadius:8,color:"#aaa",cursor:"pointer",fontSize:13}}>Cancel</button>
        <button onClick={save} style={{padding:"10px 20px",background:"linear-gradient(135deg,#d4a017,#b8860b)",border:"none",borderRadius:8,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}>{edit?"Update":wks>1?`${wks} Blocks`:"Create"}</button>
      </div>
    </div>
  </div>);
}

// ═══════════════════════════════════════════
// HABITS PAGE (with inline stats)
// ═══════════════════════════════════════════
function HabPage({hab,hLog,addH,delH,togH,ev,mob}){
  const[showAdd,setAdd]=useState(false);const[nn,setNN]=useState("");const[nci,setNCI]=useState(0);const[wo,setWO]=useState(0);
  const base=new Date();base.setDate(base.getDate()+wo*7);const ws=sw(base);const days=Array.from({length:7},(_,i)=>ad(ws,i));const today=new Date();
  const doAdd=()=>{if(!nn.trim())return;addH({name:nn.trim(),color:HC[nci]});setNN("");setNCI(0);setAdd(false)};

  // Stats
  const stats=useMemo(()=>hab.map(h=>{let s=0;const d=new Date(today);while(hLog[`${h.id}_${dk(d)}`]){s++;d.setDate(d.getDate()-1)}
    let done30=0;for(let i=0;i<30;i++)if(hLog[`${h.id}_${dk(ad(today,-i))}`])done30++;
    return{...h,streak:s,rate30:Math.round((done30/30)*100)}}),[hab,hLog]);

  return(
    <div style={{padding:mob?"16px 12px":"24px 32px",maxWidth:950}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:mob?16:28,gap:8}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:mob?20:26,margin:0}}>Habits</h2>
        <button onClick={()=>setAdd(true)} style={{display:"flex",alignItems:"center",gap:4,padding:mob?"8px 12px":"8px 16px",background:"linear-gradient(135deg,#d4a017,#b8860b)",border:"none",borderRadius:8,color:"#fff",cursor:"pointer",fontSize:mob?12:13,fontWeight:600,flexShrink:0}}><I.Plus/>{mob?"":"Add Habit"}</button>
      </div>

      {/* Week nav */}
      <div style={{display:"flex",alignItems:"center",gap:mob?6:12,marginBottom:mob?12:20}}>
        <button onClick={()=>setWO(w=>w-1)} style={nb}><I.CL/></button>
        <button onClick={()=>setWO(0)} style={{...nb,fontSize:11,padding:"4px 8px"}}>This Week</button>
        <button onClick={()=>setWO(w=>w+1)} style={nb}><I.CR/></button>
        {!mob&&<span style={{fontSize:14,color:"#888"}}>{MONTHS[ws.getMonth()]} {ws.getDate()} – {MONTHS[ad(ws,6).getMonth()]} {ad(ws,6).getDate()}</span>}
      </div>

      {hab.length===0?<div style={{textAlign:"center",padding:"40px 20px",background:"#161616",borderRadius:16,border:"1px dashed #333"}}><p style={{fontSize:14,color:"#666"}}>No habits yet. Add your first one!</p></div>
      :<div style={{background:"#161616",borderRadius:16,overflow:"hidden",border:"1px solid #252525"}}>
        <div style={{display:"grid",gridTemplateColumns:`${mob?"90px":"200px"} repeat(7,1fr) ${mob?"28px":"36px"}`,borderBottom:"1px solid #252525"}}>
          <div style={{padding:mob?"8px 6px":"12px 16px",fontSize:mob?9:12,color:"#666",fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Habit</div>
          {days.map((d,i)=><div key={i} style={{padding:mob?"4px 0":"8px 0",textAlign:"center",borderLeft:"1px solid #1e1e1e"}}><div style={{fontSize:mob?8:10,color:"#555",textTransform:"uppercase"}}>{mob?DAYS[d.getDay()].charAt(0):DAYS[d.getDay()]}</div><div style={{fontSize:mob?12:15,fontWeight:600,color:sm(d,today)?"#d4a017":"#888"}}>{d.getDate()}</div></div>)}<div/>
        </div>
        {stats.map(h=>{const cd=days.filter(d=>hLog[`${h.id}_${dk(d)}`]).length;return(
          <div key={h.id} style={{display:"grid",gridTemplateColumns:`${mob?"90px":"200px"} repeat(7,1fr) ${mob?"28px":"36px"}`,borderBottom:"1px solid #1e1e1e"}}>
            <div style={{padding:mob?"8px 6px":"14px 16px",display:"flex",alignItems:"center",gap:mob?4:10,minWidth:0}}>
              <div style={{width:mob?6:10,height:mob?6:10,borderRadius:"50%",background:h.color,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0,overflow:"hidden"}}><span style={{fontSize:mob?10:14,fontWeight:500,display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</span>
                <div style={{fontSize:mob?8:11,color:"#666",display:"flex",gap:mob?4:8,marginTop:1}}>
                  {h.streak>0&&<span style={{color:"#f59e0b"}}>{h.streak}🔥</span>}
                  <span>{h.rate30}%</span>
                </div>
              </div>
            </div>
            {days.map((d,i)=>{const done=hLog[`${h.id}_${dk(d)}`];const past=d<=today||sm(d,today);return(
              <div key={i} onClick={()=>past&&togH(h.id,dk(d))} style={{display:"flex",alignItems:"center",justifyContent:"center",borderLeft:"1px solid #1e1e1e",cursor:past?"pointer":"default",transition:"background .15s"}}>
                <div style={{width:mob?22:28,height:mob?22:28,borderRadius:mob?5:7,border:done?"none":"2px solid #333",background:done?h.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",opacity:past?1:.3}}>{done&&<I.Chk/>}</div>
              </div>)})}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}><button onClick={()=>delH(h.id)} style={{background:"none",border:"none",color:"#444",cursor:"pointer",padding:1}}><I.Del/></button></div>
          </div>);})}
      </div>}

      {/* Streak cards */}
      {stats.length>0&&<div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(auto-fit,minmax(200px,1fr))",gap:mob?8:12,marginTop:mob?12:20}}>
        {stats.map(h=>(
          <div key={h.id} style={{background:"#161616",borderRadius:12,padding:mob?12:16,border:"1px solid #252525",display:"flex",alignItems:"center",gap:mob?8:12}}>
            <div style={{width:mob?36:44,height:mob?36:44,borderRadius:10,background:h.color+"22",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
              <div style={{fontSize:mob?16:20,fontWeight:700,color:h.color,lineHeight:1}}>{h.streak}</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:mob?12:13,fontWeight:600}}>{h.name}</div>
              <div style={{height:4,background:"#1e1e1e",borderRadius:2,marginTop:4,overflow:"hidden"}}><div style={{height:"100%",width:`${h.rate30}%`,background:h.color,borderRadius:2}}/></div>
              <div style={{fontSize:mob?9:10,color:"#666",marginTop:2}}>{h.rate30}% last 30 days</div>
            </div>
          </div>))}
      </div>}

      {showAdd&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:1000,display:"flex",alignItems:mob?"flex-end":"center",justifyContent:"center",backdropFilter:"blur(4px)"}} onClick={()=>setAdd(false)}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#1a1a1a",borderRadius:mob?"20px 20px 0 0":16,padding:mob?"24px 20px 40px":28,width:mob?"100%":380,border:mob?"none":"1px solid #333",animation:"fadeIn .2s ease"}}>
          {mob&&<div style={{width:40,height:4,borderRadius:2,background:"#444",margin:"0 auto 16px"}}/>}
          <h3 style={{margin:"0 0 20px",fontSize:18,fontFamily:"'Playfair Display',serif"}}>New Habit</h3>
          <div style={{marginBottom:16}}><label style={{fontSize:12,color:"#888",marginBottom:4,display:"block"}}>Name</label><input value={nn} onChange={e=>setNN(e.target.value)} placeholder="e.g. Meditate, Read..." style={{width:"100%",padding:"12px",background:"#1e1e1e",border:"1px solid #333",borderRadius:6,color:"#e8e4de",fontSize:16,outline:"none",boxSizing:"border-box"}} autoFocus={!mob} onKeyDown={e=>e.key==="Enter"&&doAdd()}/></div>
          <div style={{marginBottom:20}}><label style={{fontSize:12,color:"#888",marginBottom:4,display:"block"}}>Color</label><div style={{display:"flex",gap:mob?10:8}}>{HC.map((c,i)=><button key={i} onClick={()=>setNCI(i)} style={{width:mob?30:28,height:mob?30:28,borderRadius:"50%",background:c,border:nci===i?"2px solid #fff":"2px solid transparent",cursor:"pointer",transform:nci===i?"scale(1.15)":"scale(1)"}}/>)}</div></div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><button onClick={()=>setAdd(false)} style={{padding:"10px 20px",background:"#252525",border:"none",borderRadius:8,color:"#aaa",cursor:"pointer",fontSize:13}}>Cancel</button><button onClick={doAdd} style={{padding:"10px 24px",background:"linear-gradient(135deg,#d4a017,#b8860b)",border:"none",borderRadius:8,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}>Add</button></div>
        </div>
      </div>}
    </div>);
}
