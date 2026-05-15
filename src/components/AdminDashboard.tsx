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
  Search
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
}

export default function AdminDashboard({ specId, onBack, locationAlertActive, onDismissAlert, userProfile }: AdminDashboardProps) {
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
    <div className="flex-1 bg-[#f8fafc] text-[#1e293b] flex flex-col md:flex-row h-screen font-['Heebo'] rtl" dir="rtl">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-[#1e293b] text-white flex flex-col shadow-2xl z-30">
        <div className="p-8 border-b border-white/10">
          <div className="flex items-center gap-4 mb-6">
             <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                {isCeo ? <ShieldCheck size={32} className="text-emerald-400" /> : <LayoutDashboard size={32} className="text-[#C5A059]" />}
             </div>
             <div>
                <h2 className="font-black text-xl leading-tight">{isCeo ? "HQ GLOBAL" : "ניהול SABAN"}</h2>
                <div className="flex items-center gap-1 text-[10px] text-[#C5A059] font-bold uppercase tracking-widest">
                   <span>{isCeo ? "המנכ״ל הראל אידלסטון" : "מנהל מערכת מאושר"}</span>
                </div>
             </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          <button 
            onClick={() => setActiveTab("malshinon")}
            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${activeTab === "malshinon" ? "bg-[#C5A059] text-white shadow-lg" : "hover:bg-white/5 text-slate-400 group-hover:text-white"}`}
          >
            <div className="flex items-center gap-4">
              <Activity size={20} />
              <span className="font-bold">מלשינון בזמן אמת</span>
            </div>
            {activeTab === "malshinon" && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
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
                        <button 
                           onClick={syncAllCollections}
                           disabled={isSyncing}
                           className="bg-[#1e293b] text-white px-6 py-2 rounded-xl font-black hover:bg-slate-700 transition-all flex items-center gap-2 text-xs"
                        >
                           <Activity size={14} className={isSyncing ? "animate-spin" : ""} />
                           {isSyncing ? `מסנכרן ${syncProgress}%` : "סנכרון מלא 19 מאגרים"}
                        </button>
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
                        {editingEmployee ? <Smartphone size={24} className="text-[#C5A059]" /> : <Plus size={24} className="text-[#C5A059]" />}
                        {editingEmployee ? `עריכת מורשה: ${editingEmployee.name}` : "הוספת מורשה גישה"}
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-3xl border border-slate-100 min-h-[140px]">
                           <div className="relative group">
                              <img 
                                 src={newEmployee.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newEmployee.phone || 'default'}`} 
                                 className="w-20 h-20 rounded-full border-4 border-white shadow-md bg-white object-cover" 
                                 alt="Avatar Preview" 
                              />
                              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-[9px] font-black">
                                 <button 
                                    onClick={() => fileRef.current?.click()}
                                    className="hover:text-[#C5A059] flex items-center gap-1 pointer-events-auto"
                                 >
                                    <Upload size={14} /> העלאה
                                 </button>
                                 <div className="w-8 h-[1px] bg-white/20" />
                                 <button 
                                    onClick={() => setNewEmployee(prev => ({ ...prev, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random().toString(36).substring(7)}` }))}
                                    className="hover:text-[#C5A059] flex items-center gap-1 pointer-events-auto"
                                 >
                                    <Plus size={14} /> אקראי
                                 </button>
                              </div>
                           </div>
                           <input 
                              type="file"
                              ref={fileRef}
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                 const file = e.target.files?.[0];
                                 if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                       setNewEmployee(prev => ({ ...prev, avatar: reader.result as string }));
                                    };
                                    reader.readAsDataURL(file);
                                 }
                              }}
                           />
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{newEmployee.avatar.startsWith('data:') ? 'תמונה הועלתה' : 'תמונת פרופיל'}</p>
                        </div>
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
                           <label className="text-[11px] font-black text-slate-400 uppercase">אימייל</label>
                           <div className="relative">
                              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input 
                                 value={newEmployee.email}
                                 onChange={e => setNewEmployee({...newEmployee, email: e.target.value})}
                                 className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 pl-12 text-left text-[#1e293b] focus:border-[#C5A059] outline-none font-bold"
                                 placeholder="user@saban.co.il"
                              />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[11px] font-black text-slate-400 uppercase">טלפון (מזהה)</label>
                           <input 
                              value={newEmployee.phone}
                              disabled={!!editingEmployee}
                              onChange={e => setNewEmployee({...newEmployee, phone: e.target.value})}
                              className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-[#1e293b] focus:border-[#C5A059] outline-none font-mono ${editingEmployee ? 'opacity-50' : ''}`}
                              placeholder="05XXXXXXXX"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[11px] font-black text-slate-400 uppercase">תפקיד / מחלקה</label>
                           <select 
                              value={newEmployee.power}
                              onChange={e => setNewEmployee({...newEmployee, power: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-[#1e293b] focus:border-[#C5A059] outline-none font-bold"
                           >
                              {roles.map((role, idx) => (
                                <option key={idx} value={role}>{role}</option>
                              ))}
                           </select>
                        </div>
                     </div>
                     <div className="flex gap-4 mt-8">
                        <button 
                           onClick={handleCreateEmployee}
                           className="bg-[#1e293b] text-white px-10 py-4 rounded-xl font-black hover:bg-slate-700 transition-all flex items-center gap-2"
                        >
                           <Save size={18} />
                           {editingEmployee ? "עדכון פרטים" : "שמירת מורשה גישה"}
                        </button>
                        {editingEmployee && (
                           <button 
                              onClick={() => { 
                                 setEditingEmployee(null); 
                                 setNewEmployee({ name: "", phone: "", email: "", power: "דלפק", avatar: "" }); 
                              }}
                              className="bg-slate-100 text-slate-500 px-10 py-4 rounded-xl font-black hover:bg-slate-200 transition-all"
                           >
                              ביטול
                           </button>
                        )}
                     </div>
                  </div>

                  <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden">
                     <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#1e293b] text-white">
                        <h3 className="font-black text-xl flex items-center gap-3">
                           <ShieldCheck size={24} className="text-[#C5A059]" />
                           Intelligence Report: Personal DNA vs Professional Needs
                        </h3>
                     </div>
                     <table className="w-full text-right">
                        <thead className="bg-[#1e293b] text-white">
                           <tr className="text-[11px] font-black uppercase tracking-widest text-[#C5A059]">
                              <th className="p-6">A. תקשורת (Identity)</th>
                              <th className="p-6">B. חיים אישיים (History)</th>
                              <th className="p-6">C. DNA מקצועי (SabanOS)</th>
                              <th className="p-6">סטטוס סוכן</th>
                              <th className="p-6 text-center">אימון DNA</th>
                           </tr>
                        </thead>
                        <tbody>
                             {employees.map((emp) => (
                              <tr key={emp.id} className="border-t border-slate-100 hover:bg-[#C5A059]/5 transition-colors">
                                 {/* Category A: Communication */}
                                 <td className="p-6">
                                    <div className="flex items-center gap-4">
                                       <div className="relative">
                                          <img src={emp.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.id}`} className="w-14 h-14 rounded-2xl border-2 border-white shadow-lg bg-white object-cover" alt="" />
                                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${emp.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                       </div>
                                       <div className="flex flex-col">
                                          <span className="font-black text-lg text-[#1e293b]">{emp.name}</span>
                                          <span className="text-[11px] text-[#C5A059] font-black uppercase tracking-tight">{emp.id}</span>
                                          <span className="text-[10px] text-slate-400 font-bold">{emp.email || "MISSING_MAIL"}</span>
                                       </div>
                                    </div>
                                 </td>

                                 {/* Category B: Personal Life */}
                                 <td className="p-6">
                                    <div className="space-y-1">
                                       <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-black text-slate-400 uppercase">מצב:</span>
                                          <span className="text-xs font-bold text-[#1e293b]">{emp.personal?.status || "טרם נלמד"}</span>
                                       </div>
                                       <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-black text-slate-400 uppercase">ילדים:</span>
                                          <span className="text-xs font-bold text-[#1e293b]">{emp.personal?.children || emp.personal?.status === 'נשוי + 4' ? '4' : '0'}</span>
                                       </div>
                                       <div className="h-1 w-20 bg-slate-100 rounded-full overflow-hidden mt-2">
                                          <div className="h-full bg-[#C5A059]" style={{ width: emp.personal?.learningProgress || '20%' }} />
                                       </div>
                                    </div>
                                 </td>

                                 {/* Category C: Professional DNA */}
                                 <td className="p-6">
                                    <div className="space-y-2">
                                       <div className="px-3 py-1 rounded-lg bg-[#1e293b] text-white text-[10px] font-black inline-block uppercase">
                                          {emp.powerLevel || "AGENT"}
                                       </div>
                                       <div className="text-[10px] text-slate-500 font-medium">
                                          <p>ערכי ליבה: {emp.dna?.coreValues ? 'Family Unity, Continuity' : 'ניהול סחר'}</p>
                                          <p className="text-[#C5A059] font-bold">גישה עסקית: {emp.dna?.businessApproach ? 'Long-term legacy' : 'אופטימיזציה'}</p>
                                       </div>
                                    </div>
                                 </td>

                                 {/* Status */}
                                 <td className="p-6">
                                    <div className="flex flex-col gap-1">
                                       <div className="flex items-center gap-2 text-xs font-black uppercase">
                                          <div className={`w-2 h-2 rounded-full ${emp.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                                          {emp.status === 'online' ? 'Active' : 'Offline'}
                                       </div>
                                       <span className="text-[10px] text-slate-400 italic">נראה לאחרונה: {emp.lastSeen ? format(emp.lastSeen.toDate(), "HH:mm") : "---"}</span>
                                    </div>
                                 </td>

                                 {/* Actions */}
                                 <td className="p-6">
                                    <div className="flex justify-center gap-4">
                                       <button 
                                          onClick={() => startSandbox(emp)} 
                                          className="p-3 bg-[#C5A059]/10 text-[#C5A059] rounded-xl hover:bg-[#C5A059] hover:text-white transition-all shadow-sm"
                                          title="הוראת DNA למערכת"
                                       >
                                          <FlaskConical size={20} />
                                       </button>
                                       <button 
                                          onClick={() => startEdit(emp)} 
                                          className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-[#1e293b] hover:text-white transition-all"
                                       >
                                          <Pencil size={20} />
                                       </button>
                                       <button 
                                          onClick={() => handleDeleteEmployee(emp.id)} 
                                          className="p-3 bg-red-50 text-red-300 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                       >
                                          <Trash2 size={20} />
                                       </button>
                                    </div>
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
                  {/* DNA Training Section */}
                  <div className="space-y-8">
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
                        ) : syncSuccess ? (
                           <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black flex items-center gap-3">
                              <ShieldCheck size={24} />
                              סנכרון DNA הושלם בהצלחה!
                           </div>
                        ) : (
                           <div className="flex flex-col items-center gap-4">
                              <input 
                                 type="file" 
                                 ref={fileRef} 
                                 onChange={handleDnaUpload} 
                                 accept=".txt" 
                                 className="hidden" 
                              />
                              <button 
                                 onClick={() => fileRef.current?.click()} 
                                 className="bg-slate-100 hover:bg-slate-200 text-[#1e293b] px-10 py-5 rounded-2xl font-black transition-all flex items-center gap-3"
                              >
                                 <Upload size={20} />
                                 העלאת קובץ (txt.)
                              </button>
                           </div>
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

                  {/* Performance Analytics Section */}
                  <div className="bg-white p-10 rounded-[50px] border border-slate-200 shadow-xl space-y-8">
                     <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black text-[#1e293b]">{isCeo ? "HQ Global Performance" : "Agent Performance Meter"}</h3>
                        <div className="px-4 py-2 bg-[#C5A059]/10 rounded-xl text-[#C5A059] font-black text-xs uppercase tracking-widest">
                           {isCeo ? "MASTER OVERSIGHT" : "Live AI Status"}
                        </div>
                     </div>

                     <div className="space-y-10">
                        {(isCeo ? [
                           { label: "Global Oversight %", val: latestMetrics.globalOversight, color: "#10b981", glow: "0 0 20px rgba(16, 185, 129, 0.4)" },
                           { label: "HQ Efficiency %", val: latestMetrics.hqEfficiency, color: "#1e293b", glow: "0 0 20px rgba(30, 41, 59, 0.4)" },
                           { label: "Network Stability %", val: 99, color: "#3b82f6", glow: "0 0 20px rgba(59, 130, 246, 0.4)" }
                        ] : [
                           { label: "Sales Push %", val: latestMetrics.salesPush, color: "#C5A059", glow: "0 0 20px rgba(197, 160, 89, 0.4)" },
                           { label: "Technical Accuracy %", val: latestMetrics.technicalAccuracy, color: "#1e293b", glow: "0 0 20px rgba(30, 41, 59, 0.4)" },
                           { label: "Personality Sync %", val: latestMetrics.personalitySync, color: "#10b981", glow: "0 0 20px rgba(16, 185, 129, 0.4)" }
                        ]).map((metric, i) => (
                           <div key={metric.label} className="space-y-3">
                              <div className="flex justify-between items-end">
                                 <span className="font-black text-slate-500 uppercase text-xs">{metric.label}</span>
                                 <span className="font-black text-2xl text-[#1e293b]">{metric.val}%</span>
                              </div>
                              <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                 <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${metric.val}%` }}
                                    transition={{ duration: 1.5, delay: i * 0.2 }}
                                    className="h-full rounded-full relative"
                                    style={{ 
                                       backgroundColor: metric.color,
                                       boxShadow: metric.glow
                                    }}
                                 >
                                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                 </motion.div>
                              </div>
                           </div>
                        ))}
                     </div>

                     <div className="pt-6 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Training Clusters</p>
                              <p className="text-xl font-black text-[#1e293b]">412</p>
                           </div>
                           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Knowledge Density</p>
                              <p className="text-xl font-black text-[#1e293b]">High</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            )}
         </div>
      </main>

      {/* Sandbox Modal */}
      <AnimatePresence>
        {isSandboxOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[80vh]"
            >
              <header className="p-6 bg-[#1e293b] text-white flex justify-between items-center">
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
                      <h4 className="font-black text-lg">סימולטור אימון DNA</h4>
                      <p className="text-[10px] text-[#C5A059] font-black uppercase tracking-widest">
                         Mode: {editingEmployee?.powerLevel} | Candidate: {editingEmployee?.name}
                      </p>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="bg-emerald-500 animate-pulse px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-tighter">
                      Simulation Active
                   </div>
                   <button 
                      onClick={() => setIsSandboxOpen(false)}
                      className="p-2 hover:bg-white/10 rounded-xl transition-all pointer-events-auto z-50"
                   >
                      יציאה
                   </button>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 custom-scrollbar">
                 {/* Injection Panel */}
                 <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-3xl border border-[#C5A059]/30 shadow-sm space-y-3">
                       <div className="flex items-center justify-between text-[10px] font-black uppercase text-[#C5A059]">
                          <span>הזרקת חוקי התנהגות (Rules)</span>
                          <ShieldCheck size={14} />
                       </div>
                       <textarea 
                          value={userRules}
                          onChange={e => setUserRules(e.target.value)}
                          placeholder="למשל: תמיד לענות לו בקיצור, לא להציע הנחות..."
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold h-20 outline-none focus:border-[#C5A059]"
                       />
                       <button 
                          onClick={handleApplyRules}
                          className="w-full py-2 bg-[#1e293b] text-white rounded-lg text-[10px] font-black uppercase hover:bg-black transition-all"
                       >
                          Apply Behavioral Rules
                       </button>
                    </div>
                    
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
                       <div>
                          <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                             <span>ניתוח אישיות צילום (DNA Inject)</span>
                             <Users size={14} />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-2">ניתוח פסיכולוגי של תמונת הפרופיל לקביעת טון שיח מותאם.</p>
                       </div>
                       <button 
                          onClick={handleMockImageAnalysis}
                          disabled={isAnalyzingImage}
                          className="w-full py-2 bg-slate-50 border border-slate-200 text-[#1e293b] rounded-lg text-[10px] font-black uppercase hover:border-[#C5A059] transition-all flex items-center justify-center gap-2"
                       >
                          {isAnalyzingImage ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear" }}><Activity size={12} /></motion.div> : <Search size={12} />}
                          {isAnalyzingImage ? "Analyzing Faces..." : "Perform Personality Analysis"}
                       </button>
                    </div>
                 </div>

                 <div className="h-px bg-slate-200 my-4" />

                 {sandboxMessages.map(m => (
                    <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`p-4 rounded-2xl max-w-[80%] shadow-sm ${m.sender === 'user' ? 'bg-[#1e293b] text-white rounded-tr-none' : 'bg-white text-[#1e293b] rounded-tl-none border border-slate-100'}`}>
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
                       <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                          <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce" />
                          <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce [animation-delay:0.2s]" />
                          <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce [animation-delay:0.4s]" />
                       </div>
                    </div>
                 )}
              </div>

              <footer className="p-6 bg-white border-t border-slate-100 flex gap-3">
                 <input 
                    value={sandboxInput}
                    onChange={e => setSandboxInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSandboxSend()}
                    placeholder="הקלד תגובה לסימולציה..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none font-bold text-[#1e293b] focus:border-[#C5A059]"
                 />
                 <button 
                    onClick={handleSandboxSend}
                    className="bg-[#1e293b] text-white px-8 rounded-2xl font-black hover:bg-slate-700 transition-all pointer-events-auto"
                 >
                    שלח
                 </button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        button { pointer-events: auto !important; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}
