import React, { useState, useEffect, useRef } from "react";
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
  LogOut
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
  doc
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

export default function AdminDashboard({ userId, specId, onBack, locationAlertActive, onDismissAlert }: AdminDashboardProps) {
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
      alert("ACCESS DENIED: Credentials Invalid");
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
        alert("DNA NEURAL WEIGHTS UPDATED: Style: Urgent/Professional, Slang: Low, Urgency: High");
      }
    }, 100);
  };

  const handleSaveDNA = async (trait: string, value: string) => {
    try {
      await setDoc(doc(db, getCollectionPath("user_profiles"), "rami"), {
        [`trait_${trait}`]: value,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert(`TRAIT SAVED: ${trait} -> ${value}`);
    } catch (e) { console.error(e); }
  };

  // Malshinon Listeners
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

    const unsubUsers = onSnapshot(collection(db, getCollectionPath("user_settings")), (snap) => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubLogs();
      unsubChats();
      unsubUsers();
    };
  }, []);

  const handleCreateEmployee = async () => {
    if (!newEmployee.name || !newEmployee.phone) return;
    try {
      await setDoc(doc(db, getCollectionPath("user_settings"), newEmployee.phone), {
        name: newEmployee.name,
        powerLevel: parseInt(newEmployee.power),
        createdAt: serverTimestamp(),
      });
      setNewEmployee({ name: "", phone: "", power: "1" });
    } catch (e) {
      console.error(e);
    }
  };

  const NOA_AVATAR = "https://i.postimg.cc/qqLm9M5t/Gemini-Generated-Image-gmd5k7gmd5k7gmd5.png";

  if (isVaultLocked) {
    return (
      <div className="h-screen w-full bg-[#0b141a] flex items-center justify-center p-6 rtl" dir="rtl">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="relative inline-block">
             <div className="w-24 h-24 bg-[#00a884]/10 rounded-full flex items-center justify-center border border-[#00a884]/30 text-[#00a884]">
                <ShieldAlert size={48} />
             </div>
             <div className="absolute -bottom-2 -right-2 bg-red-600 p-2 rounded-lg border-2 border-[#0b141a]">
                <Activity size={16} className="text-white" />
             </div>
          </div>
          <div>
            <h1 className="text-3xl font-black text-white mb-2">SabanOS Executive Vault</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Restricted Sentinel Access</p>
          </div>
          <form onSubmit={handleVaultLogin} className="space-y-4">
            <input 
              type="password"
              value={vaultPassword}
              onChange={e => setVaultPassword(e.target.value)}
              className="w-full bg-[#202c33] border border-white/5 rounded-2xl p-5 text-white text-center focus:border-[#00a884] outline-none font-mono text-2xl tracking-[0.5em]"
              placeholder="••••"
            />
            <button className="w-full bg-[#00a884] hover:bg-[#06cf9c] text-white p-5 rounded-2xl font-black text-lg transition-all shadow-xl shadow-[#00a884]/20">
              UNLOCK VAULT
            </button>
          </form>
          <div className="pt-8 flex justify-center gap-4">
             <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold uppercase">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                NODE_ENCRYPTED
             </div>
             <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold uppercase">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                RADAR_ACTIVE
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#0b141a] text-slate-200 flex flex-col md:flex-row overflow-hidden font-heebo rtl" dir="rtl">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-[#111b21] border-l border-[#202c33] flex flex-col shadow-2xl z-30">
        <div className="p-8 border-b border-[#202c33]">
          <div className="flex items-center gap-4 mb-6">
             <div className="relative">
                <img src={NOA_AVATAR} className="w-14 h-14 rounded-full border-2 border-white/10" alt="Admin" />
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#25d366] border-2 border-[#111b21] rounded-full"></div>
             </div>
             <div>
                <h2 className="font-bold text-white text-lg leading-tight">SabanOS Panel</h2>
                <div className="flex items-center gap-1 text-[10px] text-[#00a884] font-bold uppercase tracking-widest">
                   <ShieldAlert size={12} />
                   <span>Authorized Access</span>
                </div>
             </div>
          </div>
          <div className="bg-[#202c33] rounded-xl p-3 border border-white/5">
             <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Instance Node</p>
             <p className="text-xs font-mono text-blue-400 truncate">{specId}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-3 mt-4">
          <button 
            onClick={() => setActiveTab("malshinon")}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${activeTab === "malshinon" ? "bg-[#00a884] text-white shadow-lg shadow-[#00a884]/20 scale-[1.02]" : "hover:bg-[#202c33] text-slate-400 hover:text-white"}`}
          >
            <Activity size={22} />
            <span className="font-bold">המלשינון (Live)</span>
          </button>
          <button 
            onClick={() => setActiveTab("users")}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${activeTab === "users" ? "bg-[#00a884] text-white shadow-lg shadow-[#00a884]/20 scale-[1.02]" : "hover:bg-[#202c33] text-slate-400 hover:text-white"}`}
          >
            <Users size={22} />
            <span className="font-bold">ניהול היררכיה</span>
          </button>
          <button 
            onClick={() => setActiveTab("training")}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${activeTab === "training" ? "bg-[#00a884] text-white shadow-lg shadow-[#00a884]/20 scale-[1.02]" : "hover:bg-[#202c33] text-slate-400 hover:text-white"}`}
          >
            <FlaskConical size={22} />
            <span className="font-bold">מעבדת Persona</span>
          </button>
        </nav>

        <div className="p-6 border-t border-[#202c33]">
           <button onClick={onBack} className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-red-500/10 text-red-500 transition-all font-bold">
              <LogOut size={20} />
              <span>חזרה לממשק צ'אט</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10 bg-[#0b141a] relative">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#00a884]/5 blur-[150px] pointer-events-none"></div>
         
         <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-2">
               <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-tighter mb-2 border border-blue-500/20">
                  <LayoutDashboard size={12} />
                  System Monitoring Node
               </div>
               <h1 className="text-4xl font-black text-white tracking-tight">
                  {activeTab === "malshinon" && "Real-Time Audit Log"}
                  {activeTab === "users" && "User Access Control"}
                  {activeTab === "training" && "Noa Agent Lab"}
               </h1>
               <p className="text-slate-500 text-lg max-w-2xl leading-relaxed">
                  {activeTab === "malshinon" && "ניטור חי של תעבורת הודעות, נתוני מיקום ומזהי מכשירים ייחודיים."}
                  {activeTab === "users" && "ניהול סמכויות והגדרת דרגי פיקוד בארגון ח.סבן."}
                  {activeTab === "training" && "אימון הבינה המלאכותית על בסיס ה-DNA התקשורתי של רמי."}
               </p>
            </div>
            
            {locationAlertActive && (
              <motion.button 
                initial={{ scale: 0.8 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                onClick={onDismissAlert}
                className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 animate-pulse shadow-xl shadow-red-600/40"
              >
                <ShieldAlert size={24} />
                DISMISS LOCATION ALERT
              </motion.button>
            )}
         </header>

         {/* Malshinon Tab */}
         {activeTab === "malshinon" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
               {/* Activity Log */}
               <div className="bg-[#111b21] rounded-[32px] border border-[#202c33] overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-[#202c33] flex justify-between items-center bg-[#202c33]/50">
                     <h3 className="font-bold flex items-center gap-3">
                        <Activity size={20} className="text-[#00a884]" />
                        System Activity Stream
                     </h3>
                     <span className="text-[10px] bg-[#00a884]/20 border border-[#00a884]/30 px-3 py-1 rounded-full text-[#00a884] font-black">ENCRYPTED FEED</span>
                  </div>
                  <div className="p-4 h-[550px] overflow-y-auto custom-scrollbar font-mono text-[11px] space-y-2">
                     {logs.map((log) => (
                        <div key={log.id} className="p-4 bg-[#202c33]/30 rounded-2xl border border-white/5 hover:border-[#00a884]/30 transition-all group">
                           <div className="flex justify-between mb-2">
                              <span className="text-[#00a884] font-bold">[{log.event.toUpperCase()}]</span>
                              <span className="text-slate-500 font-bold">{log.timestamp ? format(log.timestamp.toDate(), "HH:mm:ss") : "--:--:--"}</span>
                           </div>
                           <div className="space-y-1.5 text-slate-300">
                              <p className="flex items-center gap-2">
                                 <Smartphone size={12} className="text-slate-500" />
                                 <span className="text-slate-500">Device:</span> <span className="text-slate-400 font-bold">{log.deviceId}</span>
                              </p>
                              {log.location && (
                                 <p className="flex items-center gap-2">
                                    <MapPin size={12} className="text-red-500/70" />
                                    <span className="text-slate-500">Loc:</span> <span className="text-red-400/80">{log.location.lat.toFixed(6)}, {log.location.lng.toFixed(6)}</span>
                                 </p>
                              )}
                              <div className="mt-2 p-2 bg-black/20 rounded-lg text-[9px] text-[#00a884]/60 break-all leading-tight">
                                 {JSON.stringify(log.metadata)}
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Live Chats Audit */}
               <div className="bg-[#111b21] rounded-[32px] border border-[#202c33] overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-[#202c33] flex justify-between items-center bg-[#202c33]/50">
                     <h3 className="font-bold flex items-center gap-3">
                        <History size={20} className="text-blue-400" />
                        Live Interception
                     </h3>
                  </div>
                  <div className="p-6 h-[550px] overflow-y-auto custom-scrollbar space-y-6 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-fixed opacity-90">
                     {liveChats.map((chat) => (
                        <div key={chat.id} className={`p-4 rounded-2xl text-sm relative ${chat.sender === 'user' ? 'bg-[#202c33] mr-10 rounded-tr-none' : 'bg-[#005c4b] ml-10 rounded-tl-none text-white'}`}>
                           <div className="flex justify-between items-center mb-2">
                              <span className={`text-[10px] font-black tracking-widest ${chat.sender === 'user' ? 'text-[#00a884]' : 'text-slate-200'}`}>
                                 {chat.sender === 'user' ? 'CLIENT_NODE' : 'NOA_SYSTEM'}
                              </span>
                              <span className="text-[9px] opacity-50 font-mono">
                                 UID: {chat.userId?.slice(0, 10)}
                              </span>
                           </div>
                           <p className="leading-relaxed font-medium">{chat.text}</p>
                           {chat.location && (
                              <div className="mt-3 flex items-center gap-2 text-[10px] bg-black/20 p-2 rounded-lg text-red-400 border border-red-500/20">
                                 <MapPin size={12} />
                                 GPS COORDINATES ATTACHED
                              </div>
                           )}
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         )}

         {/* Users Tab */}
         {activeTab === "users" && (
            <div className="space-y-10 animate-in fade-in slide-in-from-left-6 duration-700">
               <div className="bg-[#111b21] p-10 rounded-[40px] border border-[#202c33] shadow-2xl max-w-5xl">
                  <h3 className="text-2xl font-black mb-8 flex items-center gap-4 text-white">
                     <Users size={28} className="text-[#00a884]" />
                     הרשאת עובד חדש
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 text-right">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">שם מלא</label>
                        <input 
                           value={newEmployee.name}
                           onChange={e => setNewEmployee({...newEmployee, name: e.target.value})}
                           className="w-full bg-[#202c33] border border-white/5 rounded-2xl p-4 text-white focus:border-[#00a884] outline-none transition-all placeholder:text-slate-600 font-bold"
                           placeholder="ישראל ישראלי"
                        />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">זיהוי (UID/Phone)</label>
                        <input 
                           value={newEmployee.phone}
                           onChange={e => setNewEmployee({...newEmployee, phone: e.target.value})}
                           className="w-full bg-[#202c33] border border-white/5 rounded-2xl p-4 text-white focus:border-[#00a884] outline-none transition-all placeholder:text-slate-600 font-mono"
                           placeholder="05X-XXXXXXX"
                        />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">רמת סיווג</label>
                        <select 
                           value={newEmployee.power}
                           onChange={e => setNewEmployee({...newEmployee, power: e.target.value})}
                           className="w-full bg-[#202c33] border border-white/5 rounded-2xl p-4 text-white focus:border-[#00a884] outline-none transition-all font-bold appearance-none cursor-pointer"
                        >
                           <option value="1">Rank 1: Field Unit</option>
                           <option value="2">Rank 2: Command Center</option>
                           <option value="3">Rank 3: System Admin</option>
                        </select>
                     </div>
                  </div>
                  <button 
                     onClick={handleCreateEmployee}
                     className="bg-[#00a884] hover:bg-[#06cf9c] text-white px-12 py-5 rounded-2xl font-black flex items-center gap-3 transition-all shadow-xl shadow-[#00a884]/20 active:scale-95"
                  >
                     <Save size={22} />
                     Commit changes to Database
                  </button>
               </div>

               <div className="bg-[#111b21] rounded-[40px] border border-[#202c33] overflow-hidden shadow-2xl max-w-5xl">
                   <table className="w-full text-right border-collapse">
                      <thead className="bg-[#202c33] border-b border-white/5">
                         <tr>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Node ID</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identified Name</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Level</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                         </tr>
                      </thead>
                      <tbody>
                         {employees.map((emp) => (
                            <tr key={emp.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                               <td className="p-6 font-mono text-slate-400 group-hover:text-blue-400 transition-colors uppercase">{emp.id}</td>
                               <td className="p-6 font-black text-white text-lg">{emp.name || "UNIDENTIFIED"}</td>
                               <td className="p-6">
                                  <div className="flex items-center gap-2">
                                     <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border ${emp.powerLevel === 3 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-[#00a884]/10 text-[#00a884] border-[#00a884]/20'}`}>
                                        CLASS_{emp.powerLevel || 1}
                                     </div>
                                  </div>
                               </td>
                               <td className="p-6">
                                  <div className="flex items-center gap-3">
                                     <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_2px_rgba(37,211,102,0.3)] ${emp.status === 'online' ? 'bg-[#25d366] animate-pulse' : 'bg-slate-700'}`}></div>
                                     <span className={`text-xs font-bold ${emp.status === 'online' ? 'text-[#25d366]' : 'text-slate-500'}`}>
                                        {emp.status === 'online' ? 'SIGNAL_ACTIVE' : 'SIGNAL_LOST'}
                                     </span>
                                  </div>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
               </div>
            </div>
         )}

         {/* Training Tab */}
         {activeTab === "training" && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 animate-in fade-in zoom-in-95 duration-1000">
               {/* WhatsApp Sync */}
               <div className="bg-[#111b21] p-12 rounded-[50px] border border-[#202c33] shadow-2xl flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#00a884]/40"></div>
                  <div className="w-28 h-28 bg-[#00a884]/10 rounded-[40px] flex items-center justify-center border border-[#00a884]/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                     <Upload size={56} className={`${isSyncing ? "animate-bounce" : ""} text-[#00a884]`} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white mb-3">WhatsApp DNA Sync</h3>
                    <p className="text-slate-500 text-base leading-relaxed">העלה היסטוריית שיחות למידול ורבלי של הסוכן.</p>
                  </div>
                  
                  {isSyncing ? (
                    <div className="w-full space-y-4">
                       <div className="h-4 bg-[#202c33] rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${syncProgress}%` }}
                            className="h-full bg-[#00a884] shadow-[0_0_15px_#00a884]"
                          />
                       </div>
                       <p className="text-[#00a884] font-black text-xs animate-pulse">ANALYZING SENTIMENT: {syncProgress}%</p>
                    </div>
                  ) : (
                    <button 
                      onClick={handleWhatsAppSync}
                      className="w-full bg-[#202c33] border border-white/5 hover:border-[#00a884]/40 p-5 rounded-3xl font-black text-white transition-all flex items-center justify-center gap-4 text-lg"
                    >
                       <Upload size={24} />
                       Upload Protocol .txt
                    </button>
                  )}
                  
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Neural weights will be updated upon completion</p>
               </div>

               {/* Ping-Pong Lab */}
               <div className="xl:col-span-2 bg-[#111b21] rounded-[50px] border border-[#202c33] h-[700px] flex flex-col shadow-2xl overflow-hidden">
                  <div className="p-8 border-b border-[#202c33] bg-[#202c33]/30 flex justify-between items-center">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                           <FlaskConical size={24} />
                        </div>
                        <div>
                           <h3 className="font-black text-xl text-white">Neural Interrogation Lab</h3>
                           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Subject: Rami Node 04</p>
                        </div>
                     </div>
                     <span className="text-[10px] bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-full font-black uppercase tracking-widest animate-pulse">MODE: INTERROGATION</span>
                  </div>
                  
                  <div className="flex-1 p-8 overflow-y-auto space-y-8 custom-scrollbar bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-opacity-5">
                     <div className="flex justify-start">
                        <div className="bg-[#202c33] p-6 rounded-[32px] rounded-tr-none max-w-lg border border-white/5 shadow-xl">
                           <p className="text-sm font-bold text-slate-200 leading-relaxed">שלום רמי. בוא נקבע את הטון התקשורתי. איך נועה צריכה לפנות אליך בדרך כלל?</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4 mt-4">
                        <button onClick={() => handleSaveDNA("tone", "Formal/Professional")} className="p-4 bg-[#202c33] border border-white/5 rounded-2xl hover:border-[#00a884] transition-all text-white font-bold">פורמלי / מקצועי</button>
                        <button onClick={() => handleSaveDNA("tone", "Brotherly/Warm")} className="p-4 bg-[#202c33] border border-white/5 rounded-2xl hover:border-[#00a884] transition-all text-white font-bold">חברי / "אחי"</button>
                        <button onClick={() => handleSaveDNA("tone", "Direct/Technical")} className="p-4 bg-[#202c33] border border-white/5 rounded-2xl hover:border-[#00a884] transition-all text-white font-bold">ישיר / טכני</button>
                        <button onClick={() => handleSaveDNA("tone", "Urgent/Field-Style")} className="p-4 bg-[#202c33] border border-white/5 rounded-2xl hover:border-[#00a884] transition-all text-white font-bold">דחוף / שטח</button>
                     </div>
                  </div>

                  <div className="p-8 bg-[#202c33]/50 border-t border-[#202c33]">
                     <div className="flex gap-6">
                        <input className="flex-1 bg-black/20 border border-white/5 rounded-[24px] p-5 focus:border-[#00a884] outline-none text-white font-bold" placeholder="Submit interrogation response..." />
                        <button className="bg-[#00a884] p-5 rounded-[24px] text-white hover:scale-105 transition-transform shadow-xl shadow-[#00a884]/20">
                           <ChevronRight size={32} />
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </main>

      {/* Styled Scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  );
}
