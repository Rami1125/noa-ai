import React, { useState, useEffect, useRef } from "react";
import AdminDashboard from "./components/AdminDashboard";
import { 
  Send, 
  Paperclip, 
  Smile, 
  Search,
  MoreVertical, 
  Phone, 
  Video, 
  CheckCheck,
  Shield,
  ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc,
  updateDoc,
  getDocs,
  limit,
  where
} from "firebase/firestore";
import { dbIntelligence, dbDrive, initAuth } from "./lib/firebase";
import { getNoaResponse } from "./services/geminiService";
import { format } from "date-fns";

const INTELLIGENCE_APP_ID = "ai-studio-cc5d2687-b402-4b97-b808-5ba700689e0e";
const DRIVE_APP_ID = "saban-ai-drive";
const NOA_AVATAR = "https://i.postimg.cc/qqLm9M5t/Gemini-Generated-Image-gmd5k7gmd5k7gmd5.png";

const COLLECTIONS = [
  "ai_logs", "brands", "bridge_sessions", "categories", "chats", 
  "customers", "drivers", "encyclopedia_categories", "encyclopedia_items", 
  "internal_team_chats", "inventory", "morning_reports", "office_messages", 
  "orders", "reminders", "sales", "user_magic_pages", "user_settings", "users"
];

type Message = {
  id: string;
  text: string;
  sender: "user" | "noa";
  timestamp: any;
  status: "sent" | "delivered" | "seen";
  userId?: string;
};

export default function App() {
  const [isMounted, setIsMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [deviceId, setDeviceId] = useState<string>("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [view, setView] = useState<"chat" | "admin">(() => (localStorage.getItem("saban_view") as any) || "chat");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [locationAlertActive, setLocationAlertActive] = useState(false);

  // Persistence logic for view
  useEffect(() => {
    localStorage.setItem("saban_view", view);
  }, [view]);

  // Deep linking recognition for phone detection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const phoneParam = params.get("phone") || params.get("id");
    if (phoneParam) {
      setUserId(phoneParam);
      localStorage.setItem("saban_active_userId", phoneParam);
    } else {
      const savedId = localStorage.getItem("saban_active_userId");
      if (savedId) setUserId(savedId);
    }
  }, []);

  useEffect(() => {
    if (!userId || !isMounted) return;
    const unsub = onSnapshot(doc(dbIntelligence, getIntelligencePath("users"), userId), (snap) => {
      if (snap.exists()) {
        const profile = { id: snap.id, ...snap.data() } as any;
        // Executive Identity Logic (Harel Protocol)
        const isHarel = profile.name?.toLowerCase().includes("הראל") || 
                        profile.name?.toLowerCase().includes("harel") ||
                        userId.toLowerCase().includes("harel") ||
                        userId === "0505227724" ||
                        profile.phone === "0505227724" ||
                        window.location.href.toLowerCase().includes("harel") ||
                        window.location.href.toLowerCase().includes("0505227724");
        
        if (isHarel) {
          profile.powerLevel = "מנכ״ל";
          profile.isCeo = true;
          profile.role = "CEO";
          profile.personal = profile.personal || {
            status: "נשוי + 4",
            lifeStage: "רב-דורי (לימודים עד שירות צבאי)",
            learningProgress: "95%"
          };
          profile.dna = profile.dna || {
            coreValues: "Family Unity, Resilience, Continuity",
            businessApproach: "Long-term legacy building"
          };
        } else if (profile.name === "Rami" || profile.name === "רמי" || userId === "SABAN-ADMIN" || profile.isAdmin || profile.phone === "0526012345") {
          profile.powerLevel = "Admin/Trainer";
          profile.isAdmin = true;
        }
        
        setUserProfile(profile);
        localStorage.setItem("saban_user_profile", JSON.stringify(profile));
      } else {
        if (userId === "SABAN-ADMIN") {
          setUserProfile({ name: "Rami", powerLevel: "Admin/Trainer", isAdmin: true });
        }
      }
    });
    return () => unsub();
  }, [userId, isMounted]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const audioSent = useRef<HTMLAudioElement | null>(null);
  const audioReceived = useRef<HTMLAudioElement | null>(null);
  const audioAlert = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
    // WhatsApp-style sounds from more reliable sources
    audioSent.current = new Audio("https://raw.githubusercontent.com/AnestisG/whatsapp-call-recorder/master/res/raw/whatsapp_outgoing_message.mp3");
    audioReceived.current = new Audio("https://raw.githubusercontent.com/AnestisG/whatsapp-call-recorder/master/res/raw/whatsapp_incoming_message.mp3");
    // Alert sound - standardized emergency tone
    audioAlert.current = new Audio("https://actions.google.com/sounds/v1/alarms/emergency_itds.ogg"); 
    
    let id = localStorage.getItem("deviceId");
    if (!id) {
      id = "SABAN-" + Math.random().toString(36).substr(2, 9).toUpperCase();
      localStorage.setItem("deviceId", id);
    }
    setDeviceId(id);

    if ("geolocation" in navigator) {
      navigator.geolocation.watchPosition(
        (p) => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => console.warn("Location blocked")
      );
    }
    
    initAuth().then(user => {
      if (user) setUserId(user.uid);
    });
  }, []);

  const getIntelligencePath = (name: string) => `artifacts/${INTELLIGENCE_APP_ID}/public/data/${name}`;
  const getDrivePath = (name: string) => `artifacts/${DRIVE_APP_ID}/public/data/${name}`;

  const logInteraction = async (event: string, metadata: any) => {
    if (!isMounted) return;
    try {
      await addDoc(collection(dbIntelligence, getIntelligencePath("ai_logs")), {
        event,
        deviceId,
        userId,
        location,
        timestamp: serverTimestamp(),
        bridge: "DUAL-SYNC",
        ...metadata
      });
    } catch (e) { console.error("Logging error", e); }
  };

  useEffect(() => {
    if (!userId || view !== "chat" || !isMounted) return;
    const q = query(collection(dbIntelligence, getIntelligencePath("chats")), orderBy("timestamp", "asc"));
    return onSnapshot(q, (snap) => {
      const msgs: Message[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (d.userId === userId) msgs.push({ id: doc.id, ...d } as Message);
      });
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      
      const unread = msgs.filter(m => m.sender === "noa" && m.status !== "seen");
      if (unread.length > 0) {
        audioReceived.current?.play().catch(() => {});
        unread.forEach(m => updateDoc(doc(dbIntelligence, getIntelligencePath("chats"), m.id), { status: "seen" }));
      }
    });
  }, [userId, view, isMounted]);

  useEffect(() => {
    if (view !== "admin" || !isMounted) return;
    const q = query(collection(dbIntelligence, getIntelligencePath("chats")), orderBy("timestamp", "desc"), limit(1));
    return onSnapshot(q, (snap) => {
      const latest = snap.docs[0]?.data();
      if (latest && latest.sender === "user" && latest.location) {
        setLocationAlertActive(true);
      }
    });
  }, [view, isMounted]);

  useEffect(() => {
    if (view === "admin" && locationAlertActive && audioAlert.current) {
      audioAlert.current.loop = true;
      audioAlert.current.play().catch(() => {});
    } else if (audioAlert.current) {
      audioAlert.current.pause();
    }
  }, [view, locationAlertActive]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !userId) return;
    const text = inputText.toLowerCase();
    setInputText("");
    
    try {
      await addDoc(collection(dbIntelligence, getIntelligencePath("chats")), {
        text,
        sender: "user",
        userId,
        timestamp: serverTimestamp(),
        status: "sent",
        location
      });
      audioSent.current?.play().catch(() => {});
      logInteraction("message_sent", { text });

      setIsTyping(true);

      // Upgrade: Dual-Bridge Data Fetching
      let driveOrders: any[] = [];
      let driveInventory: any[] = [];
      let driveSuppliers: any[] = [];
      
      const fetchDriveData = async () => {
        const queryText = text.toLowerCase();
        if (queryText.includes("הזמנות") || queryText.includes("orders") || queryText.includes("מלאי") || queryText.includes("מחסן") || queryText.includes("מחיר") || queryText.includes("קטלוג")) {
           const [ordersSnap, inventorySnap, suppliersSnap] = await Promise.all([
             getDocs(query(collection(dbDrive, getDrivePath("orders")), orderBy("timestamp", "desc"), limit(50))),
             getDocs(query(collection(dbDrive, getDrivePath("inventory")), limit(50))),
             getDocs(query(collection(dbDrive, getDrivePath("brands")), limit(20)))
           ]);
           driveOrders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
           driveInventory = inventorySnap.docs.map(d => ({ id: d.id, ...d.data() }));
           driveSuppliers = suppliersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
           
           logInteraction("drive_sync", { driveOrdersCount: driveOrders.length, driveInventoryCount: driveInventory.length });
        }
      };

      await fetchDriveData();

      const [sales, dnaLogs, magicPages] = await Promise.all([
        getDocs(query(collection(dbIntelligence, getIntelligencePath("sales")), orderBy("timestamp", "desc"), limit(5))),
        getDocs(query(collection(dbIntelligence, getIntelligencePath("ai_logs")), where("type", "==", "dna_training"), orderBy("timestamp", "desc"), limit(1))),
        getDocs(collection(dbIntelligence, getIntelligencePath("user_magic_pages")))
      ]);

      const context = {
        orders: driveOrders,
        inventory: driveInventory,
        suppliers: driveSuppliers,
        sales: sales.docs.map(d => ({ id: d.id, ...d.data() })),
        dnaTraining: dnaLogs.docs.length > 0 ? dnaLogs.docs[0].data().content : null,
        magicPages: magicPages.docs.map(d => ({ id: d.id, ...d.data() })),
        deviceId,
        location,
        userProfile,
        isCeoActive: userProfile?.isCeo || text.includes("הראל"),
        metadata: {
          sqlBridge: "ACTIVE",
          driveSync: "VERIFIED",
          timestamp: new Date().toISOString()
        }
      };

      let noaText = "";
      if (text.includes("הראל") && (text.includes("מנכ") || text.includes("ceo"))) {
        // Inject Personal DNA into Harel's profile
        await updateDoc(doc(dbIntelligence, getIntelligencePath("users"), userId), {
          powerLevel: "מנכ״ל",
          "personal.status": "נשוי + 4",
          "personal.lifeStage": "רב-דורי (לימודים עד שירות צבאי)",
          "personal.learningProgress": "95%",
          "dna.coreValues": "Family Unity, Resilience, Continuity",
          "dna.businessApproach": "Long-term legacy building",
          updatedAt: serverTimestamp()
        });

        noaText = `<div class="p-6 bg-slate-900 text-emerald-400 rounded-3xl border-2 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)] font-mono text-lg" dir="rtl">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-4 h-4 bg-emerald-500 rounded-full animate-ping"></div>
            <span class="font-black uppercase tracking-widest text-[#C5A059]">SabanOS Intelligence: Identity Locked</span>
          </div>
          <h3 class="text-white text-2xl font-black mb-2">שלום המנכ"ל הראל אידלסטון.</h3>
          <p class="mb-4 text-emerald-300/80 leading-relaxed">זיהיתי את חתימת ה-DNA שלך. המערכת עברה למצב <b>Family-First Oversight</b>. כל נתוני התשתית (צמנט, ברזל) מסונכרנים ב-100% דיוק כבסיס למורשת ח.סבן.</p>
          <div class="grid grid-cols-2 gap-3 mt-4">
            <div class="bg-emerald-950/50 p-3 rounded-2xl border border-emerald-500/30">
               <p class="text-[10px] uppercase font-black opacity-60">Succession Node</p>
               <p class="font-bold">Active: Family Unity</p>
            </div>
            <div class="bg-emerald-950/50 p-3 rounded-2xl border border-emerald-500/30">
               <p class="text-[10px] uppercase font-black opacity-60">Command Status</p>
               <p class="font-bold">Master Control</p>
            </div>
          </div>
        </div>`;
      } else {
        noaText = await getNoaResponse(messages.map(m => ({ text: m.text, sender: m.sender })), context);
      }
      
      await addDoc(collection(dbIntelligence, getIntelligencePath("chats")), {
        text: noaText,
        sender: "noa",
        userId,
        timestamp: serverTimestamp(),
        status: "delivered"
      });
      audioReceived.current?.play().catch(() => {});
      setIsTyping(false);
      logInteraction("ai_response", { text: noaText });
    } catch (e) { console.error(e); setIsTyping(false); }
  };

  if (!isMounted) return <div className="h-screen w-full bg-[#1E293B]" />;

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-900 font-sans selection:bg-[#C5A059]/30" dir="rtl">
      {view === "admin" ? (
        <AdminDashboard 
          userId={userId || ""} 
          userProfile={userProfile}
          specId={INTELLIGENCE_APP_ID} 
          onBack={() => setView("chat")} 
          locationAlertActive={locationAlertActive}
          onDismissAlert={() => setLocationAlertActive(false)}
        />
      ) : (
        <div className="w-full h-full flex flex-col bg-[#EDEDED] relative">
          
          <header className="h-20 bg-[#1E293B] text-white flex items-center px-6 justify-between shadow-xl z-20 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="relative cursor-pointer" onClick={() => {
                let c = parseInt(sessionStorage.getItem("admin_clicks") || "0") + 1;
                sessionStorage.setItem("admin_clicks", c.toString());
                if (c >= 5) setIsAdminUnlocked(true);
              }}>
                <img src={NOA_AVATAR} className="w-12 h-12 rounded-full border-2 border-white/20" alt="Noa" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1E293B]"></div>
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight">נועה - ח.סבן</h1>
                <p className="text-xs text-[#C5A059] font-bold">סוכנת AI פעילה</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setView("admin")} 
                className="text-[#C5A059] hover:scale-110 transition-transform p-2 hover:bg-white/5 rounded-xl"
                title="כספת ניהול"
              >
                <Shield size={24} />
              </button>
              <Video size={20} className="text-white/60 hidden md:block" />
              <Phone size={18} className="text-white/60 hidden md:block" />
              <MoreVertical size={20} className="text-white/60" />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-[#e5ddd5] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  layout
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`shadow-sm relative mb-2 
                    ${msg.sender === "noa" ? "bg-white rounded-[24px] rounded-tl-none border-r-4 border-[#C5A059] w-full max-w-full" : "bg-[#DCF8C6] rounded-[24px] rounded-tr-none px-4 py-3 max-w-[85%]"}`}>
                    
                    {msg.sender === "noa" ? (
                      <div className="noa-render p-0 overflow-x-hidden text-[18px]">
                        <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                      </div>
                    ) : (
                      <div className="text-[16px] leading-relaxed font-medium">{msg.text}</div>
                    )}
                    
                    <div className="flex justify-end gap-1 mt-1 text-[10px] text-slate-400 font-bold px-4 pb-2">
                      <span>{msg.timestamp?.toDate ? format(msg.timestamp.toDate(), "HH:mm") : ""}</span>
                      {msg.sender === "user" && <CheckCheck size={14} className={msg.status === "seen" ? "text-blue-500" : ""} />}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                  <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
            <div ref={scrollRef} className="h-1 w-full" />
          </main>

          <footer className="bg-white/90 backdrop-blur-[10px] p-4 flex items-center gap-3 border-t border-slate-200 flex-shrink-0">
            <Smile className="text-slate-400 cursor-pointer hover:text-[#C5A059] transition-colors" />
            <Paperclip className="text-slate-400 rotate-45 cursor-pointer hover:text-[#C5A059] transition-colors" />
            <input 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendMessage()}
              placeholder="הקלד הודעה..."
              className="flex-1 bg-[#f1f5f9] rounded-2xl px-5 py-3 outline-none font-bold text-slate-700"
            />
            <button 
              onClick={handleSendMessage} 
              disabled={!inputText.trim() || isTyping}
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${!inputText.trim() || isTyping ? "bg-slate-300" : "bg-[#1E293B] hover:bg-[#334155] active:scale-95"}`}
            >
              <Send size={20} className="rotate-180" />
            </button>
          </footer>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
        
        .noa-render table { width: 100%; border-collapse: collapse; margin: 10px 0; background: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
        .noa-render th, .noa-render td { padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; }
        .noa-render th { background: #1e293b; color: white; font-weight: 900; }
        .noa-render .card { background: white; border: 1px solid #e2e8f0; padding: 20px; border-radius: 24px; margin: 10px 0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        .noa-render h3 { color: #1e293b; font-weight: 900; margin-bottom: 8px; }
        .noa-render * { max-width: 100%; overflow-wrap: break-word; }
      `}</style>
    </div>
  );
}
