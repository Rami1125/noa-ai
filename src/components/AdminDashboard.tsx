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
  ShieldCheck,
  Pencil,
  Mail,
  Search,
  X
} from "lucide-react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  getDocs,
  limit, 
  where,
  setDoc,
  doc,
  deleteDoc,
  updateDoc
} from "firebase/firestore";
import { dbIntelligence as db, dbDrive } from "../lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { getNoaResponse } from "../services/geminiService";

type AdminTab = "users" | "training" | "malshinon";

interface AdminDashboardProps {
  userId: string;
  userProfile: any;
  specId: string;
  onBack: () => void;
  locationAlertActive: boolean;
  onDismissAlert: () => void;
  isSimulationMode: boolean;
  onToggleSimulation: () => void;
}

export default function AdminDashboard({ specId, onBack, locationAlertActive, onDismissAlert, userProfile, isSimulationMode, onToggleSimulation }: AdminDashboardProps) {
  const [isVaultLocked, setIsVaultLocked] = useState(true);
  const [vaultPassword, setVaultPassword] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("malshinon");
  const [logs, setLogs] = useState<any[]>([]);
  const [liveChats, setLiveChats] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [newEmployee, setNewEmployee] = useState({ name: "", phone: "", email: "", power: "דלפק", avatar: "" });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [sandboxMessages, setSandboxMessages] = useState<any[]>([]);
  const [sandboxInput, setSandboxInput] = useState("");
  const [userRules, setUserRules] = useState("");
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  const handleApplyRules = async () => {
    if (!editingEmployee || !userRules.trim()) return;
    try {
      await updateDoc(doc(db, getCollectionPath("users"), editingEmployee.id), {
        customRules: userRules,
        updatedAt: serverTimestamp()
      });
      alert(`חוקים חדשים הוחלו על ${editingEmployee.name}`);
      setUserRules("");
    } catch (e) { console.error(e); }
  };

  const handleMockImageAnalysis = () => {
     setIsAnalyzingImage(true);
     setTimeout(async () => {
        const traits = ["Dominant", "Detailed", "Logistics-Focused", "Urgent"];
        const trait = traits[Math.floor(Math.random() * traits.length)];
        if (editingEmployee) {
           await updateDoc(doc(db, getCollectionPath("users"), editingEmployee.id), {
              "dna.personality": trait,
              updatedAt: serverTimestamp()
           });
        }
        setIsAnalyzingImage(false);
        alert(`ניתוח תמונה הושלם: אישיות ${trait} זוהתה והוזרקה ל-DNA`);
     }, 2000);
  };
  const [latestMetrics, setLatestMetrics] = useState({ 
    salesPush: 91, 
    technicalAccuracy: 94, 
    personalitySync: 82,
    globalOversight: 98,
    hqEfficiency: 95
  });

  const isCeo = userProfile?.powerLevel === "מנכ״ל" || userProfile?.name?.includes("הראל");
  
  const roles = [
    "מנכ״ל",
    "מחסן",
    "מנהל חנות",
    "IT",
    "רכש",
    "סידור",
    "דלפק"
  ];
  
  const getCollectionPath = (name: string) => `artifacts/${specId}/public/data/${name}`;

  const syncAllCollections = async () => {
     setIsSyncing(true);
     setSyncProgress(0);
     try {
        const intelligenceCollections = ["ai_logs", "bridge_sessions", "chats", "internal_team_chats", "sales", "user_magic_pages", "user_settings", "users", "reminders"];
        const driveCollections = ["brands", "categories", "customers", "drivers", "encyclopedia_categories", "encyclopedia_items", "inventory", "morning_reports", "office_messages", "orders"];
        
        const allCollections = [...intelligenceCollections, ...driveCollections];
        
        for (let i = 0; i < allCollections.length; i++) {
           const coll = allCollections[i];
           const targetDb = intelligenceCollections.includes(coll) ? db : dbDrive;
           await getDocs(query(collection(targetDb, getCollectionPath(coll)), limit(1)));
           setSyncProgress(Math.floor(((i + 1) / allCollections.length) * 100));
        }
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 3000);
     } catch (e) {
        console.error("Sync error", e);
     } finally {
        setIsSyncing(false);
     }
  };

  const handleVaultLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (vaultPassword.toLowerCase() === "saban2026") {
      setIsVaultLocked(false);
    } else {
      alert("גישה נדחתה: סיסמה שגויה");
    }
  };

  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleDnaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSyncing(true);
    setSyncProgress(0);
    setSyncSuccess(false);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      try {
        await addDoc(collection(db, getCollectionPath("ai_logs")), {
          event: "dna_training",
          type: "dna_training",
          content: content.substring(0, 50000),
          filename: file.name,
          deviceId: localStorage.getItem("deviceId") || "admin",
          timestamp: serverTimestamp(),
          metrics: {
            salesPush: Math.floor(Math.random() * 20) + 80,
            technicalAccuracy: Math.floor(Math.random() * 15) + 85,
            personalitySync: Math.floor(Math.random() * 25) + 75
          }
        });

        let prog = 0;
        const interval = setInterval(() => {
          prog += 10;
          setSyncProgress(prog);
          if (prog >= 100) {
            clearInterval(interval);
            setIsSyncing(false);
            setSyncSuccess(true);
            if (fileRef.current) fileRef.current.value = "";
            setTimeout(() => setSyncSuccess(false), 5000);
          }
        }, 150);
      } catch (err) {
        console.error(err);
        setIsSyncing(false);
        alert("שגיאה בסנכרון ה-DNA");
      }
    };
    reader.readAsText(file);
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
      const allLogs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setLogs(allLogs);
      
      const trainingLog = allLogs.find((d: any) => d.type === "dna_training");
      if (trainingLog && trainingLog.metrics) {
        setLatestMetrics(prev => ({ ...prev, ...trainingLog.metrics }));
      }
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
    const finalAvatar = newEmployee.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newEmployee.phone}`;
    try {
      if (editingEmployee) {
        await updateDoc(doc(db, getCollectionPath("users"), editingEmployee.id), {
          name: newEmployee.name,
          email: newEmployee.email,
          powerLevel: newEmployee.power,
          avatar: finalAvatar,
          updatedAt: serverTimestamp()
        });
        setEditingEmployee(null);
      } else {
        await setDoc(doc(db, getCollectionPath("users"), newEmployee.phone), {
          name: newEmployee.name,
          email: newEmployee.email,
          powerLevel: newEmployee.power,
          createdAt: serverTimestamp(),
          status: "offline",
          avatar: finalAvatar
        });
      }
      setNewEmployee({ name: "", phone: "", email: "", power: "דלפק", avatar: "" });
    } catch (e) {
      console.error(e);
    }
  };

  const startSandbox = (emp: any) => {
    setEditingEmployee(emp);
    setIsSandboxOpen(true);
    setSandboxMessages([{ id: 'welcome', text: `<div class="p-2">שלום <b>${emp.name}</b>, אני נועה. בוא נתחיל סימולציית שטח עבור תפקיד <b>${emp.powerLevel || 'חדש'}</b>. איך אני יכולה לעזור לך היום במחלקת ה-<b>${emp.powerLevel}</b>?</div>`, sender: 'noa' }]);
  };

  const handleSandboxSend = async () => {
    if (!sandboxInput.trim() || isSyncing) return;
    const userMsg = { id: Date.now().toString(), text: sandboxInput, sender: 'user' as const };
    setSandboxMessages(prev => [...prev, userMsg]);
    setSandboxInput("");
    setIsSyncing(true);
    
    try {
      const responseText = await getNoaResponse(
        sandboxMessages.concat(userMsg).map(m => ({ text: m.text, sender: m.sender })),
        {
          simulationMode: true,
          targetRole: editingEmployee?.powerLevel || "דלפק",
          employeeName: editingEmployee?.name
        }
      );

      const response = { 
        id: (Date.now() + 1).toString(), 
        text: responseText, 
        sender: 'noa' as const 
      };
      setSandboxMessages(prev => [...prev, response]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const startEdit = (emp: any) => {
    setEditingEmployee(emp);
    setNewEmployee({ 
      name: emp.name, 
      phone: emp.id, 
      email: emp.email || "", 
      power: emp.powerLevel?.toString() || "דלפק",
      avatar: emp.avatar || ""
    });
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
    <div className="flex-1 bg-[#f1f5f9] text-[#1e293b] flex flex-col h-screen font-['Heebo'] rtl overflow-hidden" dir="rtl">
      {/* Unified Header */}
      <header className="bg-[#1e293b] text-white p-6 shadow-2xl z-30 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-[#C5A059] rounded-2xl flex items-center justify-center shadow-lg shadow-[#C5A059]/20">
                <ShieldCheck size={28} className="text-white" />
             </div>
             <div>
                <h2 className="font-black text-xl tracking-tight leading-none mb-1">SabanOS Unified Admin</h2>
                <p className="text-[10px] text-[#C5A059] font-black uppercase tracking-widest">{isCeo ? "Oversight Mode: CEO" : "Oversight Mode: Admin"}</p>
             </div>
          </div>
          <button onClick={onBack} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
             <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Unified Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-32">
          
          {/* Section 1: DNA Hub & Simulation */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-2 px-2">
               <FlaskConical className="text-[#C5A059]" size={20} />
               <h3 className="text-lg font-black uppercase tracking-tight">DNA Hub & Simulation</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Training / Upload */}
               <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                     <span className="text-[11px] font-black uppercase text-slate-400">WhatsApp DNA Sync</span>
                     {syncSuccess ? <ShieldCheck size={16} className="text-emerald-500" /> : <Upload size={16} className="text-[#C5A059]" />}
                  </div>
                  <div 
                    onClick={() => fileRef.current?.click()}
                    className={`h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${isSyncing ? "border-[#C5A059] bg-orange-50" : "border-slate-200 hover:border-[#C5A059] bg-slate-50"}`}
                  >
                     <input type="file" ref={fileRef} onChange={handleDnaUpload} accept=".txt" className="hidden" />
                     {isSyncing ? (
                        <div className="flex flex-col items-center gap-2">
                           <Activity size={24} className="text-[#C5A059] animate-spin" />
                           <span className="text-xs font-bold text-[#C5A059]">Analyzing... {syncProgress}%</span>
                        </div>
                     ) : (
                        <div className="flex flex-col items-center gap-2">
                           <History size={24} className="text-slate-400" />
                           <span className="text-xs font-bold text-slate-500">Upload WhatsApp Chat (.txt)</span>
                        </div>
                     )}
                  </div>
               </div>

               {/* Simulation & DNA Control */}
               <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                     <div>
                        <h4 className="font-black text-[#1e293b]">Simulation Mode</h4>
                        <p className="text-[10px] text-slate-500 font-medium tracking-tight">Real-time sandboxed environment</p>
                     </div>
                     <button 
                        onClick={onToggleSimulation}
                        className={`w-14 h-7 rounded-full relative transition-all duration-500 ${isSimulationMode ? "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]" : "bg-slate-200"}`}
                     >
                        <motion.div 
                          animate={{ x: isSimulationMode ? -28 : 0 }}
                          className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full shadow-md"
                        />
                     </button>
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Activity size={18} className="text-emerald-500" />
                        <span className="text-xs font-black">AI Accuracy</span>
                     </div>
                     <span className="text-sm font-black text-emerald-600">{latestMetrics.technicalAccuracy}%</span>
                  </div>
               </div>
            </div>

            {/* Behavioral Rules DNA */}
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200">
               <div className="flex items-center justify-between mb-4">
                  <h4 className="font-black text-[#1e293b] flex items-center gap-2">
                     <ShieldAlert size={16} className="text-red-500" />
                     Global Behavioral Override
                  </h4>
               </div>
               <textarea 
                  value={userRules}
                  onChange={e => setUserRules(e.target.value)}
                  placeholder="Insert Noa's core behavioral constraints here..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium h-24 outline-none focus:border-[#C5A059] transition-all"
               />
               <button 
                  onClick={handleApplyRules}
                  className="mt-3 w-full bg-[#1e293b] text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all"
               >
                  Deploy Constraints
               </button>
            </div>
          </section>

          {/* Section 2: User Intel (Mobile-Compact) */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-2 px-2">
               <Users className="text-[#C5A059]" size={20} />
               <h3 className="text-lg font-black uppercase tracking-tight">User Intelligence</h3>
            </div>
            
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
               <div className="divide-y divide-slate-100">
                  {employees.map((emp) => (
                     <div key={emp.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-all">
                        <div className="flex items-center gap-3">
                           <div className="relative">
                              <img src={emp.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.id}`} className="w-10 h-10 rounded-full border-2 border-slate-200 object-cover" alt="" />
                              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${emp.status === 'online' ? 'bg-green-500' : 'bg-slate-300'}`} />
                           </div>
                           <div className="flex flex-col">
                              <span className="font-black text-sm text-[#1e293b]">{emp.name}</span>
                              <div className="flex items-center gap-2">
                                 <select 
                                    value={emp.powerLevel || "דלפק"}
                                    onChange={async (e) => {
                                       await updateDoc(doc(db, getCollectionPath("users"), emp.id), { powerLevel: e.target.value });
                                    }}
                                    className="text-[9px] font-black uppercase text-[#C5A059] bg-transparent outline-none cursor-pointer"
                                 >
                                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                                 </select>
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <button onClick={() => startSandbox(emp)} className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-[#C5A059]/10 hover:text-[#C5A059] transition-all">
                              <FlaskConical size={16} />
                           </button>
                           <button onClick={() => handleDeleteEmployee(emp.id)} className="p-2.5 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                              <Trash2 size={16} />
                           </button>
                        </div>
                     </div>
                  ))}
               </div>
               <button 
                 onClick={() => setEditingEmployee(null)}
                 className="w-full p-4 bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2 border-t border-slate-100"
               >
                 <Plus size={14} /> Add Security User
               </button>
            </div>
          </section>

          {/* Section 3: Audit Log (מלשינון) */}
          <section className="space-y-6">
            <div className="flex items-center justify-between mb-2 px-2">
               <div className="flex items-center gap-3">
                  <Activity className="text-[#C5A059]" size={20} />
                  <h3 className="text-lg font-black uppercase tracking-tight">Audit Log / מלשינון</h3>
               </div>
               <button onClick={syncAllCollections} className="text-[10px] font-black text-[#C5A059] bg-[#C5A059]/10 px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                  FORCE SYNC ALL
               </button>
            </div>
            
            <div className="bg-slate-900 rounded-[32px] shadow-2xl p-4 md:p-6 overflow-hidden border border-white/5">
                <div className="h-[400px] overflow-y-auto custom-scrollbar space-y-3 font-mono">
                   {logs.map((log) => (
                      <div key={log.id} className="group border-b border-white/5 pb-3">
                         <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-emerald-400 font-bold tracking-tighter">
                               [{log.event?.toUpperCase()}] 
                            </span>
                            <span className="text-[9px] text-slate-500">
                               {log.timestamp ? format(log.timestamp.toDate(), "HH:mm:ss") : "--:--"}
                            </span>
                         </div>
                         <div className="flex flex-col gap-1">
                            <p className="text-[11px] text-slate-300 leading-tight">
                               <span className="text-emerald-500/50">ID:</span> {log.userId || log.deviceId || "UNKNOWN"}
                            </p>
                            {log.text && <p className="text-xs text-white opacity-80 pl-2 border-l border-[#C5A059]/30 ml-1 py-1">{log.text}</p>}
                            {log.location && (
                               <p className="text-[9px] text-red-400 flex items-center gap-1">
                                  <MapPin size={8} /> {log.location.lat.toFixed(4)}, {log.location.lng.toFixed(4)}
                               </p>
                            )}
                         </div>
                      </div>
                   ))}
                </div>
            </div>
          </section>

          {/* Section 4: Live Intercept */}
          <section className="space-y-6 pb-12">
            <div className="flex items-center gap-3 mb-2 px-2">
               <Smartphone className="text-[#C5A059]" size={20} />
               <h3 className="text-lg font-black uppercase tracking-tight">Traffic Intercept</h3>
            </div>
            
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-6">
                <div className="h-[300px] overflow-y-auto custom-scrollbar space-y-4 pr-1">
                   {liveChats.map((chat) => (
                      <div key={chat.id} className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                         <div className={`p-4 rounded-2xl max-w-[85%] text-xs font-bold leading-relaxed shadow-sm ${chat.sender === 'user' ? 'bg-[#DCF8C6] border border-green-200' : 'bg-[#e2e8f0]'}`}>
                            {chat.text}
                            <div className="mt-1 text-[8px] text-slate-400 text-left">
                               {chat.timestamp ? format(chat.timestamp.toDate(), "HH:mm") : ""}
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
            </div>
          </section>

        </div>
      </main>

      {/* Admin metrics overlay footer for CEO */}
      {isCeo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 pointer-events-none">
           <div className="bg-slate-900/90 backdrop-blur-xl border border-emerald-500/30 rounded-full px-6 py-2 shadow-2xl flex items-center gap-8 pointer-events-auto">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[9px] font-black text-emerald-400 uppercase">HQ Global Oversight: {latestMetrics.globalOversight}%</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-2 text-white/60">
                 <ShieldCheck size={12} className="text-[#C5A059]" />
                 <span className="text-[9px] font-black uppercase tracking-widest">SabanOS Protocol 3.0</span>
              </div>
           </div>
        </div>
      )}

      {/* Sandbox Modal (Kept as is but styled better) */}
      <AnimatePresence>
        {isSandboxOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-[#C5A059]/20"
            >
              <header className="p-6 bg-[#1e293b] text-white flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-4">
                   <div className="relative">
                      <img 
                        src={editingEmployee?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${editingEmployee?.id}`} 
                        className="w-12 h-12 rounded-full border-2 border-[#C5A059] bg-slate-800" 
                        alt="" 
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#C5A059] rounded-lg flex items-center justify-center border-2 border-[#1e293b]">
                         <FlaskConical size={12} className="text-white" />
                      </div>
                   </div>
                   <div>
                      <h4 className="font-black text-lg">DNA Sandbox Simulator</h4>
                      <p className="text-[10px] text-[#C5A059] font-black uppercase tracking-widest">
                         Context: {editingEmployee?.powerLevel} | Agent: NOA
                      </p>
                   </div>
                </div>
                <button 
                   onClick={() => setIsSandboxOpen(false)}
                   className="p-3 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"
                >
                   <X size={20} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 custom-scrollbar">
                 {sandboxMessages.map(m => (
                    <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`p-4 rounded-3xl max-w-[85%] shadow-sm ${m.sender === 'user' ? 'bg-[#1e293b] text-white rounded-tr-none' : 'bg-white text-[#1e293b] rounded-tl-none border border-slate-200'}`}>
                          {m.sender === 'noa' ? (
                            <div className="noa-render text-[14px]" dangerouslySetInnerHTML={{ __html: m.text }} />
                          ) : (
                            <p className="font-bold">{m.text}</p>
                          )}
                       </div>
                    </div>
                 ))}
                 {isSyncing && (
                    <div className="flex justify-start">
                       <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1 border border-slate-100">
                          <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce" />
                          <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce [animation-delay:0.2s]" />
                          <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce [animation-delay:0.4s]" />
                       </div>
                    </div>
                 )}
              </div>

              <footer className="p-6 bg-white border-t border-slate-100 flex gap-3 flex-shrink-0">
                 <input 
                    value={sandboxInput}
                    onChange={e => setSandboxInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSandboxSend()}
                    placeholder="Enter simulation response..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none font-bold text-[#1e293b] focus:border-[#C5A059]"
                 />
                 <button 
                    onClick={handleSandboxSend}
                    className="bg-[#1e293b] text-white px-8 rounded-2xl font-black hover:bg-slate-700 transition-all shadow-lg active:scale-95"
                 >
                    Inject
                 </button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}
