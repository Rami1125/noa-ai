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
  ShieldAlert,
  Trash2,
  Forward,
  X,
  CheckCircle2,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Settings
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
  setDoc,
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
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [deviceId, setDeviceId] = useState<string>("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [view, setView] = useState<"chat" | "admin">(() => (localStorage.getItem("saban_view") as any) || "chat");
  const [isAdminMinimized, setIsAdminMinimized] = useState(false);

  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [locationAlertActive, setLocationAlertActive] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(() => localStorage.getItem("saban_simulation_mode") === "true");

  // Persistence logic for Simulation Mode
  useEffect(() => {
    localStorage.setItem("saban_simulation_mode", isSimulationMode.toString());
  }, [isSimulationMode]);

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
        // Auto-create profile for first-time users or specific IDs
        const isHarel = userId === "0505227724" || userId.toLowerCase().includes("harel");
        const isAdmin = userId === "SABAN-ADMIN" || userId === "0526012345";
        
        const initialProfile = {
          name: isHarel ? "הראל אידלסטון" : (isAdmin ? "Rami" : "משתמש חדש"),
          phone: isHarel ? "0505227724" : (userId.match(/^\d+$/) ? userId : ""),
          createdAt: serverTimestamp(),
          role: isHarel ? "CEO" : (isAdmin ? "Admin" : "User"),
          isAdmin: isAdmin || isHarel
        };
        
        setDoc(doc(dbIntelligence, getIntelligencePath("users"), userId), initialProfile);
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
      setTimeout(() => setIsLoading(false), 800); // Smooth transition
    }).catch(() => setIsLoading(false));
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
        if (d.userId === userId && (!isSimulationMode || d.isSimulation)) {
          msgs.push({ id: doc.id, ...d } as Message);
        }
      });
      setMessages(msgs);
      
      // Robust Auto-Scroll
      const scrollToBottom = () => {
        if (scrollRef.current) {
          scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
      };
      
      setTimeout(scrollToBottom, 100);
      
      const unread = msgs.filter(m => m.sender === "noa" && m.status !== "seen");
      if (unread.length > 0) {
        audioReceived.current?.play().catch(() => {});
        unread.forEach(m => updateDoc(doc(dbIntelligence, getIntelligencePath("chats"), m.id), { status: "seen" }));
        setTimeout(scrollToBottom, 500); // Secondary scroll after content renders
      }
    });
  }, [userId, view, isMounted, isSimulationMode]);

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
        location,
        isSimulation: isSimulationMode
      });
      audioSent.current?.play().catch(() => {});
      logInteraction("message_sent", { text, isSimulation: isSimulationMode });

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
        simulationMode: isSimulationMode,
        metadata: {
          sqlBridge: "ACTIVE",
          driveSync: "VERIFIED",
          simulation: isSimulationMode ? "ENABLED" : "OFF",
          timestamp: new Date().toISOString()
        }
      };

      const historyForAI = [...messages, { text, sender: "user" as const }];
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
        noaText = await getNoaResponse(historyForAI, context);
      }
      
      await addDoc(collection(dbIntelligence, getIntelligencePath("chats")), {
        text: noaText,
        sender: "noa",
        userId,
        timestamp: serverTimestamp(),
        status: "delivered",
        isSimulation: isSimulationMode
      });
      audioReceived.current?.play().catch(() => {});
      setIsTyping(false);
      logInteraction("ai_response", { text: noaText, isSimulation: isSimulationMode });
    } catch (e) { console.error(e); setIsTyping(false); }
  };

  const toggleMessageSelection = (msgId: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedMessages([msgId]);
      return;
    }
    setSelectedMessages(prev => 
      prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]
    );
  };

  const handleForwardMessages = () => {
    const texts = messages
      .filter(m => selectedMessages.includes(m.id))
      .map(m => m.text)
      .join("\n\n");
    setInputText(texts);
    setIsSelectionMode(false);
    setSelectedMessages([]);
  };

  const handleDeleteMessages = async () => {
    if (!window.confirm(`האם למחוק ${selectedMessages.length} הודעות?`)) return;
    try {
      const { deleteDoc, doc } = await import("firebase/firestore");
      await Promise.all(selectedMessages.map(id => 
        deleteDoc(doc(dbIntelligence, getIntelligencePath("chats"), id))
      ));
      logInteraction("messages_deleted", { count: selectedMessages.length });
    } catch (e) { console.error("Deletion error", e); }
    setIsSelectionMode(false);
    setSelectedMessages([]);
  };

  if (!isMounted || isLoading) {
    return (
      <div className="h-screen w-full bg-slate-900 flex flex-col items-center justify-center space-y-6">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="relative"
        >
          <img src={NOA_AVATAR} className="w-24 h-24 rounded-full border-4 border-[#C5A059] shadow-[0_0_40px_rgba(197,160,89,0.3)]" alt="SabanOS" />
          <div className="absolute -bottom-2 -right-2 bg-[#C5A059] p-2 rounded-xl shadow-lg border-2 border-slate-900">
             <Shield size={20} className="text-white" />
          </div>
        </motion.div>
        <div className="flex flex-col items-center gap-2">
           <h2 className="text-[#C5A059] font-black tracking-widest text-xl">SabanOS V30</h2>
           <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <motion.div 
                  key={i}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                  className="w-2 h-2 bg-white/40 rounded-full"
                />
              ))}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-900 font-sans selection:bg-[#C5A059]/30" dir="rtl">
      {/* Simulation Mode HUD Alert - Compact V28 */}
      {isSimulationMode && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[120] w-full max-w-xs px-2 pointer-events-none">
          <div className="bg-amber-500/90 backdrop-blur-md text-white py-1 w-full rounded-full shadow-lg flex items-center justify-between border border-amber-400/50 pointer-events-auto">
             <div className="flex items-center gap-2 px-3">
                <FlaskConical size={12} className="animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-wider">Simulation Active</span>
             </div>
             <button onClick={() => setIsSimulationMode(false)} className="bg-black/10 hover:bg-black/20 p-1 rounded-full ml-1">
                <X size={10} />
             </button>
          </div>
        </div>
      )}

      <div className="w-full h-full flex flex-col bg-[#EDEDED] relative">
        
        <header className={`h-14 md:h-20 flex items-center px-6 justify-between shadow-xl z-20 flex-shrink-0 transition-all ${isSelectionMode ? "bg-emerald-600 text-white" : "bg-[#1E293B] text-white"}`}>
          {isSelectionMode ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <button onClick={() => { setIsSelectionMode(false); setSelectedMessages([]); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} />
                </button>
                <span className="text-xl font-bold">{selectedMessages.length} נבחרו</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleForwardMessages} className="p-3 hover:bg-white/10 rounded-xl transition-colors" title="העבר">
                  <Forward size={24} />
                </button>
                <button onClick={handleDeleteMessages} className="p-3 hover:bg-white/10 rounded-xl transition-colors" title="מחק">
                  <Trash2 size={24} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="relative cursor-pointer" onClick={() => {
                  let c = parseInt(sessionStorage.getItem("admin_clicks") || "0") + 1;
                  sessionStorage.setItem("admin_clicks", c.toString());
                  if (c >= 5) setIsAdminUnlocked(true);
                }}>
                  <img src={NOA_AVATAR} className="w-10 h-10 md:w-14 md:h-14 rounded-full border-2 border-white/20 shadow-lg object-cover" alt="Noa" />
                  <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 ${isSimulationMode ? "bg-amber-500" : "bg-green-500"} rounded-full border-2 border-[#1E293B] shadow-sm`}></div>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-[15px] md:text-xl font-black tracking-tight leading-none mb-1">נועה - SabanOS {isSimulationMode && "🧪"}</h1>
                  <p className="text-[10px] md:text-xs text-[#C5A059] font-black uppercase tracking-tight opacity-90">{isSimulationMode ? "Simulation Passive" : "AI Intelligence Active"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 md:gap-6">
                <button 
                  onClick={() => setView("admin")} 
                  className="text-[#C5A059] hover:scale-110 transition-all p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl shadow-xl z-[150]"
                  title="כספת ניהול"
                >
                  <Shield size={22} className="md:w-6 md:h-6" />
                </button>
                <div className="hidden md:flex items-center gap-5">
                   <Video size={18} className="text-white/60 hover:text-white transition-colors cursor-pointer" />
                   <Phone size={16} className="text-white/60 hover:text-white transition-colors cursor-pointer" />
                </div>
                <MoreVertical size={18} className="text-white/40 cursor-pointer" />
              </div>
            </>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar bg-[#e5ddd5] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div 
                key={msg.id} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                layout
                onClick={() => isSelectionMode && toggleMessageSelection(msg.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  toggleMessageSelection(msg.id);
                }}
                className={`flex group relative transition-all duration-300 gap-2 md:gap-3 ${isSelectionMode ? "cursor-pointer" : ""} ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"} ${selectedMessages.includes(msg.id) ? "bg-emerald-50/30" : ""}`}
              >
                {/* WhatsApp Style Avatar - Optimized 32x32 (w-8 h-8) */}
                <div className="flex-shrink-0 mt-auto mb-2">
                  <img 
                    src={msg.sender === "noa" ? NOA_AVATAR : (userProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`)} 
                    className="w-8 h-8 rounded-full border-2 border-white shadow-md object-cover" 
                    alt="Avatar"
                  />
                </div>

                {isSelectionMode && (
                  <div className={`absolute top-1/2 -translate-y-1/2 p-2 transition-opacity ${msg.sender === "user" ? "right-full mr-12" : "left-full ml-12"}`}>
                     <CheckCircle2 size={18} className={selectedMessages.includes(msg.id) ? "text-emerald-500 fill-emerald-500" : "text-slate-300"} />
                  </div>
                )}

                <div className={`shadow-sm relative mb-3 group transition-all
                  ${msg.sender === "noa" ? "bg-white rounded-[24px] rounded-tl-none border-r-4 border-[#C5A059] w-full max-w-full" : "bg-[#DCF8C6] rounded-[24px] rounded-tr-none px-3 py-2 md:px-4 md:py-3 max-w-[85%]"} ${selectedMessages.includes(msg.id) ? "ring-2 ring-emerald-500 ring-offset-2" : ""}`}>
                  
                  {msg.sender === "noa" ? (
                    <div className="noa-render p-0 overflow-x-hidden text-[14px] md:text-[18px]">
                      <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                    </div>
                  ) : (
                    <div className="text-[14px] md:text-[16px] leading-relaxed font-medium">{msg.text}</div>
                  )}
                  
                  <div className="flex justify-end gap-1 mt-1 text-[10px] text-slate-400 font-bold px-4 pb-2">
                     <span title={msg.timestamp?.toDate ? format(msg.timestamp.toDate(), "dd/MM/yyyy HH:mm:ss") : ""}>
                      {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), "HH:mm") : ""}
                    </span>
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
          <div ref={scrollRef} className="h-4 w-full" />
        </main>

        <footer className="bg-white/90 backdrop-blur-[10px] p-4 flex items-center gap-3 border-t border-slate-200 flex-shrink-0">
          <Smile className="text-slate-400 cursor-pointer hover:text-[#C5A059] transition-colors" />
          <Paperclip className="text-slate-400 rotate-45 cursor-pointer hover:text-[#C5A059] transition-colors" />
          <input 
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSendMessage()}
            placeholder="הקלד הודעה..."
            className="flex-1 bg-[#f1f5f9] rounded-2xl px-4 py-2 md:px-5 md:py-3 outline-none font-bold text-slate-700 text-sm md:text-base"
          />
          <button 
            onClick={handleSendMessage} 
            disabled={!inputText.trim() || isTyping}
            className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${!inputText.trim() || isTyping ? "bg-slate-300" : "bg-[#1E293B] hover:bg-[#334155] active:scale-95"}`}
          >
            <Send size={20} className="rotate-180" />
          </button>
        </footer>
      </div>

      {/* Admin Drawer Overlay */}
      <AnimatePresence>
        {view === "admin" && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setView("chat")}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80]"
            />
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: isAdminMinimized ? "-95%" : 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[95%] md:w-[85%] lg:w-[1200px] max-w-[100vw] bg-white z-[90] shadow-2xl flex flex-col overflow-hidden"
            >
               {/* Drawer Controls */}
               <div className="absolute top-4 left-4 z-[100] flex gap-3">
                  <button 
                    onClick={() => setIsAdminMinimized(!isAdminMinimized)}
                    className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center shadow-md transition-all sm:hidden"
                  >
                    {isAdminMinimized ? <ChevronLeft size={20} /> : <div className="w-4 h-1 bg-slate-400 rounded-full" />}
                  </button>
                  <button 
                    onClick={() => setView("chat")}
                    className="w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-red-500/30 transition-all active:scale-90"
                  >
                    <X size={24} />
                  </button>
               </div>

               <AdminDashboard 
                 userId={userId || ""} 
                 userProfile={userProfile}
                 specId={INTELLIGENCE_APP_ID} 
                 onBack={() => setView("chat")} 
                 locationAlertActive={locationAlertActive}
                 onDismissAlert={() => setLocationAlertActive(false)}
                 isSimulationMode={isSimulationMode}
                 onToggleSimulation={() => setIsSimulationMode(!isSimulationMode)}
               />
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
