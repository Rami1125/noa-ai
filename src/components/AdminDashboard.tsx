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
}

export default function AdminDashboard({ userId, specId, onBack }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("malshinon");
  const [logs, setLogs] = useState<any[]>([]);
  const [liveChats, setLiveChats] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [newEmployee, setNewEmployee] = useState({ name: "", phone: "", power: "1" });
  
  const getCollectionPath = (name: string) => `artifacts/${specId}/public/data/${name}`;

  // Malshinon Listeners
  useEffect(() => {
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

  return (
    <div className="flex-1 bg-[#0f172a] text-slate-200 flex flex-col md:flex-row overflow-hidden font-sans rtl" dir="rtl">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#1e293b] border-l border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3 text-blue-400 mb-2">
            <ShieldAlert size={24} />
            <h2 className="font-bold text-lg tracking-tight">SabanOS Admin</h2>
          </div>
          <p className="text-xs text-slate-400">Node ID: {specId.slice(0, 8)}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab("malshinon")}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === "malshinon" ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "hover:bg-slate-700"}`}
          >
            <Activity size={20} />
            <span>המלשינון (Live)</span>
          </button>
          <button 
            onClick={() => setActiveTab("users")}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === "users" ? "bg-blue-600 text-white" : "hover:bg-slate-700"}`}
          >
            <Users size={20} />
            <span>ניהול הרשאות</span>
          </button>
          <button 
            onClick={() => setActiveTab("training")}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === "training" ? "bg-blue-600 text-white" : "hover:bg-slate-700"}`}
          >
            <FlaskConical size={20} />
            <span>מעבדת אימון Noa</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-700">
           <button onClick={onBack} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 text-red-400 transition-all">
              <LogOut size={20} />
              <span>יציאה מהמסוף</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#0f172a] relative">
         <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 blur-[120px] pointer-events-none"></div>
         
         <header className="mb-8 flex justify-between items-end">
            <div>
               <h1 className="text-3xl font-bold text-white mb-2 underline decoration-blue-500 decoration-4 underline-offset-8">
                  {activeTab === "malshinon" && "המלשינון - ניטור זמן אמת"}
                  {activeTab === "users" && "ניהול היררכיה ארגונית"}
                  {activeTab === "training" && "Agent Training Laboratory"}
               </h1>
               <p className="text-slate-400 leading-relaxed">
                  {activeTab === "malshinon" && "מעקב אחר אינטראקציות, מיקומים ומזהי מכשירים ברחבי הפלטפורמה."}
                  {activeTab === "users" && "הגדרת סמכויות, ניהול עובדים ובקרת גישה למערכת."}
                  {activeTab === "training" && "אימון 'נועה' על בסיס היסטוריית WhatsApp וסימולציות DNA."}
               </p>
            </div>
            <div className="bg-[#1e293b] p-3 rounded-2xl border border-slate-700 shadow-xl hidden md:block">
               <div className="flex items-center gap-4">
                  <div className="text-left">
                     <p className="text-[10px] text-slate-500 uppercase font-bold">System Status</p>
                     <p className="text-green-400 text-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Synchronized
                     </p>
                  </div>
                  <History className="text-slate-500" size={20} />
               </div>
            </div>
         </header>

         {/* Malshinon Tab */}
         {activeTab === "malshinon" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {/* Activity Log */}
               <div className="bg-[#1e293b]/50 backdrop-blur-xl rounded-3xl border border-slate-700 overflow-hidden shadow-2xl">
                  <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-[#1e293b]">
                     <h3 className="font-bold flex items-center gap-2">
                        <Activity size={18} className="text-blue-400" />
                        AI Logs & Events
                     </h3>
                     <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">LIVE FEED</span>
                  </div>
                  <div className="p-2 h-[500px] overflow-y-auto custom-scrollbar font-mono text-[11px]">
                     {logs.map((log) => (
                        <div key={log.id} className="p-3 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                           <div className="flex justify-between mb-1">
                              <span className="text-blue-400">[{log.event.toUpperCase()}]</span>
                              <span className="text-slate-500">{log.timestamp ? format(log.timestamp.toDate(), "HH:mm:ss") : "--:--:--"}</span>
                           </div>
                           <div className="space-y-1 text-slate-300">
                              <p className="flex items-center gap-1">
                                 <Smartphone size={10} className="text-slate-500" />
                                 Device: <span className="text-slate-400">{log.deviceId}</span>
                              </p>
                              {log.location && (
                                 <p className="flex items-center gap-1">
                                    <MapPin size={10} className="text-red-400/70" />
                                    Loc: {log.location.lat.toFixed(4)}, {log.location.lng.toFixed(4)}
                                 </p>
                              )}
                              <p className="text-[10px] text-slate-500 italic truncate">{JSON.stringify(log.metadata)}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Live Chats Audit */}
               <div className="bg-[#1e293b]/50 backdrop-blur-xl rounded-3xl border border-slate-700 overflow-hidden shadow-2xl">
                  <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-[#1e293b]">
                     <h3 className="font-bold flex items-center gap-2">
                        <History size={18} className="text-green-400" />
                        Live Message Stream
                     </h3>
                  </div>
                  <div className="p-4 h-[500px] overflow-y-auto custom-scrollbar space-y-4">
                     {liveChats.map((chat) => (
                        <div key={chat.id} className={`p-3 rounded-2xl text-sm border ${chat.sender === 'user' ? 'bg-slate-800 border-slate-700 mr-8' : 'bg-green-900/20 border-green-800/30 ml-8'}`}>
                           <div className="flex justify-between items-center mb-1">
                              <span className={`text-[10px] font-bold ${chat.sender === 'user' ? 'text-blue-400' : 'text-green-400'}`}>
                                 {chat.sender === 'user' ? 'USER' : 'NOA_AGENT'}
                              </span>
                              <span className="text-[10px] text-slate-500 italic">
                                 UID: {chat.userId?.slice(0, 6)}
                              </span>
                           </div>
                           <p className="text-slate-200 line-clamp-3">{chat.text}</p>
                           {chat.location && (
                              <div className="mt-2 flex items-center gap-1 text-[10px] text-red-400">
                                 <MapPin size={10} />
                                 מיקום צורף
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
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
               <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700 shadow-xl max-w-4xl">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                     <Users size={22} className="text-blue-400" />
                     רישום עובד חדש
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">שם מלא</label>
                        <input 
                           value={newEmployee.name}
                           onChange={e => setNewEmployee({...newEmployee, name: e.target.value})}
                           className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 focus:border-blue-500 outline-none transition-all"
                           placeholder="ישראל ישראלי"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">טלפון (UID)</label>
                        <input 
                           value={newEmployee.phone}
                           onChange={e => setNewEmployee({...newEmployee, phone: e.target.value})}
                           className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 focus:border-blue-500 outline-none transition-all"
                           placeholder="052-1234567"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">דרגת הרשאה</label>
                        <select 
                           value={newEmployee.power}
                           onChange={e => setNewEmployee({...newEmployee, power: e.target.value})}
                           className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 focus:border-blue-500 outline-none transition-all"
                        >
                           <option value="1">דרג 1 - עובד שטח</option>
                           <option value="2">דרג 2 - משרד</option>
                           <option value="3">דרג 3 - מנהל מערכת</option>
                        </select>
                     </div>
                  </div>
                  <button 
                     onClick={handleCreateEmployee}
                     className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
                  >
                     <Save size={18} />
                     שמור עובד
                  </button>
               </div>

               <div className="bg-[#1e293b]/50 rounded-3xl border border-slate-700 overflow-hidden shadow-xl max-w-4xl">
                   <table className="w-full text-right">
                      <thead className="bg-[#1e293b] border-b border-slate-700">
                         <tr>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase">עובד</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase">UID / טלפון</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase">הרשאה</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase">סטטוס</th>
                         </tr>
                      </thead>
                      <tbody>
                         {employees.map((emp) => (
                            <tr key={emp.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                               <td className="p-4 font-bold">{emp.name || "ללא שם"}</td>
                               <td className="p-4 text-slate-400 font-mono">{emp.id}</td>
                               <td className="p-4">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${emp.powerLevel === 3 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                     LEVEL {emp.powerLevel || 1}
                                  </span>
                               </td>
                               <td className="p-4">
                                  <div className="flex items-center gap-2">
                                     <div className={`w-2 h-2 rounded-full ${emp.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
                                     <span className="text-xs">{emp.status === 'online' ? 'מחובר' : 'לא פעיל'}</span>
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
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in zoom-in-95 duration-500">
               {/* WhatsApp Sync */}
               <div className="bg-[#1e293b] p-8 rounded-[40px] border border-slate-700 shadow-2xl flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center border-2 border-green-500/20 shadow-inner">
                     <Upload size={48} className="text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">WhatsApp Sync</h3>
                    <p className="text-slate-400 text-sm">העלה קובץ .txt של גיבוי צ'אט כדי לאמן את נועה על סגנון הדיבור שלך.</p>
                  </div>
                  <button className="w-full bg-slate-900 border border-slate-700 hover:border-green-500/50 py-4 rounded-2xl font-bold text-slate-300 transition-all flex items-center justify-center gap-3">
                     <Upload size={20} />
                     בחר קובץ להעלאה
                  </button>
                  <p className="text-[10px] text-slate-500 italic">Noa parses message frequency, emojis, and sentence structure.</p>
               </div>

               {/* Ping-Pong Lab */}
               <div className="xl:col-span-2 bg-slate-900/50 backdrop-blur-2xl rounded-[40px] border border-slate-700 h-[600px] flex flex-col shadow-2xl overflow-hidden">
                  <div className="p-6 border-b border-slate-700 bg-slate-900 flex justify-between items-center">
                     <div className="flex items-center gap-3">
                        <FlaskConical className="text-blue-400" />
                        <h3 className="font-bold text-lg">Persona Training Node (Rami Node)</h3>
                     </div>
                     <span className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-bold">MODE: INTERROGATION</span>
                  </div>
                  
                  <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar">
                     <div className="flex justify-start">
                        <div className="bg-slate-800 p-4 rounded-3xl rounded-tr-none max-w-md border border-slate-700">
                           <p className="text-sm">שלום רמי. בוא נתחיל לבנות את ה-DNA של משתמש קצה. האם המשתמש 'אבי כהן' מזמין בדרך כלל דבק לפני שהמלאי נגמר, או רק כשהוא נתקע?</p>
                        </div>
                     </div>
                     <div className="flex justify-end">
                        <div className="bg-blue-600 p-4 rounded-3xl rounded-tl-none max-w-md shadow-xl shadow-blue-600/10">
                           <p className="text-sm">אבי הוא קבלן מסודר. הוא בדרך כלל מזמין דבק בתחילת כל שבוע עבודה כדי לא להיתקע.</p>
                        </div>
                     </div>
                     <div className="flex justify-start">
                        <div className="bg-slate-800 p-4 rounded-3xl rounded-tr-none max-w-md border border-slate-700">
                           <p className="text-sm">הבנתי. אני מתעדת: אבי כהן / DNA: קבלן מסודר / הרגל: הזמנה חוזרת בימי ראשון/שני. האם לקשר לו את נוהל 'הכנה מראש'?</p>
                        </div>
                     </div>
                  </div>

                  <div className="p-6 bg-slate-900 border-t border-slate-700">
                     <div className="flex gap-4">
                        <input className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl p-4 focus:border-blue-500 outline-none" placeholder="המשך את תהליך האימון..." />
                        <button className="bg-blue-600 p-4 rounded-2xl text-white hover:scale-105 transition-transform shadow-lg">
                           <ChevronRight size={24} />
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
