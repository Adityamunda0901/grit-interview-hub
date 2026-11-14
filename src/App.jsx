import React, { useEffect, useMemo, useState } from "react";
import {
  Award, Bell, CalendarDays, CalendarPlus, Check, CheckCircle2,
  ChevronRight, CircleHelp, Clock3, ClipboardCheck, ClipboardList,
  LayoutDashboard, LogOut, MoreHorizontal, Search, ShieldAlert, Sparkles, Users, Video,
  X, ChartNoAxesCombined, ArrowUpRight, AlertCircle, Plus, CalendarCheck, RefreshCw
} from "lucide-react";
import { initialState } from "./data";

const iconMap = { LayoutDashboard, CalendarPlus, Award, CalendarDays, Clock3, ChartNoAxesCombined, Users, ClipboardList };
const readState = () => {
  try { return JSON.parse(localStorage.getItem("grit-hub-state-v2")) || initialState; }
  catch { return initialState; }
};
const fmtDate = d => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const initials = n => n.split(" ").map(x => x[0]).slice(0,2).join("");
const timeLabel = t => { const [h,m] = t.split(":").map(Number); return `${((h+11)%12)+1}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`; };

const DEMO_ACCOUNTS = [
  { email:"aarav@niat.edu", passwordHash:"741588bd2cefbd14c527498532a6f5402869106283dc4af33a1f7445dab48f34", role:"Student", userId:"s1", name:"Aarav Sharma" },
  { email:"diya@niat.edu", passwordHash:"592c3de2bfa022318655b927e102af6305efb370a4d596a7de8ecef9db16d19a", role:"Student", userId:"s2", name:"Diya Patel" },
  { email:"kabir@niat.edu", passwordHash:"35f6e8b3762492edb165d8b916744a9ed2c7e601d7076d91a6ce2a98b39561ae", role:"Student", userId:"s3", name:"Kabir Rao" },
  { email:"meera@niat.edu", passwordHash:"74dfa92ca2622d9a2752013daaae8740464c820b69d71f1b8f3e827899aa2751", role:"Student", userId:"s4", name:"Meera Nair" },
  { email:"ishaan@niat.edu", passwordHash:"90b1f051b5f527756291872ab2e2a1dc9da963b0b51e9cf0cd9d9d2847d443a8", role:"Student", userId:"s5", name:"Ishaan Das" },
  { email:"ananya@grit.niat.edu", passwordHash:"174e14b0b7a32a9c8d87aca1752af0311a947f37d3eec2c65c5cd93cb847e299", role:"Interviewer", userId:"u1", name:"Ananya Rao" },
  { email:"rohan@grit.niat.edu", passwordHash:"b051700e1e6f6d845359e427e8e228260f163287a741b3031b63b84c190cc4b2", role:"Interviewer", userId:"u2", name:"Rohan Mehta" },
  { email:"priya@grit.niat.edu", passwordHash:"d3a0e3a55640efb2af07c188180448869331fc91f9e4423720daeadb8bc40bb9", role:"Interviewer", userId:"u3", name:"Priya Menon" },
  { email:"admin@grit.niat.edu", passwordHash:"37fd8a263dcc43f30f32e2fc8e4e6071370f3eb299dd4b10300820c0a2d6a0f1", role:"Admin", userId:"admin-1", name:"GRIT Administrator" }
];
const DEMO_PASSWORD_SALT = "grit-interview-hub-demo-v4";
async function hashDemoPassword(password) {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({name:"PBKDF2", salt:encoder.encode(DEMO_PASSWORD_SALT), iterations:120000, hash:"SHA-256"}, material, 256);
  return Array.from(new Uint8Array(bits), byte=>byte.toString(16).padStart(2,"0")).join("");
}
const readSession = () => { try { return JSON.parse(localStorage.getItem("grit-hub-session-v3")) || null; } catch { return null; } };

function App() {
  const [data, setData] = useState(readState);
  const [session, setSession] = useState(readSession);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [page, setPage] = useState("overview");
  const role = session?.role || "Student";
  const studentId = role === "Student" ? session?.userId : null;
  const interviewerId = role === "Interviewer" ? session?.userId : null;
  const [search, setSearch] = useState("");
  const [showResultPreview, setShowResultPreview] = useState(false);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(null);

  useEffect(() => { localStorage.setItem("grit-hub-state-v2", JSON.stringify(data)); }, [data]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 2800); return () => clearTimeout(t); } }, [toast]);

  const student = data.students.find(s => s.id === studentId) || null;
  const interviewer = data.interviewers.find(i => i.id === interviewerId) || null;
  const login = async (event) => {
    event?.preventDefault();
    try {
      const passwordHash = await hashDemoPassword(loginPassword);
      const account = DEMO_ACCOUNTS.find(a => a.email.toLowerCase() === loginEmail.trim().toLowerCase() && a.passwordHash === passwordHash);
      if (!account) { setLoginError("The email or password is incorrect. Please try again."); return; }
      const next = { role:account.role, userId:account.userId, name:account.name, email:account.email };
      localStorage.setItem("grit-hub-session-v3", JSON.stringify(next));
      setSession(next); setLoginError("");
      setPage(account.role === "Student" ? "overview" : account.role === "Interviewer" ? "schedule" : "admin");
    } catch (error) {
      setLoginError("This browser cannot run the demo password verifier. Please use a modern browser on localhost or HTTPS.");
    }
  };
  const logout = () => { localStorage.removeItem("grit-hub-session-v3"); setSession(null); setLoginEmail(""); setLoginPassword(""); setLoginError(""); setPage("overview"); };
  const myInterview = student ? data.interviews
    .filter(i => i.studentId === studentId && (!i.studentBadgeId || i.studentBadgeId === student.studentBadgeId))
    .sort((a,b) => (b.attempt || 0) - (a.attempt || 0) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0] : null;
  const mySlot = myInterview && data.slots.find(s => s.id === myInterview.slotId);
  const activeNav = (id) => {
    if (role === "Student" && id === "book") { setPage("book"); setModal({type:"book"}); return; }
    setPage(id);
  };

  const updateData = fn => setData(prev => fn(structuredClone(prev)));
  const bookSlot = slotId => {
    const existing = data.interviews.find(i => i.studentId === studentId && (!i.studentBadgeId || i.studentBadgeId === student.studentBadgeId) && ["scheduled","in_progress","pending_evaluation"].includes(i.status));
    if (!student.eligible) return setToast("This badge is not yet eligible for interview booking.");
    if (existing) return setToast("You already have an active interview booking for this badge.");
    const slot = data.slots.find(s => s.id === slotId);
    const slotStart = slot ? new Date(`${slot.date}T${slot.time}:00`) : null;
    if (!slot || !slot.active || slot.bookedBy || !slotStart || slotStart <= new Date()) return setToast("Sorry, this slot is no longer available.");
    updateData(d => {
      const interviewId = `i${Date.now()}`;
      const target = d.slots.find(s => s.id === slotId);
      if (!target || target.bookedBy || !target.active) return d;
      target.bookedBy = studentId;
      const st = d.students.find(s => s.id === studentId);
      const studentBadgeId = st?.studentBadgeId || student.studentBadgeId;
      const attempt = d.interviews.filter(i => i.studentId === studentId && (!i.studentBadgeId || i.studentBadgeId === studentBadgeId)).reduce((n,i)=>Math.max(n,i.attempt||0),0) + 1;
      d.interviews.push({ id: interviewId, studentId, studentBadgeId, slotId, status: "scheduled", outcome: null, feedback: "", attempt, createdAt: new Date().toISOString().slice(0,10) });
      return d;
    });
    setModal(null); setToast("Interview booked successfully. Your dashboard now shows the confirmed slot.");
  };
  const startInterview = interviewId => {
    const interview = data.interviews.find(i=>i.id===interviewId);
    const slot = interview && data.slots.find(s=>s.id===interview.slotId);
    if (role !== "Interviewer" || !interview || !slot || slot.interviewerId !== interviewerId || interview.status !== "scheduled") {
      setToast("You are not authorized to start this interview."); return;
    }
    updateData(d=>{ const target=d.interviews.find(i=>i.id===interviewId); if(target && target.status==="scheduled") target.status="in_progress"; return d; });
    setModal(null); setToast("Interview marked as in progress.");
  };
  const markPendingEvaluation = interviewId => {
    const interview = data.interviews.find(i=>i.id===interviewId);
    const slot = interview && data.slots.find(s=>s.id===interview.slotId);
    if (role !== "Interviewer" || !interview || !slot || slot.interviewerId !== interviewerId || interview.status !== "in_progress") {
      setToast("Only the assigned interviewer can complete this session."); return;
    }
    updateData(d=>{ const target=d.interviews.find(i=>i.id===interviewId); if(target && target.status==="in_progress") target.status="pending_evaluation"; return d; });
    setModal(null); setToast("Session completed. Evaluation is now pending.");
  };
  const recordOutcome = (interviewId, outcome, feedback, scorecard) => {
    const interview = data.interviews.find(i => i.id === interviewId);
    const slot = interview && data.slots.find(s => s.id === interview.slotId);
    if (role !== "Interviewer" || !interview || !slot || slot.interviewerId !== interviewerId) {
      setToast("You are not authorized to evaluate this interview."); return;
    }
    if (!["scheduled", "in_progress", "pending_evaluation"].includes(interview.status)) {
      setToast("This interview already has a final outcome."); return;
    }
    if (outcome !== "no_show" && (!scorecard || Object.values(scorecard).some(v => !Number.isInteger(v) || v < 1 || v > 5))) {
      setToast("Complete all scorecard ratings from 1 to 5."); return;
    }
    updateData(d => {
      const target = d.interviews.find(i => i.id === interviewId);
      if (!target || !["scheduled", "in_progress", "pending_evaluation"].includes(target.status)) return d;
      target.outcome = outcome; target.feedback = feedback; target.scorecard = scorecard || null;
      target.status = outcome === "retake" ? "retake_required" : outcome === "no_show" ? "no_show" : outcome;
      target.recordedAt = new Date().toISOString(); target.recordedBy = interviewerId;
      target.badgeAwarded = outcome === "passed"; target.badgeStatus = outcome === "passed" ? "awarded" : "not_awarded";
      return d;
    });
    setModal(null); setToast("Interview evaluation saved and student dashboard updated.");
  };
  const cancelBooking = interviewId => {
    if (role !== "Student") return setToast("Only the student can cancel this demo booking.");
    const interview = data.interviews.find(i => i.id === interviewId && i.studentId === studentId);
    const slot = interview && data.slots.find(s => s.id === interview.slotId);
    if (!interview || interview.status !== "scheduled" || !slot) return setToast("This booking can no longer be cancelled online.");
    if (new Date(`${slot.date}T${slot.time}:00`).getTime() - Date.now() < 24*60*60*1000) return setToast("Online cancellation closes 24 hours before the interview. Contact GRIT support.");
    updateData(d => {
      const target = d.interviews.find(i => i.id === interviewId && i.studentId === studentId);
      const targetSlot = target && d.slots.find(s => s.id === target.slotId);
      if (target && targetSlot && target.status === "scheduled") { target.status = "cancelled"; target.cancelledAt = new Date().toISOString(); targetSlot.bookedBy = null; }
      return d;
    });
    setModal(null); setToast("Booking cancelled. The slot is available again.");
  };
  const addSlot = (date, time) => {
    const start = new Date(`${date}T${time}:00`);
    if (!date || !time || Number.isNaN(start.getTime()) || start <= new Date()) return setToast("Choose a future date and time.");
    const end = new Date(start.getTime() + 30*60000);
    const conflict = data.slots.some(s => {
      if (!s.active || s.interviewerId !== interviewerId || s.date !== date) return false;
      const otherStart = new Date(`${s.date}T${s.time}:00`);
      const otherEnd = new Date(otherStart.getTime() + (s.duration || 30)*60000);
      return start < otherEnd && end > otherStart;
    });
    if (conflict) return setToast("This overlaps an existing slot. Choose another time.");
    updateData(d => { d.slots.push({ id:`sl${Date.now()}`, interviewerId, date, time, duration:30, active:true, bookedBy:null }); return d; });
    setToast("Availability published. Students can now book this slot.");
  };
  const toggleSlot = id => {
    const slot = data.slots.find(x=>x.id===id);
    if (!slot || slot.bookedBy) return;
    if (!slot.active && new Date(`${slot.date}T${slot.time}:00`) <= new Date()) return setToast("Past availability cannot be reactivated.");
    updateData(d => { const target=d.slots.find(x=>x.id===id); if(target && !target.bookedBy) target.active=!target.active; return d; });
  };
  const raiseMalpracticeFlag = sid => {
    const targetStudent = data.students.find(s=>s.id===sid);
    if (!targetStudent) return setToast("Student record not found.");
    const flagId = `m${Date.now()}`;
    updateData(d => { d.malpractice.push({ id:flagId, studentId:sid, studentBadgeId:targetStudent.studentBadgeId, reason:"Demo review: reported code-of-conduct concern", status:"pending", createdAt:new Date().toISOString() }); return d; });
    setModal({type:"reviewMalpractice",flagId,student:targetStudent});
  };
  const reviewMalpractice = (flagId, decision) => {
    const flag = data.malpractice.find(m=>m.id===flagId);
    if (!flag || flag.status !== "pending" || role !== "Admin") return setToast("This review is no longer pending.");
    updateData(d => {
      const target = d.malpractice.find(m=>m.id===flagId);
      if (!target || target.status !== "pending") return d;
      target.status = decision; target.reviewedAt = new Date().toISOString(); target.reviewedBy = session.userId;
      if (decision === "confirmed") {
        d.interviews.filter(i=>i.studentId===target.studentId && (!i.studentBadgeId || i.studentBadgeId===target.studentBadgeId) && i.status==="passed").forEach(i=>{ i.badgeAwarded=false; i.badgeStatus="revoked"; });
      }
      return d;
    });
    setModal(null); setToast(decision === "confirmed" ? "Review confirmed. The affected badge has been revoked; interview history is retained." : "Review dismissed. The badge remains unchanged.");
  };

  const studentView = <StudentArea {...{data,student,studentId,myInterview,mySlot,showResultPreview,setShowResultPreview,bookSlot,setModal,page}} />;
  const interviewerView = <InterviewerArea {...{data,interviewer,interviewerId,recordOutcome,startInterview,markPendingEvaluation,addSlot,toggleSlot,setModal,page}} />;
  const adminView = <AdminArea {...{data,search,setSearch,setModal,raiseMalpracticeFlag,page}} />;

  if (!session || (role === "Student" && !student) || (role === "Interviewer" && !interviewer) || !["Student","Interviewer","Admin"].includes(role)) {
    if (session) { localStorage.removeItem("grit-hub-session-v3"); }
    return <LoginScreen {...{login,loginEmail,setLoginEmail,loginPassword,setLoginPassword,loginError}} />;
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">G</div><div><b>GRIT</b><span>INTERVIEW HUB</span></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <div className="signed-in-card">
        <div className="signed-in-avatar">{initials(session.name)}</div>
        <div className="signed-in-copy"><b>{session.name}</b><span>{role} account</span></div>
        <button className="logout-button" onClick={logout} title="Sign out"><LogOut size={14}/> <span>Sign out</span></button>
      </div>
      <div className="nav-label">MENU</div>
      <nav>{(role==="Student"?[{id:"overview",label:"Overview",icon:LayoutDashboard},{id:"book",label:"Book interview",icon:CalendarPlus},{id:"journey",label:"Badge journey",icon:Award}]:role==="Interviewer"?[{id:"schedule",label:"My schedule",icon:CalendarDays},{id:"availability",label:"Availability",icon:Clock3}]:[{id:"admin",label:"Operations overview",icon:ChartNoAxesCombined},{id:"students",label:"Eligible students",icon:Users},{id:"interviews",label:"All interviews",icon:ClipboardList}]).map(item=><button key={item.id} className={`nav-item ${page===item.id?"active":""}`} onClick={()=>activeNav(item.id)}><item.icon size={18}/><span>{item.label}</span>{item.id==="students"&&<em>{data.students.filter(s=>s.eligible&&!data.interviews.some(i=>i.studentId===s.id&&["scheduled","in_progress","pending_evaluation"].includes(i.status))).length}</em>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><b>Need a hand?</b><p>Check the interview guidelines and FAQs.</p><button onClick={()=>setModal({type:"help"})}>View help <ArrowUpRight size={13}/></button></div>
        <div className="profile-row"><div className="avatar">{role==="Student"?initials(student.name):role==="Interviewer"?initials(interviewer.name):"AD"}</div><div className="profile-meta"><b>{role==="Student"?student.name:role==="Interviewer"?interviewer.name:"GRIT Admin"}</b><span>{role.toLowerCase()} account</span></div><MoreHorizontal size={18}/></div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="breadcrumb">Workspace <ChevronRight size={14}/> <b>{role}</b></div><div className="top-actions"><span className="demo-chip"><span></span> DEMO DATA · LOCAL PREVIEW</span><button className="icon-btn" title="Notifications" onClick={()=>setModal({type:"notifications"})}><Bell size={18}/><i></i></button><div className="top-avatar">{role==="Student"?initials(student.name):role==="Interviewer"?initials(interviewer.name):"AD"}</div></div></header>
      <div className="page-wrap">
        {role==="Student"?studentView:role==="Interviewer"?interviewerView:adminView}
        <footer>© 2026 GRIT Interview Hub <span>Built for a smoother badge-clearance journey.</span></footer>
      </div>
    </main>
    {modal && <Modal modal={modal} data={data} student={student} myInterview={myInterview} interviewer={interviewer} onClose={()=>setModal(null)} onBook={bookSlot} onOutcome={recordOutcome} onStartInterview={startInterview} onMarkPendingEvaluation={markPendingEvaluation} onCancelBooking={cancelBooking} onAddSlot={addSlot} onReviewMalpractice={reviewMalpractice}/>}
    {toast&&<div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
  </div>;
}

function PageHeading({eyebrow,title,description,action}) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
function StatCard({label,value,change,icon:Icon,tone="blue"}) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19}/></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{change}</small></div></div>;
}
function Status({children,type="neutral"}) { return <span className={`status ${type}`}><i></i>{children}</span>; }
function Empty({title,desc,action}) { return <div className="empty"><CalendarDays size={27}/><b>{title}</b><p>{desc}</p>{action}</div>; }

function StudentArea({data,student,studentId,myInterview,mySlot,showResultPreview,setShowResultPreview,bookSlot,setModal,page}) {
  const latest = data.interviews.filter(i=>i.studentId===studentId && (!i.studentBadgeId || i.studentBadgeId===student.studentBadgeId)).sort((a,b)=>b.attempt-a.attempt)[0];
  const passed = latest?.status==="passed" && latest.badgeAwarded!==false && !data.malpractice.some(m=>m.studentId===studentId&&(!m.studentBadgeId || m.studentBadgeId===student.studentBadgeId)&&m.status==="confirmed");
  const revoked = data.malpractice.some(m=>m.studentId===studentId&&(!m.studentBadgeId || m.studentBadgeId===student.studentBadgeId)&&m.status==="confirmed");
  const previewPass = showResultPreview;
  const [skillsDone, skillsTotal] = (student.skills || "0/0").split("/").map(Number);
  const skillPercent = skillsTotal ? Math.round((skillsDone / skillsTotal) * 100) : 0;
  const canBook = student.eligible && (!myInterview || ["failed","retake_required","no_show","cancelled"].includes(myInterview.status)) && !passed && !revoked;
  return <>
    <PageHeading eyebrow="STUDENT PORTAL" title={`Welcome back, ${student.name.split(" ")[0]}`} description="Review your eligibility, manage your interview booking and track the outcome for this badge." action={<button className="btn btn-secondary" onClick={()=>setModal({type:"guidelines"})}><CircleHelp size={16}/> Interview guidelines</button>}/>
    <section className="student-hero">
      <div className="hero-content">
        <div className="hero-kicker">CURRENT BADGE · LEVEL CLEARANCE</div>
        <h2>{student.badge}</h2>
        <p>{student.eligible ? "All required skill contests are complete. You can now schedule your level-clearance interview." : "Complete the remaining required skill contests to unlock interview scheduling."}</p>
        <div className="hero-progress"><div><span>Required skills completed</span><b>{student.skills}</b></div><div className="progress-track"><span style={{width:`${skillPercent}%`}}/></div></div>
      </div>
      <div className="hero-status-panel">
        <span className="hero-status-label">ELIGIBILITY STATUS</span>
        <Status type={student.eligible?"success":"warning"}>{student.eligible?"Eligible for interview":"Requirements pending"}</Status>
        <div className="hero-status-divider"></div>
        <div className="hero-status-detail"><span>Interview status</span><b>{myInterview ? myInterview.status.replaceAll("_"," ") : "Not booked"}</b></div>
        <button className="btn btn-primary" disabled={!canBook} onClick={()=>setModal({type:"book"})}>{canBook?"Choose an interview slot":"View interview status"} <ChevronRight size={16}/></button>
      </div>
    </section>
    <div className="section-row"><div><h2 className="section-title">Your interview</h2><p className="section-subtitle">Stay on top of your badge clearance.</p></div><button className="text-btn" onClick={()=>setShowResultPreview(!showResultPreview)}><RefreshCw size={14}/> {showResultPreview?"Show actual state":"Preview after passing"}</button></div>
    {previewPass ? <div className="result-card success-result"><div className="result-symbol"><Award size={27}/></div><div className="result-main"><Status type="success">BADGE AWARDED</Status><h3>Congratulations! You've cleared your interview.</h3><p>Your {student.badge} interview is complete. Your badge has been awarded.</p><small>Preview state · Demonstration only</small></div><div className="result-side"><span>BADGE STATUS</span><b>Earned</b><Award size={36}/></div></div> : revoked ? <div className="result-card revoked-result"><div className="result-symbol"><ShieldAlert size={27}/></div><div className="result-main"><Status type="danger">BADGE REVOKED</Status><h3>Your badge has been revoked.</h3><p>A code-of-conduct review confirmed a malpractice violation. Contact the GRIT team if you need clarification.</p></div></div> : passed ? <div className="result-card success-result"><div className="result-symbol"><Award size={27}/></div><div className="result-main"><Status type="success">BADGE AWARDED</Status><h3>Congratulations! You've cleared your interview.</h3><p>{latest.feedback||"Your badge has been awarded."}</p></div></div> : myInterview && ["failed","retake_required","no_show","pending_evaluation","in_progress"].includes(myInterview.status) ? <div className={`result-card ${["failed","no_show"].includes(myInterview.status)?"revoked-result":""}`}><div className="result-symbol">{myInterview.status==="retake_required"?<RefreshCw size={25}/>:myInterview.status==="pending_evaluation"?<Clock3 size={25}/>:myInterview.status==="in_progress"?<Video size={25}/>:<AlertCircle size={25}/>}</div><div className="result-main"><Status type={myInterview.status==="failed"||myInterview.status==="no_show"?"danger":myInterview.status==="retake_required"?"warning":"info"}>{myInterview.status.replaceAll("_"," ")}</Status><h3>{myInterview.status==="failed"?"Interview outcome: not cleared":myInterview.status==="retake_required"?"A retake has been recommended":myInterview.status==="no_show"?"Interview marked as no-show":myInterview.status==="pending_evaluation"?"Your evaluation is pending":"Your interview is in progress"}</h3><p>{myInterview.feedback || (myInterview.status==="pending_evaluation"?"Your interviewer is reviewing the session. The result will appear here once submitted.":myInterview.status==="retake_required"?"You can schedule another attempt when an eligible slot is available.":myInterview.status==="failed"?"Review the feedback and next steps before booking another attempt.":myInterview.status==="no_show"?"Contact the GRIT team if you believe this status was recorded incorrectly.":"Your interview session is underway.")}</p></div></div> : myInterview && mySlot ? <div className="booking-card"><div className="booking-date"><b>{new Date(`${mySlot.date}T00:00:00`).toLocaleDateString("en-IN",{day:"2-digit"})}</b><span>{new Date(`${mySlot.date}T00:00:00`).toLocaleDateString("en-IN",{month:"short"}).toUpperCase()}</span></div><div className="booking-info"><Status type="info">{myInterview.status==="scheduled"?"UPCOMING INTERVIEW":myInterview.status.toUpperCase()}</Status><h3>{student.badge}</h3><p><CalendarDays size={14}/>{fmtDate(mySlot.date)} <span>·</span> <Clock3 size={14}/>{timeLabel(mySlot.time)} <span>·</span> <Video size={14}/> Online</p><small>Interviewer: {data.interviewers.find(i=>i.id===mySlot.interviewerId)?.name||"Assigned interviewer"}</small></div><button className="btn btn-secondary" onClick={()=>setModal({type:"bookingDetails",interview:myInterview,slot:mySlot})}>View details <ChevronRight size={15}/></button></div> : <div className="empty-card"><div className="empty-illustration"><CalendarPlus size={25}/></div><div><b>{student.eligible?"Your interview is waiting to be booked":"Not eligible yet"}</b><p>{student.eligible?"Choose a time that works for you from the available interviewer slots.":"Complete all required skills to unlock interview scheduling."}</p></div><button className="btn btn-primary" disabled={!canBook} onClick={()=>setModal({type:"book"})}>{canBook?"Find a slot":"View requirements"} <ChevronRight size={15}/></button></div>}
    <div className="two-col student-lower"><div className="panel"><div className="panel-head"><div><h3>Badge progress</h3><p>Your progress towards the next level.</p></div><span className="muted-pill">{passed?"CLEARED":student.eligible?"ELIGIBLE":"IN PROGRESS"}</span></div><div className="badge-progress"><div className="badge-mini"><Award size={25}/></div><div className="badge-progress-copy"><b>{student.badge}</b><span>{student.skills} skills completed</span></div><strong>{`${skillPercent}%`}</strong></div><div className="progress-track light"><span style={{width:`${skillPercent}%`}}/></div><div className="check-list"><div className={student.eligible?"":"pending-check"}>{student.eligible?<CheckCircle2 size={16}/>:<Clock3 size={16}/>} Required skill contests <span>{student.skills}</span></div><div className={student.eligible?"":"pending-check"}>{student.eligible?<CheckCircle2 size={16}/>:<Clock3 size={16}/>} Eligibility verification <span>{student.eligible?"Verified":"Pending"}</span></div><div className={passed?"":"pending-check"}>{passed?<CheckCircle2 size={16}/>:<Clock3 size={16}/>} Level clearance interview <span>{passed?"Cleared":myInterview?"Scheduled":"Pending"}</span></div></div></div>
      <div className="panel"><div className="panel-head"><div><h3>Quick reminders</h3><p>A few things to remember.</p></div><Bell size={17} className="muted-icon"/></div><div className="reminder"><div className="reminder-icon purple"><Video size={17}/></div><div><b>Join on time</b><p>Join your online interview 5 minutes early.</p></div></div><div className="reminder"><div className="reminder-icon green"><ClipboardCheck size={17}/></div><div><b>Keep your work ready</b><p>Be prepared to explain your completed skill contests.</p></div></div><div className="reminder"><div className="reminder-icon orange"><ShieldAlert size={17}/></div><div><b>Follow the code of conduct</b><p>Malpractice can result in badge revocation.</p></div></div></div></div>
    {page === "journey" && <div className="panel attempt-history"><div className="panel-head"><div><h3>Interview attempt history</h3><p>Previous attempts are retained for transparency and retake decisions.</p></div><span className="muted-pill">{data.interviews.filter(i=>i.studentId===studentId && (!i.studentBadgeId || i.studentBadgeId===student.studentBadgeId)).length} ATTEMPTS</span></div>{data.interviews.filter(i=>i.studentId===studentId && (!i.studentBadgeId || i.studentBadgeId===student.studentBadgeId)).sort((a,b)=>(b.attempt||0)-(a.attempt||0)).length ? <div className="table-wrap"><table><thead><tr><th>ATTEMPT</th><th>DATE</th><th>STATUS</th><th>FEEDBACK</th></tr></thead><tbody>{data.interviews.filter(i=>i.studentId===studentId && (!i.studentBadgeId || i.studentBadgeId===student.studentBadgeId)).sort((a,b)=>(a.attempt||0)-(b.attempt||0)).map(i=><tr key={i.id}><td>Attempt {i.attempt}</td><td>{i.createdAt ? fmtDate(i.createdAt) : "—"}</td><td><Status type={i.status==="passed"?"success":i.status==="failed"?"danger":"info"}>{i.status.replaceAll("_"," ")}</Status></td><td>{i.feedback || "No feedback recorded"}</td></tr>)}</tbody></table></div> : <Empty title="No interview attempts yet" desc="Your attempt history will appear here after you book an interview."/>}</div>}
    <div className="message-strip"><Bell size={17}/><div><b>You're in control of your journey.</b><span>We'll notify you when your interview status or badge result changes.</span></div></div>
  </>;
}

function InterviewerArea({data,interviewer,interviewerId,recordOutcome,startInterview,markPendingEvaluation,addSlot,toggleSlot,setModal,page}) {
  const mySlots=data.slots.filter(s=>s.interviewerId===interviewerId).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const booked=mySlots.filter(s=>s.bookedBy);
  const upcoming=booked.map(s=>({slot:s,interview:data.interviews.find(i=>i.slotId===s.id)})).filter(x=>x.interview);
  const today="2026-11-16";
  return <>
    <PageHeading eyebrow="INTERVIEWER PORTAL" title={page === "availability" ? "Manage your availability" : "Your interview schedule"} description={page === "availability" ? "Publish, review and manage the time slots students can book." : `Good day, ${interviewer.name.split(" ")[0]}. Review your daily schedule and record interview outcomes.`} action={<button className="btn btn-primary" onClick={()=>setModal({type:"addAvailability"})}><Plus size={16}/> Add availability</button>}/>
    <div className="stats-grid three"><StatCard label="Total bookings" value={booked.length} change="Across all dates" icon={CalendarCheck}/><StatCard label="Awaiting evaluation" value={upcoming.filter(x=>x.interview.status==="pending_evaluation").length} change="Needs your attention" icon={ClipboardCheck} tone="orange"/><StatCard label="Available slots" value={mySlots.filter(s=>s.active&&!s.bookedBy).length} change="Open for booking" icon={Clock3} tone="green"/></div>
    {page !== "availability" && <><div className="section-row"><div><h2 className="section-title">Daily schedule</h2><p className="section-subtitle">Monday, 16 November 2026 · All times IST</p></div><button className="btn btn-secondary" onClick={()=>setModal({type:"addAvailability"})}><Plus size={15}/> Add a slot</button></div>
    <div className="panel schedule-panel"><div className="schedule-date"><div className="date-tile"><b>16</b><span>NOV</span></div><div><b>Monday</b><span>Interview appointments and open availability</span></div></div>
      <div className="timeline">{mySlots.filter(s=>s.date===today).map(s=>{const it=data.interviews.find(i=>i.slotId===s.id);const st=it&&data.students.find(x=>x.id===it.studentId);return <div className="timeline-row" key={s.id}><div className="timeline-time">{timeLabel(s.time)}</div><div className={`timeline-event ${it?"booked-event":"open-event"}`}><div className="event-marker"></div><div className="event-content">{it?<><div className="event-top"><b>{st?.name||"Student"}</b><Status type={it.status==="passed"?"success":"info"}>{it.status.replace("_"," ")}</Status></div><span>{st?.badge}</span><small>30 minutes · Online · Attempt {it.attempt}</small></>:<><b>Available interview slot</b><span>Open for student booking</span></>}</div>{it?<button className="btn btn-small btn-secondary" onClick={()=>setModal({type:"evaluate",interview:it,student:st,slot:s})}>{it.status==="scheduled"?"Record outcome":"View evaluation"}</button>:<button className="icon-btn" onClick={()=>toggleSlot(s.id)} title="Deactivate slot"><X size={16}/></button>}</div></div>})}</div>
    </div>
    <div className="panel"><div className="panel-head"><div><h3>Upcoming interviews</h3><p>Your confirmed candidate list.</p></div><span className="muted-pill">{upcoming.length} TOTAL</span></div><div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>BADGE</th><th>DATE & TIME</th><th>STATUS</th><th></th></tr></thead><tbody>{upcoming.map(({slot,interview})=>{const st=data.students.find(s=>s.id===interview.studentId);return <tr key={interview.id}><td><div className="person-cell"><div className="avatar small">{initials(st.name)}</div><div><b>{st.name}</b><span>{st.email}</span></div></div></td><td>{st.badge}</td><td>{fmtDate(slot.date)} · {timeLabel(slot.time)}</td><td><Status type={interview.status==="passed"?"success":interview.status==="failed"?"danger":"info"}>{interview.status.replace("_"," ")}</Status></td><td><button className="text-btn" onClick={()=>setModal({type:"evaluate",interview,student:st,slot})}>Open <ChevronRight size={14}/></button></td></tr>})}</tbody></table></div></div></>}
    {page === "availability" && <div className="panel"><div className="panel-head"><div><h3>Published availability</h3><p>Only active, unbooked slots are visible to eligible students.</p></div><span className="muted-pill">{mySlots.filter(s=>s.active&&!s.bookedBy).length} OPEN</span></div><div className="table-wrap"><table><thead><tr><th>DATE</th><th>START TIME</th><th>DURATION</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{mySlots.map(s=><tr key={s.id}><td>{fmtDate(s.date)}</td><td>{timeLabel(s.time)} IST</td><td>{s.duration || 30} min</td><td>{s.bookedBy?<Status type="info">Booked</Status>:s.active?<Status type="success">Open</Status>:<Status type="neutral">Inactive</Status>}</td><td>{!s.bookedBy && <button className="text-btn" onClick={()=>toggleSlot(s.id)}>{s.active?"Deactivate":"Reactivate"}</button>}</td></tr>)}</tbody></table></div></div>}
  </>;
}

function AdminArea({data,search,setSearch,setModal,raiseMalpracticeFlag,page}) {
  const eligible=data.students.filter(s=>s.eligible);
  const bookedIds=new Set(data.interviews.filter(i=>["scheduled","in_progress","pending_evaluation"].includes(i.status)).map(i=>i.studentId));
  const unbooked=eligible.filter(s=>!bookedIds.has(s.id));
  const booked=data.interviews.filter(i=>["scheduled","in_progress","pending_evaluation"].includes(i.status));
  const passed=data.interviews.filter(i=>i.status==="passed" && i.badgeAwarded!==false && !data.malpractice.some(m=>m.studentId===i.studentId&&m.status==="confirmed")).length;
  const filtered=eligible.filter(s=>`${s.name} ${s.email} ${s.badge}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <PageHeading eyebrow="ADMIN CONSOLE" title={page === "students" ? "Eligible students" : page === "interviews" ? "All interview records" : "Operations overview"} description={page === "students" ? "Review badge-specific eligibility and identify students who still need to book." : page === "interviews" ? "Review every interview attempt, outcome and feedback record." : "Monitor interview demand, booking progress and badge-clearance outcomes."} action={<button className="btn btn-secondary" onClick={()=>setModal({type:"export"})}><ArrowUpRight size={15}/> Export report</button>}/>
    <div className="stats-grid"><StatCard label="Eligible students" value={eligible.length} change="Across active badge levels" icon={Users}/><StatCard label="Booked interviews" value={booked.length} change={`${Math.round(booked.length/Math.max(eligible.length,1)*100)}% of eligible`} icon={CalendarCheck} tone="green"/><StatCard label="Yet to book" value={unbooked.length} change="Needs follow-up" icon={Clock3} tone="orange"/><StatCard label="Badges cleared" value={passed} change="Successful outcomes" icon={Award} tone="purple"/></div>
    <div className="admin-grid"><div className="panel chart-panel"><div className="panel-head"><div><h3>Interview pipeline</h3><p>Student movement through the process.</p></div><span className="muted-pill">CURRENT CYCLE</span></div><div className="pipeline"><div className="pipeline-item"><div className="pipeline-top"><span>Eligible</span><b>{eligible.length}</b></div><div className="pipeline-track"><span style={{width:"100%"}}/></div></div><div className="pipeline-item"><div className="pipeline-top"><span>Booked</span><b>{booked.length}</b></div><div className="pipeline-track"><span style={{width:`${booked.length/Math.max(eligible.length,1)*100}%`}}/></div></div><div className="pipeline-item"><div className="pipeline-top"><span>Passed</span><b>{passed}</b></div><div className="pipeline-track"><span style={{width:`${passed/Math.max(eligible.length,1)*100}%`}}/></div></div></div><div className="chart-foot"><span><i className="legend-dot blue-dot"></i> Eligible</span><span><i className="legend-dot green-dot"></i> Booked</span><span><i className="legend-dot purple-dot"></i> Passed</span></div></div>
      <div className="panel attention-panel"><div className="panel-head"><div><h3>Needs attention</h3><p>Follow-ups for the team.</p></div><AlertCircle size={18} className="orange-text"/></div><div className="attention-item"><div className="attention-number">{unbooked.length}</div><div><b>Students haven't booked</b><span>Eligible students awaiting action</span></div></div><div className="attention-item"><div className="attention-number">{data.interviews.filter(i=>i.status==="pending_evaluation").length}</div><div><b>Pending evaluations</b><span>Outcomes not yet recorded</span></div></div><div className="attention-item"><div className="attention-number">{data.malpractice.filter(m=>m.status==="pending").length}</div><div><b>Malpractice reviews</b><span>Awaiting admin decision</span></div></div></div></div>
    <div className="panel"><div className="panel-head"><div><h3>Eligible students</h3><p>Track who has booked and who still needs to schedule.</p></div><div className="table-tools"><div className="searchbox"><Search size={15}/><input placeholder="Search students..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div></div><div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>BADGE</th><th>SKILLS</th><th>INTERVIEW STATUS</th><th>ACTION</th></tr></thead><tbody>{filtered.map(s=>{const it=data.interviews.filter(i=>i.studentId===s.id && (!i.studentBadgeId || i.studentBadgeId===s.studentBadgeId)).sort((a,b)=>b.attempt-a.attempt)[0];const status=it?.status||"not_booked";return <tr key={s.id}><td><div className="person-cell"><div className="avatar small">{initials(s.name)}</div><div><b>{s.name}</b><span>{s.email}</span></div></div></td><td>{s.badge}</td><td><span className="skill-count">{s.skills}</span></td><td>{status==="not_booked"?<Status type="warning">Not booked</Status>:<Status type={status==="passed"?"success":status==="failed"?"danger":"info"}>{status.replace("_"," ")}</Status>}</td><td>{["not_booked","failed","retake_required","no_show"].includes(status)?<button className="text-btn" onClick={()=>setModal({type:"remind",student:s})}>{status==="not_booked"?"Invite to book":"Invite to retake"} <ArrowUpRight size={13}/></button>:it?<button className="text-btn" onClick={()=>setModal({type:"adminInterview",interview:it,student:s})}>View details <ChevronRight size={13}/></button>:null}</td></tr>})}</tbody></table></div><div className="table-footer">Showing {filtered.length} of {eligible.length} eligible students <span>Demo data · Last synced just now</span></div></div>
    {page === "interviews" && <div className="panel"><div className="panel-head"><div><h3>All interview records</h3><p>Every attempt is retained, including retakes and completed outcomes.</p></div><span className="muted-pill">{data.interviews.length} RECORDS</span></div><div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>BADGE</th><th>ATTEMPT</th><th>STATUS</th><th>FEEDBACK</th></tr></thead><tbody>{data.interviews.map(it=>{const st=data.students.find(x=>x.id===it.studentId);return <tr key={it.id}><td>{st?.name || "Unknown student"}</td><td>{st?.badge || "—"}</td><td>{it.attempt}</td><td><Status type={it.status==="passed"?"success":it.status==="failed"?"danger":"info"}>{it.status.replaceAll("_"," ")}</Status></td><td>{it.feedback || "—"}</td></tr>})}</tbody></table></div></div>}
    <div className="panel"><div className="panel-head"><div><h3>Malpractice & badge integrity</h3><p>Confirmed flags can revoke a previously awarded badge.</p></div><Status type="warning">{data.malpractice.length} FLAGS</Status></div><div className="integrity-row"><div className="integrity-icon"><ShieldAlert size={20}/></div><div><b>Malpractice review queue</b><span>Record a concern, then confirm or dismiss it after review.</span></div><select id="revokeStudent" defaultValue=""><option value="" disabled>Select student</option>{data.students.filter(s=>data.interviews.some(i=>i.studentId===s.id&&(!i.studentBadgeId||i.studentBadgeId===s.studentBadgeId)&&i.status==="passed")&&!data.malpractice.some(m=>m.studentId===s.id&&(!m.studentBadgeId||m.studentBadgeId===s.studentBadgeId)&&["pending","confirmed"].includes(m.status))).map(s=><option value={s.id}>{s.name}</option>)}</select><button className="btn btn-danger-outline" onClick={()=>{const el=document.getElementById("revokeStudent");if(el.value)raiseMalpracticeFlag(el.value);else alert("Select a student with a passed interview first.");}}>Start review</button></div></div>
  </>;
}

function Modal({modal,data,student,myInterview,interviewer,onClose,onBook,onOutcome,onStartInterview,onMarkPendingEvaluation,onCancelBooking,onAddSlot,onReviewMalpractice}) {
  const [selected,setSelected]=useState("");
  const [feedback,setFeedback]=useState("");
  const [scorecard,setScorecard]=useState({technical:3,problemSolving:3,communication:3,practical:3});
  const [date,setDate]=useState("2026-11-17");
  const [time,setTime]=useState("10:00");
  const [outcome,setOutcome]=useState("passed");
  const [copied,setCopied]=useState(false);
  const reportSummary = `GRIT Interview Hub — Demo report\nEligible students: ${data.students.filter(s=>s.eligible).length}\nActive bookings: ${data.interviews.filter(i=>["scheduled","in_progress","pending_evaluation"].includes(i.status)).length}\nPassed interviews: ${data.interviews.filter(i=>i.status==="passed"&&i.badgeAwarded!==false).length}\nEligible students yet to book: ${data.students.filter(s=>s.eligible&&!data.interviews.some(i=>i.studentId===s.id&&["scheduled","in_progress","pending_evaluation"].includes(i.status))).length}\nTotal interview attempts: ${data.interviews.length}`;
  const slots=data.slots.filter(s=>s.active&&!s.bookedBy&&new Date(`${s.date}T${s.time}:00`)>new Date()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const title={book:"Choose your interview slot",evaluate:"Record interview outcome",addAvailability:"Add your availability",bookingDetails:"Interview details",reviewMalpractice:"Review malpractice flag",guidelines:"Interview guidelines",help:"GRIT Interview Hub help",remind:"Send student reminder",adminInterview:"Interview record",export:"Export report"}[modal.type]||"Details";
  const studentName=modal.student?.name||student.name;
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="modal"><div className="modal-head"><div><span className="eyebrow">GRIT INTERVIEW HUB</span><h2>{title}</h2></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>
    {modal.type==="book"&&<><p className="modal-intro">Select a date and time that works for you. All times are shown in Indian Standard Time (IST).</p>{slots.length?<div className="slot-list">{slots.map(s=><button className={`slot-option ${selected===s.id?"selected":""}`} key={s.id} onClick={()=>setSelected(s.id)}><div className="slot-date"><b>{new Date(`${s.date}T00:00:00`).toLocaleDateString("en-IN",{day:"2-digit"})}</b><span>{new Date(`${s.date}T00:00:00`).toLocaleDateString("en-IN",{month:"short"})}</span></div><div><b>{fmtDate(s.date)}</b><span>{timeLabel(s.time)} · {data.interviewers.find(i=>i.id===s.interviewerId)?.name}</span></div><span className="slot-radio">{selected===s.id?<Check size={14}/>:null}</span></button>)}</div>:<Empty title="No slots available" desc="Please check again later or contact the GRIT team."/>}<div className="modal-note"><ShieldAlert size={15}/> You can only hold one active booking per badge at a time.</div><div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!selected} onClick={()=>onBook(selected)}>Confirm booking <ChevronRight size={15}/></button></div></>}
    {modal.type==="evaluate"&&<><div className="candidate-summary"><div className="avatar">{initials(studentName)}</div><div><b>{studentName}</b><span>{modal.student?.badge} · Attempt {modal.interview.attempt}</span></div><Status type="info">{modal.interview.status.replace("_"," ")}</Status></div><label className="field-label">INTERVIEW OUTCOME</label><div className="outcome-options">{[{id:"passed",label:"Pass",desc:"Student cleared the interview",icon:CheckCircle2},{id:"failed",label:"Fail",desc:"Student did not meet the bar",icon:X},{id:"retake",label:"Retake later",desc:"Another attempt is recommended",icon:RefreshCw},{id:"no_show",label:"No-show",desc:"Student did not attend",icon:AlertCircle}].map(o=><button type="button" className={`outcome-option ${outcome===o.id?"chosen":""}`} onClick={()=>setOutcome(o.id)}><o.icon size={18}/><b>{o.label}</b><span>{o.desc}</span></button>)}</div>{outcome!=="no_show"&&<><label className="field-label">EVALUATION SCORECARD · RATE EACH AREA 1–5</label><div className="scorecard-grid">{[{id:"technical",label:"Technical understanding"},{id:"problemSolving",label:"Problem-solving"},{id:"communication",label:"Communication"},{id:"practical",label:"Practical application"}].map(item=><label className="scorecard-item" key={item.id}><span>{item.label}</span><select value={scorecard[item.id]} onChange={e=>setScorecard(v=>({...v,[item.id]:Number(e.target.value)}))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} / 5</option>)}</select></label>)}</div></>}<label className="field-label" htmlFor="feedback">FEEDBACK FOR STUDENT</label><textarea id="feedback" value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Add constructive feedback and next steps..." rows="4"/><div className="modal-note"><ShieldAlert size={15}/> The assigned interviewer can submit one final outcome. Corrections require an admin-controlled review.</div><div className="modal-actions">{modal.interview.status==="scheduled"&&outcome!=="no_show"&&<button className="btn btn-secondary" onClick={()=>onStartInterview(modal.interview.id)}>Start interview</button>}{modal.interview.status==="in_progress"&&outcome!=="no_show"&&<button className="btn btn-secondary" onClick={()=>onMarkPendingEvaluation(modal.interview.id)}>Mark session complete</button>}<button className="btn btn-primary" onClick={()=>onOutcome(modal.interview.id,outcome,feedback,scorecard)}>Save evaluation <Check size={15}/></button></div></>}
    {modal.type==="addAvailability"&&<><p className="modal-intro">Publish a 30-minute interview slot. Students will be able to book it immediately.</p><div className="form-grid"><div><label className="field-label">DATE</label><input type="date" min="2026-11-14" value={date} onChange={e=>setDate(e.target.value)}/></div><div><label className="field-label">START TIME (IST)</label><input type="time" value={time} onChange={e=>setTime(e.target.value)}/></div></div><div className="modal-note"><Clock3 size={15}/> Each interview slot is 30 minutes. Avoid overlapping availability.</div><div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={()=>{onAddSlot(date,time);onClose();}}>Publish slot <Plus size={15}/></button></div></>}
    {modal.type==="bookingDetails"&&<><div className="detail-hero"><CalendarCheck size={28}/><Status type="info">CONFIRMED</Status><h3>{fmtDate(modal.slot.date)}</h3><p>{timeLabel(modal.slot.time)} IST · 30 minutes · Online</p></div><div className="detail-list"><div><span>Badge</span><b>{student.badge}</b></div><div><span>Interviewer</span><b>{data.interviewers.find(i=>i.id===modal.slot.interviewerId)?.name}</b></div><div><span>Meeting link</span><b>Shared before interview</b></div></div><div className="modal-note"><Bell size={15}/> Please join 5 minutes early. Keep your camera and microphone ready.</div><div className="modal-actions">{modal.interview?.status==="scheduled"&&<button className="btn btn-secondary" onClick={()=>onCancelBooking(modal.interview.id)}>Cancel booking</button>}<button className="btn btn-primary" onClick={onClose}>Got it</button></div></>}
    {(modal.type==="guidelines"||modal.type==="help")&&<><div className="guideline-list"><div><CheckCircle2/><div><b>Be on time</b><span>Join the online meeting 5 minutes before your slot.</span></div></div><div><ClipboardCheck/><div><b>Explain your work</b><span>Be ready to discuss the skills and projects you completed.</span></div></div><div><ShieldAlert/><div><b>Maintain integrity</b><span>Malpractice or misrepresentation can result in badge revocation.</span></div></div><div><Video/><div><b>Check your setup</b><span>Use a stable internet connection, camera and microphone.</span></div></div></div><div className="modal-actions"><button className="btn btn-primary" onClick={onClose}>Understood</button></div></>}
    {modal.type==="notifications"&&<><p className="modal-intro">This prototype updates interview status and results in the dashboard. Email, SMS and push delivery are not connected in demo mode.</p><div className="guideline-list"><div><Bell/><div><b>Booking updates</b><span>Confirmed slots appear in the student dashboard immediately.</span></div></div><div><ClipboardCheck/><div><b>Outcome updates</b><span>Pass, fail and retake decisions appear after the interviewer saves an outcome.</span></div></div></div><div className="modal-actions"><button className="btn btn-primary" onClick={onClose}>Close</button></div></>}
    {modal.type==="remind"&&<><p className="modal-intro">Preview the reminder message for {studentName}. External email delivery is not connected in this prototype.</p><div className="message-preview"><b>Subject: Your GRIT interview is waiting to be booked</b><p>Hi {studentName.split(" ")[0]},</p><p>You're eligible for your {modal.student.badge} interview. Choose an available slot from your GRIT dashboard to take the next step towards earning your badge.</p><p>— Team GRIT</p></div><div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>Close</button><button className="btn btn-primary" onClick={onClose}>Close preview</button></div></>}
    {modal.type==="adminInterview"&&<><div className="detail-list"><div><span>Student</span><b>{studentName}</b></div><div><span>Outcome</span><b>{modal.interview.outcome||modal.interview.status}</b></div><div><span>Attempt</span><b>{modal.interview.attempt}</b></div><div><span>Feedback</span><b>{modal.interview.feedback||"No feedback recorded"}</b></div></div>{modal.interview.scorecard&&<div className="detail-list"><div><span>Technical understanding</span><b>{modal.interview.scorecard.technical||"—"}/5</b></div><div><span>Problem-solving</span><b>{modal.interview.scorecard.problemSolving||"—"}/5</b></div><div><span>Communication</span><b>{modal.interview.scorecard.communication||"—"}/5</b></div><div><span>Practical application</span><b>{modal.interview.scorecard.practical||"—"}/5</b></div></div>}<div className="modal-actions"><button className="btn btn-primary" onClick={onClose}>Close</button></div></>}
    {modal.type==="reviewMalpractice"&&<><p className="modal-intro">A concern has been recorded for {modal.student?.name}. Review the case before deciding whether the badge should be affected. This is a demonstration workflow; no real allegation is being made.</p><div className="detail-list"><div><span>Student</span><b>{modal.student?.name}</b></div><div><span>Badge</span><b>{modal.student?.badge}</b></div><div><span>Review status</span><b>Pending admin decision</b></div></div><div className="modal-note"><ShieldAlert size={15}/> Confirming the concern revokes only this badge. Dismissing it leaves the badge unchanged. The interview history is retained.</div><div className="modal-actions"><button className="btn btn-secondary" onClick={()=>onReviewMalpractice(modal.flagId,"dismissed")}>Dismiss flag</button><button className="btn btn-danger-outline" onClick={()=>onReviewMalpractice(modal.flagId,"confirmed")}>Confirm violation</button></div></>}
    {modal.type==="export"&&<><p className="modal-intro">Copy this current demo summary for your assignment walkthrough. Values are calculated from the prototype data.</p><div className="message-preview">{reportSummary.split("\n").map((line,i)=><div key={i}>{line}</div>)}</div><div className="modal-actions"><button className="btn btn-primary" onClick={()=>{navigator.clipboard?.writeText(reportSummary);setCopied(true);}}> {copied?"Copied":"Copy report summary"} <Check size={14}/></button></div></>}
  </div></div>;
}


function LoginScreen({login,loginEmail,setLoginEmail,loginPassword,setLoginPassword,loginError}) {
  const [showPassword,setShowPassword] = useState(false);
  return <main className="login-page">
    <section className="login-brand-panel">
      <div className="login-brand"><div className="brand-mark">G</div><div><b>GRIT</b><span>INTERVIEW HUB</span></div></div>
      <div className="login-brand-content">
        <span className="login-eyebrow">NIAT · ASSESSMENT OPERATIONS</span>
        <h1>One clear path from skill completion to badge clearance.</h1>
        <p>A single workspace for students, interviewers and the GRIT interview team.</p>
        <div className="login-points">
          <div><CheckCircle2 size={18}/><span>Transparent eligibility and booking</span></div>
          <div><CalendarDays size={18}/><span>Coordinated interview schedules</span></div>
          <div><ShieldAlert size={18}/><span>Account-based access to records</span></div>
        </div>
      </div>
      <div className="login-brand-foot">GRIT INTERVIEW HUB <span>·</span> DEMONSTRATION ENVIRONMENT</div>
    </section>
    <section className="login-form-panel">
      <form className="login-card" onSubmit={login}>
        <span className="login-eyebrow">DEMO WORKSPACE</span>
        <h2>Sign in to GRIT</h2>
        <p className="login-subtitle">Use the account assigned to your role.</p>
        <label htmlFor="login-email">Email address</label>
        <input id="login-email" type="email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="name@niat.edu" autoComplete="username" required />
        <label htmlFor="login-password">Password</label>
        <div className="password-field"><input id="login-password" type={showPassword?"text":"password"} value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required/><button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?"Hide":"Show"}</button></div>
        {loginError && <div className="login-error" role="alert">{loginError}</div>}
        <button className="btn btn-primary login-submit" type="submit">Sign in <ArrowUpRight size={16}/></button>
        <div className="login-security"><ShieldAlert size={15}/><span>Role-scoped screens are demonstrated with fictional data. This local prototype is not production authentication.</span></div>
        <p className="login-access-note">Access is provided by your GRIT administrator. Demo evaluator accounts are shared separately from this login screen.</p>
      </form>
    </section>
  </main>;
}

export default App;
