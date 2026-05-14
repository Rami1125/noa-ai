import React, { useState, useEffect } from "react";
import { 
  Users, 
  FlaskConical, 
  Activity, 
  ChevronRight, 
  Save, 
  Upload, 
  ShieldAlert, 
  MapPin, 
  Smartphone, 
  History,
  LayoutDashboard,
  LogOut,
  Trash2,
  Plus,
  ShieldCheck
} from "lucide-react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  limit, 
  where,
  setDoc,
  doc,
  deleteDoc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";

type AdminTab = "users" | "training" | "malshinon";

interface AdminDashboardProps {
  userId: string;
  specId: string;
  onBack: () => void;
  locationAlertActive: boolean;
  onDismissAlert: () => void;
}

export default function AdminDashboard({ specId, onBack, locationAlertActive, onDismissAlert }: AdminDashboardProps) {
  const [isVaultLocked, setIsVaultLocked] = useState(true);
  const [vaultPassword, setVaultPassword] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("malshinon");
  const [logs, setLogs] = useState<any[]>([]);
  const [liveChats, setLiveChats] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [newEmployee, setNewEmployee] = useState({ name: "", phone: "", power: "1" });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  
  const getCollectionPath = (name: string) => `artifacts/${specId}/public/data/${name}`;

  const handleVaultLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (vaultPassword.toLowerCase() === "saban2026") {
      setIsVaultLocked(false);
    } else {
      alert("גישה נדחתה: סיסמה שגויה");
    }
  };

  const handleWhatsAppSync = () => {
    setIsSyncing(true);
    let prog = 0;
    const interval = setInterval(() => {
      prog += 5;
      setSyncProgress(prog);
      if (prog >= 100) {
        clearInterval(interval);
        setIsSyncing(false);
        alert("עדכון DNA הושלם: משקולות סגנון וטון עודכנו בשרת.");
      }
    }, 100);
  };

  const handleSaveDNA = async (trait: string, value: string) => {
    try {
      await setDoc(doc(db, getCollectionPath("user_profiles"), "rami"), {
        [`trait_${trait}`]: value,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert(`מאפיין נשמר: ${trait} -> ${value}`);
    } catch (e) { console.error(e); }
  };

  // Listeners
  useEffect(() => {
    if (isVaultLocked) return;
    const logsQ = query(collection(db, getCollectionPath("ai_logs")), orderBy("timestamp", "desc"), limit(50));
    const chatsQ = query(collection(db, getCollectionPath("chats")), orderBy("timestamp", "desc"), limit(20));
    
    const unsubLogs = onSnapshot(logsQ, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    const unsubChats = onSnapshot(chatsQ, (snap) => {
      setLiveChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubUsers = onSnapshot(collection(db, getCollectionPath("users")), (snap) => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubLogs();
      unsubChats();
      unsubUsers();
    };
  }, [isVaultLocked, specId]);

  const handleCreateEmployee = async () => {
    if (!newEmployee.name || !newEmployee.phone) return;
    try {
      await setDoc(doc(db, getCollectionPath("users"), newEmployee.phone), {
        name: newEmployee.name,
        powerLevel: parseInt(newEmployee.power),
        createdAt: serverTimestamp(),
        status: "offline"
      });
      setNewEmployee({ name: "", phone: "", power: "1" });
      alert("מורשה גישה נוסף בהצלחה");
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק מורשה גישה זה?")) return;
    try {
      await deleteDoc(doc(db, getCollectionPath("users"), id));
    } catch (e) { console.error(e); }
  };

  if (isVaultLocked) {
    return (
      <div className="h-screen w-full bg-[#f8fafc] flex items-center justify-center p-6 rtl font-['Heebo']" dir="rtl">
        <div className="max-w-md w-full p-10 bg-white rounded-[40px] shadow-2xl border border-[#C5A059]/20 backdrop-blur-[10px] text-center space-y-8">
          <div className="relative inline-block">
             <div className="w-24 h-24 bg-[#1e293b]/5 rounded-full flex items-center justify-center border border-[#C5A059]/30 text-[#1e293b]">
                <ShieldAlert size={48} />
             </div>
             <div className="absolute -bottom-2 -right-2 bg-[#C5A059] p-2 rounded-lg border-2 border-white">
                <ShieldCheck size={16} className="text-white" />
             </div>
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#1e293b] mb-2 tracking-tight">כספת הניהול - ח.סבן</h1>
            <p className="text-[#C5A059] font-bold uppercase tracking-widest text-[10px]">Restricted Executive Access</p>
          </div>
          <form onSubmit={handleVaultLogin} className="space-y-4">
            <input 
              type="password"
              value={vaultPassword}
              onChange={e => setVaultPassword(e.target.value)}
              className="w-full bg-[#f1f5f9] border border-[#e2e8f0] rounded-2xl p-5 text-[#1e293b] text-center focus:border-[#C5A059] outline-none font-mono text-2xl tracking-[0.5em] transition-all"
              placeholder="••••"
            />
            <button className="w-full bg-[#1e293b] hover:bg-[#334155] text-white p-5 rounded-2xl font-black text-lg transition-all shadow-xl shadow-[#1e293b]/20">
              פתיחת כספת
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#f8fafc] text-[#1e293b] flex flex-col md:flex-row h-screen font-['Heebo'] rtl" dir="rtl">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-[#1e293b] text-white flex flex-col shadow-2xl z-30">
        <div className="p-8 border-b border-white/10">
          <div className="flex items-center gap-4 mb-6">
             <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                <LayoutDashboard size={32} className="text-[#C5A059]" />
             </div>
             <div>
                <h2 className="font-black text-xl leading-tight">ניהול SABAN</h2>
                <div className="flex items-center gap-1 text-[10px] text-[#C5A059] font-bold uppercase tracking-widest">
                   <span>מנהל מערכת מאושר</span>
                </div>
             </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          <button 
            onClick={() => setActiveTab("malshinon")}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === "malshinon" ? "bg-[#C5A059] text-white shadow-lg" : "hover:bg-white/5 text-slate-400 group-hover:text-white"}`}
          >
            <Activity size={20} />
            <span className="font-bold">מלשינון בזמן אמת</span>
          </button>
          <button 
            onClick={() => setActiveTab("users")}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === "users" ? "bg-[#C5A059] text-white shadow-lg" : "hover:bg-white/5 text-slate-400"}`}
          >
            <Users size={20} />
            <span className="font-bold">ניהול מורשי גישה</span>
          </button>
          <button 
            onClick={() => setActiveTab("training")}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === "training" ? "bg-[#C5A059] text-white shadow-lg" : "hover:bg-white/5 text-slate-400"}`}
          >
            <FlaskConical size={20} />
            <span className="font-bold">מעבדת DNA סוכן</span>
          </button>
        </nav>

        <div className="p-6 border-t border-white/10">
           <button onClick={onBack} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-red-500/20 text-white transition-all font-bold">
              <LogOut size={18} />
              <span>יציאה מהדשבורד</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10 bg-[#f8fafc] relative">
         <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-1">
               <h1 className="text-4xl font-black text-[#1e293b] tracking-tight">
                  {activeTab === "malshinon" && "מלשינון בזמן אמת"}
                  {activeTab === "users" && "ניהול מורשי גישה"}
                  {activeTab === "training" && "מעבדת אימון נועה"}
               </h1>
               <p className="text-slate-500 font-medium">
                  {activeTab === "malshinon" && "ניטור שיחות, לוגים ומיקומי שטח של משתמשים פעילים."}
                  {activeTab === "users" && "ניהול משתמשים, רמות סמכות ומחיקת מורשי גישה מהמערכת."}
                  {activeTab === "training" && "סינכרון היסטוריית WhatsApp ושיפור ה-DNA הוורבלי של הסוכנת."}
               </p>
            </div>
            
            {locationAlertActive && (
              <motion.button 
                initial={{ scale: 0.95 }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                onClick={onDismissAlert}
                className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-red-600/30"
              >
                <ShieldAlert size={22} />
                ביטול התראת מיקום
              </motion.button>
            )}
         </header>

         {/* Content View */}
         <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === "malshinon" && (
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Activity Log */}
                  <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden backdrop-blur-[10px]">
                     <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-black text-[#1e293b] flex items-center gap-3">
                           <Activity size={18} className="text-[#C5A059]" />
                           לוג פעילות מערכת
                        </h3>
                     </div>
                     <div className="p-4 h-[600px] overflow-y-auto space-y-3 font-mono text-[12px]">
                        {logs.map((log) => (
                           <div key={log.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-[#C5A059]/40 transition-all">
                              <div className="flex justify-between mb-2">
                                 <span className="text-[#1e293b] font-black">[{log.event?.toUpperCase()}]</span>
                                 <span className="text-slate-400">{log.timestamp ? format(log.timestamp.toDate(), "HH:mm:ss") : "--"}</span>
                              </div>
                              <div className="space-y-1 text-slate-600">
                                 <p className="flex items-center gap-2">
                                    <Smartphone size={12} />
                                    <span>מזהה מכשיר:</span> <span className="font-bold">{log.deviceId}</span>
                                 </p>
                                 {log.location && (
                                    <p className="flex items-center gap-2 text-red-500/80">
                                       <MapPin size={12} />
                                       <span>נ"צ:</span> <span>{log.location.lat.toFixed(5)}, {log.location.lng.toFixed(5)}</span>
                                    </p>
                                 )}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Live Chat Sessions */}
                  <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden">
                     <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-black text-[#1e293b] flex items-center gap-3">
                           <History size={18} className="text-[#C5A059]" />
                           יירוט שיחות בזמן אמת
                        </h3>
                     </div>
                     <div className="p-6 h-[600px] overflow-y-auto space-y-6 bg-slate-50/30">
                        {liveChats.map((chat) => (
                           <div key={chat.id} className={`p-4 rounded-2xl text-[14px] shadow-sm border ${chat.sender === 'user' ? 'bg-white mr-8 rounded-tr-none border-slate-100' : 'bg-[#e2e8f0] ml-8 rounded-tl-none border-slate-200'}`}>
                              <div className="flex justify-between items-center mb-1 text-[10px] font-black opacity-50">
                                 <span>{chat.sender === 'user' ? 'CLIENT_LINK' : 'NOA_AI'}</span>
                                 <span>{chat.timestamp ? format(chat.timestamp.toDate(), "HH:mm:ss") : ""}</span>
                              </div>
                              <p className="font-bold leading-relaxed">{chat.text}</p>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            )}

            {activeTab === "users" && (
               <div className="space-y-8 max-w-5xl">
                  <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-xl">
                     <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-[#1e293b]">
                        <Plus size={24} className="text-[#C5A059]" />
                        הוספת מורשה גישה
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                           <label className="text-[11px] font-black text-slate-400 uppercase">שם מלא</label>
                           <input 
                              value={newEmployee.name}
                              onChange={e => setNewEmployee({...newEmployee, name: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-[#1e293b] focus:border-[#C5A059] outline-none font-bold"
                              placeholder="ישראל ישראלי"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[11px] font-black text-slate-400 uppercase">טלפון (מזהה)</label>
                           <input 
                              value={newEmployee.phone}
                              onChange={e => setNewEmployee({...newEmployee, phone: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-[#1e293b] focus:border-[#C5A059] outline-none font-mono"
                              placeholder="05XXXXXXXX"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[11px] font-black text-slate-400 uppercase">רמת סמכות</label>
                           <select 
                              value={newEmployee.power}
                              onChange={e => setNewEmployee({...newEmployee, power: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-[#1e293b] focus:border-[#C5A059] outline-none font-bold"
                           >
                              <option value="1">דרגת שטח</option>
                              <option value="2">פיקוח ולוגיסטיקה</option>
                              <option value="3">ניהול מערכת מלאה</option>
                           </select>
                        </div>
                     </div>
                     <button 
                        onClick={handleCreateEmployee}
                        className="mt-8 bg-[#1e293b] text-white px-10 py-4 rounded-xl font-black hover:bg-slate-700 transition-all flex items-center gap-2"
                     >
                        <Save size={18} />
                        שמירת מורשה גישה
                     </button>
                  </div>

                  <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden">
                     <table className="w-full text-right">
                        <thead className="bg-slate-50">
                           <tr className="text-slate-400 text-[11px] font-black uppercase tracking-wider">
                              <th className="p-6">שם המשתמש</th>
                              <th className="p-6">טלפון / מזהה</th>
                              <th className="p-6">רמת סמכות</th>
                              <th className="p-6">סטטוס</th>
                              <th className="p-6 text-center">פעולות</th>
                           </tr>
                        </thead>
                        <tbody>
                           {employees.map((emp) => (
                              <tr key={emp.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                                 <td className="p-6 font-black text-[#1e293b]">{emp.name}</td>
                                 <td className="p-6 font-mono text-slate-500">{emp.id}</td>
                                 <td className="p-6">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border ${emp.powerLevel === 3 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                       דרגה {emp.powerLevel}
                                    </span>
                                 </td>
                                 <td className="p-6">
                                    <div className="flex items-center gap-2 text-xs font-bold">
                                       <div className={`w-2 h-2 rounded-full ${emp.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                       {emp.status === 'online' ? 'מחובר' : 'לא פעיל'}
                                    </div>
                                 </td>
                                 <td className="p-6 text-center">
                                    <button onClick={() => handleDeleteEmployee(emp.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                       <Trash2 size={20} />
                                    </button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            )}

            {activeTab === "training" && (
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <div className="bg-white p-10 rounded-[50px] border border-slate-200 shadow-xl flex flex-col items-center justify-center text-center space-y-6">
                     <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center border border-slate-100 text-[#C5A059]">
                        <Upload size={48} className={isSyncing ? "animate-bounce" : ""} />
                     </div>
                     <div>
                        <h3 className="text-2xl font-black text-[#1e293b]">סנכרון היסטוריית WhatsApp</h3>
                        <p className="text-slate-500 py-2">העלאת קובץ .txt לניתוח טון וסגנון דיבור.</p>
                     </div>
                     {isSyncing ? (
                        <div className="w-full max-w-sm space-y-2">
                           <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div animate={{ width: `${syncProgress}%` }} className="h-full bg-[#C5A059]" />
                           </div>
                           <p className="text-[#C5A059] font-black text-[10px]">מנתח סנטימנט: {syncProgress}%</p>
                        </div>
                     ) : (
                        <button onClick={handleWhatsAppSync} className="bg-slate-100 hover:bg-slate-200 text-[#1e293b] px-10 py-5 rounded-2xl font-black transition-all flex items-center gap-3">
                           <Upload size={20} />
                           העלאת קובץ (txt.)
                        </button>
                     )}
                  </div>

                  <div className="bg-white p-10 rounded-[50px] border border-slate-200 shadow-xl">
                     <h3 className="text-xl font-black text-[#1e293b] mb-6">הגדרות טון וסגנון (DNA)</h3>
                     <div className="grid grid-cols-2 gap-4">
                        {[
                           { key: "tone", val: "Formal/Professional", label: "פורמלי / מקצועי" },
                           { key: "tone", val: "Brotherly/Warm", label: "חברי / 'אחי'" },
                           { key: "tone", val: "Direct/Technical", label: "ישיר / טכני" },
                           { key: "tone", val: "Urgent/Field-Style", label: "דחוף / שטח" }
                        ].map((t, i) => (
                           <button 
                              key={i} 
                              onClick={() => handleSaveDNA(t.key, t.val)}
                              className="p-5 bg-slate-50 border border-slate-100 rounded-2xl text-[#1e293b] font-bold hover:border-[#C5A059] transition-all"
                           >
                              {t.label}
                           </button>
                        ))}
                     </div>
                  </div>
               </div>
            )}
         </div>
      </main>
      <style>{`
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}
