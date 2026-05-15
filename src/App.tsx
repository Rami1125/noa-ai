import React, { useState, useEffect, useRef } from "react";
import { 
  Send, Paperclip, Smile, Search, MoreVertical, Phone, Video, 
  CheckCheck, Shield, ShieldAlert, Database, User, ShoppingBag, 
  TrendingUp, Truck, ClipboardList, Info, ChevronRight, History,
  Trash2, X, Plus, PlayCircle, BrainCircuit, Pencil, Mail, Smartphone,
  Heart, Briefcase, Camera, Loader2, Star, UserPlus, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { 
  getFirestore, collection, doc, onSnapshot, addDoc, 
  deleteDoc, getDocs, serverTimestamp, updateDoc, query, where, orderBy, limit 
} from "firebase/firestore";
import { format } from "date-fns";

// --- System Configuration ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'ai-studio-cc5d2687-b402-4b97-b808-5ba700689e0e';

const NOA_AVATAR = "https://i.postimg.cc/qqLm9M5t/Gemini-Generated-Image-gmd5k7gmd5k7gmd5.png";
const SOUND_SENT = "https://raw.githubusercontent.com/AnestisG/whatsapp-call-recorder/master/res/raw/whatsapp_outgoing_message.mp3";
const SOUND_RECEIVED = "https://raw.githubusercontent.com/AnestisG/whatsapp-call-recorder/master/res/raw/whatsapp_incoming_message.mp3";

export default function App() {
  const [view, setView] = useState(() => localStorage.getItem("saban_view") || "chat");
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [deviceId, setDeviceId] = useState("");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');

  const scrollRef = useRef(null);
  const audioSent = useRef(new Audio(SOUND_SENT));
  const audioReceived = useRef(new Audio(SOUND_RECEIVED));

  const getCollectionPath = (name) => `artifacts/${appId}/public/data/${name}`;

  // --- 1. Initialization & Identity ---
  useEffect(() => {
    let id = localStorage.getItem("deviceId");
    if (!id) {
      id = "SABAN-" + Math.random().toString(36).substr(2, 9).toUpperCase();
      localStorage.setItem("deviceId", id);
    }
    setDeviceId(id);

    const init = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) { console.error("Auth Error", e); }

      // Deep Linking recognition (Phone in URL)
      const path = window.location.pathname.replace(/\//g, '').replace(/-/g, '');
      if (path && path.length >= 9) {
        setUserId(path);
        localStorage.setItem("saban_active_userId", path);
      } else {
        const savedId = localStorage.getItem("saban_active_userId");
        if (savedId) setUserId(savedId);
      }
    };
    init();
    const unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        if (u && !userId) setUserId(u.uid);
    });
    return () => unsub();
  }, []);

  // --- 2. Data Sync ---
  useEffect(() => {
    if (!userId) return;
    const unsubProfile = onSnapshot(doc(db, getCollectionPath("users"), userId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.name?.includes("הראל")) data.isCeo = true;
        setUserProfile({ id: snap.id, ...data });
      }
    });

    const unsubChat = onSnapshot(query(collection(db, getCollectionPath("chats")), orderBy("timestamp", "asc")), (snap) => {
      const msgs = snap.docs.filter(d => d.data().userId === userId).map(d => ({ id: d.id, ...d.data() }));
      if (msgs.length > messages.length && msgs[msgs.length - 1]?.sender === "noa") {
        audioReceived.current.play().catch(() => {});
      }
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    const unsubAllUsers = onSnapshot(collection(db, getCollectionPath("users")), (snap) => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubProfile(); unsubChat(); unsubAllUsers(); };
  }, [userId, messages.length]);

  // --- 3. Truth Engine Logic ---
  const fetchRealData = async (text) => {
    const ordersSnap = await getDocs(collection(db, getCollectionPath("orders")));
    const allOrders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    let filtered = allOrders;
    if (text.includes("החרש")) filtered = allOrders.filter(o => o.warehouse?.includes("החרש"));

    if (filtered.length === 0) {
      return {
        text: "לא נמצאו הזמנות אמת במאגר עבור מחסן זה.",
        html: `<div class="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 font-bold">
                <Database size={24} style="margin: 0 auto 10px;"/> נתוני אמת: לא נמצאו רשומות
               </div>`
      };
    }

    const rows = filtered.map(o => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px; font-weight: 800;">#${o.orderId || o.id.substring(0,5)}</td>
        <td style="padding: 10px;">${o.customer || 'כללי'}</td>
        <td style="padding: 10px;"><span style="background: #fffbeb; color: #b45309; padding: 2px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 900;">${o.status || 'בטיפול'}</span></td>
      </tr>
    `).join('');

    return {
      text: "שולפת נתוני אמת מהמאגר...",
      html: `<div class="wide-card" style="padding: 0; overflow: hidden; border: 1px solid #c5a059;">
              <div style="background: #1e293b; color: #c5a059; padding: 12px 20px; font-weight: 900; display: flex; justify-content: space-between;">
                <span>הזמנות אמת - ח.סבן</span>
                <span style="font-size: 0.6rem; opacity: 0.6;">SQL_LIVE_SYNC</span>
              </div>
              <div style="padding: 15px;">
                <table style="width: 100%; text-align: right; border-collapse: collapse; font-size: 0.8rem;">
                  <thead style="color: #94a3b8; border-bottom: 2px solid #f1f5f9;">
                    <tr><th>מס'</th><th>לקוח</th><th>סטטוס</th></tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>
            </div>`
    };
  };

  // --- 4. Messaging Engine ---
  const handleSendMessage = async () => {
    if (!inputText.trim() || !userId) return;
    const text = inputText;
    setInputText("");
    
    await addDoc(collection(db, getCollectionPath("chats")), {
      text, sender: "user", userId, timestamp: serverTimestamp(), status: "sent"
    });
    audioSent.current.play().catch(() => {});
    setIsTyping(true);

    try {
      let response;
      if (text.includes("הזמנות") || text.includes("מחסן")) {
        response = await fetchRealData(text);
      } else if (text.includes("הראל") && text.includes("מנכ")) {
        response = {
          text: "שלום המנכ\"ל הראל אידלסטון.",
          html: `<div class="p-6 bg-slate-900 text-emerald-400 rounded-3xl border-2 border-emerald-500 shadow-xl font-mono">
                  <h3 class="text-white text-xl font-black mb-2">זיהוי DNA: הראל אידלסטון</h3>
                  <p class="text-sm opacity-80 leading-relaxed">המערכת עברה למצב פיקוח גלובלי. כל נתוני התשתית מסונכרנים ב-100% דיוק.</p>
                </div>`
        };
      } else {
        response = { text: "אני כאן לכל שאלה לוגיסטית או הנדסית." };
      }

      await addDoc(collection(db, getCollectionPath("chats")), {
        text: response.text, html: response.html, sender: "noa", userId, timestamp: serverTimestamp(), status: "delivered"
      });
    } catch (e) { console.error(e); }
    setIsTyping(false);
  };

  // --- 5. Render Logic ---
  const renderMsg = (msg) => {
    if (msg.sender === "user") return <div className="text-[16px] leading-relaxed font-medium">{msg.text}</div>;
    return (
      <div 
        key={`node-${msg.id}`} 
        className="noa-render text-[18px] w-full overflow-hidden" 
        dangerouslySetInnerHTML={{ __html: msg.html || msg.text }} 
      />
    );
  };

  if (!user) return <div className="h-screen w-full bg-[#1E293B] flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F8FAFC] font-['Heebo'] rtl overflow-hidden" dir="rtl" suppressHydrationWarning>
      
      {/* Navbar */}
      <header className="h-20 bg-[#1E293B] text-white flex items-center px-6 justify-between shadow-xl z-50">
        <div className="flex items-center gap-4">
          <img src={NOA_AVATAR} className="w-12 h-12 rounded-full border-2 border-[#C5A059]" alt="Noa" onClick={() => setView('chat')} />
          <div>
            <h1 className="text-lg font-black tracking-tight">נועה - ח.סבן</h1>
            <p className="text-[10px] text-[#C5A059] font-black uppercase tracking-widest">{userProfile?.isCeo ? 'CEO MODE ACTIVE' : 'LOGISTICS AGENT'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setView(view === 'admin' ? 'chat' : 'admin')} className={`p-3 rounded-xl transition-all ${view === 'admin' ? 'bg-[#C5A059] text-white rotate-12' : 'hover:bg-white/5 text-[#C5A059]'}`}>
            <Shield size={24} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-[#efeae2] bg-fixed custom-scrollbar">
        {view === "chat" ? (
          <div className="p-4 max-w-4xl mx-auto w-full space-y-6">
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`shadow-lg relative max-w-[95%] sm:max-w-[85%] p-4 rounded-3xl ${msg.sender === "noa" ? "bg-white rounded-tl-none border-r-4 border-[#C5A059] w-full" : "bg-[#DCF8C6] rounded-tr-none text-slate-800"}`}>
                    {renderMsg(msg)}
                    <div className="flex justify-end gap-1 mt-1 text-[9px] text-slate-400 font-bold px-2">
                      <span>{msg.timestamp?.toDate ? format(msg.timestamp.toDate(), "HH:mm") : ""}</span>
                      {msg.sender === "user" && <CheckCheck size={14} className={msg.status === "seen" ? "text-blue-500" : ""} />}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isTyping && <div className="flex gap-1 p-3 bg-white w-fit rounded-2xl rounded-tl-none"><div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce [animation-delay:0.2s]"></div><div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce [animation-delay:0.4s]"></div></div>}
            <div ref={scrollRef} className="h-1" />
          </div>
        ) : (
          /* --- ADMIN DASHBOARD --- */
          <div className="min-h-full bg-white/95 backdrop-blur-3xl p-6 md:p-12 space-y-12">
            <header className="flex justify-between items-center border-b pb-8">
              <h2 className="text-3xl font-black text-[#1e293b] flex items-center gap-4"><LayoutDashboard className="text-[#c5a059]" /> ניהול בינה ארגונית SabanOS</h2>
              <button onClick={() => setView('chat')} className="text-red-500 font-bold hover:underline">חזרה לצ'אט</button>
            </header>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Intelligence Table */}
              <section className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl overflow-x-auto">
                 <h3 className="text-xl font-black mb-6 flex items-center gap-3"><Users className="text-[#c5a059]"/> דוח מודיעין משתמשים</h3>
                 <table className="w-full text-right">
                   <thead><tr className="bg-slate-50 border-b">
                     <th className="p-4 text-xs font-black">פרופיל</th>
                     <th className="p-4 text-xs font-black">DNA אישי</th>
                     <th className="p-4 text-xs font-black">סטטוס DNA</th>
                     <th className="p-4 text-xs font-black">פעולות</th>
                   </tr></thead>
                   <tbody>
                     {allUsers.map(u => (
                       <tr key={u.id} className="border-b hover:bg-slate-50">
                         <td className="p-4 flex items-center gap-3">
                           <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} className="w-10 h-10 rounded-full border shadow-sm" />
                           <div className="text-sm font-black">{u.name}</div>
                         </td>
                         <td className="p-4 text-[11px] font-bold text-slate-500">{u.personal?.status || 'נשוי+'} | {u.personal?.lifeStage || 'רב-דורי'}</td>
                         <td className="p-4"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${u.dnaSynced ? 'bg-emerald-500' : 'bg-slate-300'}`}></div><span className="text-[10px] font-black uppercase">{u.dnaSynced ? 'Synced' : 'Ready'}</span></div></td>
                         <td className="p-4"><button className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl"><PlayCircle size={18}/></button></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
              </section>

              {/* Simulation Board */}
              <section className="lg:col-span-1 bg-[#1e293b] text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 opacity-5"><BrainCircuit size={200}/></div>
                <h3 className="text-xl font-black mb-8 flex items-center gap-3"><Zap className="text-[#c5a059]"/> מעבדת אימון DNA</h3>
                <div className="space-y-6">
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-black text-[#c5a059] mb-2">חוקי התנהגות פעילים</p>
                      <ul className="text-[11px] space-y-2 opacity-80">
                        <li>• פנייה להראל תמיד כ"המנכ"ל"</li>
                        <li>• עדיפות פריקה לקבלני VIP</li>
                      </ul>
                   </div>
                   <button className="w-full py-4 bg-[#c5a059] text-[#1e293b] rounded-2xl font-black shadow-lg hover:scale-105 transition-all">הזרקת חוקי DNA חדשים</button>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {view === "chat" && (
        <footer className="bg-white/90 backdrop-blur-xl p-4 flex items-center gap-3 border-t border-slate-200 z-[100] pb-safe">
          <Smile className="text-slate-400 cursor-pointer hover:text-[#C5A059]" />
          <Paperclip className="text-slate-400 rotate-45 cursor-pointer hover:text-[#C5A059]" />
          <input 
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSendMessage()}
            placeholder="כתוב פקודה לוגיסטית..."
            className="flex-1 bg-[#f1f5f9] rounded-2xl px-6 py-4 outline-none font-bold text-slate-700 focus:ring-2 focus:ring-[#c5a059]/20"
          />
          <button onClick={handleSendMessage} disabled={!inputText.trim() || isTyping} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all ${!inputText.trim() || isTyping ? "bg-slate-300" : "bg-[#1E293B] active:scale-95"}`}>
            {isTyping ? <Loader2 className="animate-spin text-white" /> : <Send size={24} className="rotate-180" />}
          </button>
        </footer>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 20px; }
        .noa-render table { width: 100%; border-collapse: collapse; margin: 10px 0; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
        .noa-render th, .noa-render td { padding: 12px; text-align: right; border-bottom: 1px solid #f1f5f9; }
        .noa-render th { background: #1e293b; color: white; font-weight: 900; }
        .wide-card { background: white; border-radius: 24px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        body { font-family: 'Heebo', sans-serif; -webkit-tap-highlight-color: transparent; }
        input { font-size: 16px !important; }
      `}</style>
    </div>
  );
}

// --- Layout Logic Helpers ---
function LayoutDashboard({ className }) {
  return <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
}
