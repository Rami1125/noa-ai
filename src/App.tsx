import React, { useState, useEffect, useRef } from "react";
import AdminDashboard from "./components/AdminDashboard";
import { 
  Send, 
  Paperclip, 
  Smile, 
  Shield,
  X,
  ChevronLeft
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
  setDoc
} from "firebase/firestore";
import { dbIntelligence, initAuth, INTELLIGENCE_APP_ID } from "./lib/firebase";
import { getNoaResponse } from "./services/geminiService";
import { format } from "date-fns";

const DRIVE_APP_ID = "saban-ai-drive";
const NOA_AVATAR = "https://i.postimg.cc/qqLm9M5t/Gemini-Generated-Image-gmd5k7gmd5k7gmd5.png";

type Message = {
  id: string;
  text: string;
  sender: "user" | "noa";
  timestamp: any;
  status: "sent" | "delivered" | "seen";
  userId?: string;
  isSimulation?: boolean;
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
  const [locationAlertActive, setLocationAlertActive] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(() => localStorage.getItem("saban_simulation_mode") === "true");

  const scrollRef = useRef<HTMLDivElement>(null);
  const audioSent = useRef<HTMLAudioElement | null>(null);
  const audioReceived = useRef<HTMLAudioElement | null>(null);

  // Initialization logic
  useEffect(() => {
    setIsMounted(true);
    audioSent.current = new Audio("https://raw.githubusercontent.com/AnestisG/whatsapp-call-recorder/master/res/raw/whatsapp_outgoing_message.mp3");
    audioReceived.current = new Audio("https://raw.githubusercontent.com/AnestisG/whatsapp-call-recorder/master/res/raw/whatsapp_incoming_message.mp3");
    
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
    
    // Auth and deep linking
    const params = new URLSearchParams(window.location.search);
    const phoneParam = params.get("phone") || params.get("id");
    if (phoneParam) {
      setUserId(phoneParam);
      localStorage.setItem("saban_active_userId", phoneParam);
    } else {
      const savedId = localStorage.getItem("saban_active_userId");
      if (savedId) setUserId(savedId);
    }

    initAuth().then(user => {
      if (user && !phoneParam) setUserId(user.uid);
      setTimeout(() => setIsLoading(false), 1200);
    }).catch(() => setIsLoading(false));
  }, []);

  const getIntelligencePath = (name: string) => `artifacts/${INTELLIGENCE_APP_ID}/public/data/${name}`;

  // User Profile Listener (Operational Logic)
  useEffect(() => {
    if (!userId || !isMounted) return;
    const unsub = onSnapshot(doc(dbIntelligence, getIntelligencePath("users"), userId), (snap) => {
      if (snap.exists()) {
        const profile = { id: snap.id, ...snap.data() } as any;
        
        // Operational Identity Logic
        const isRami = profile.name === "Rami" || profile.name === "רמי" || userId === "SABAN-ADMIN" || profile.phone === "0526012345";
        const isHarel = profile.phone === "0505227724" || userId === "0505227724" || profile.name?.includes("הראל");

        if (isRami) {
          profile.role = "Commander";
          profile.authority = "SOLE_AUTHORITY";
        } else if (isHarel) {
          profile.role = "CEO";
          profile.powerLevel = "מנכ״ל";
          profile.label = "המנכ״ל הראל אידלסטון";
        }

        setUserProfile(profile);
      } else {
        // Initial setup
        setDoc(doc(dbIntelligence, getIntelligencePath("users"), userId), {
          name: "User_" + userId.slice(-4),
          phone: userId,
          createdAt: serverTimestamp(),
          role: "Operational"
        });
      }
    });
    return () => unsub();
  }, [userId, isMounted]);

  // Messages Listener
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
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
  }, [userId, view, isMounted, isSimulationMode]);

  // Operational Brain (Tool Orchestrator)
  const executeTools = async (calls: any[]) => {
    const results: any[] = [];
    for (const call of calls) {
      console.log(`Executing Tool: ${call.name}`, call.args);
      let response = { status: "success", data: {} };
      
      switch (call.name) {
        case "get_inventory":
          response.data = { cement: 450, iron: 120, concrete_blocks: 2200 };
          break;
        case "predict_order_eta":
          response.data = { eta: "14:45", route_status: "heavy_traffic" };
          break;
        case "analyze_pdf_content":
          response.data = { customer: "Saban Construction", site: "Herzl 45", items: [{ name: "Cement", qty: 20 }] };
          break;
        case "create_order":
          response.data = { orderId: "ORD-" + Math.random().toString(36).substr(2, 5).toUpperCase(), status: "queued" };
          break;
        default:
          response.data = { message: "Action logged in SabanOS" };
      }
      results.push({ name: call.name, response });
    }
    return results;
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !userId) return;
    const text = inputText;
    setInputText("");
    
    try {
      await addDoc(collection(dbIntelligence, getIntelligencePath("chats")), {
        text,
        sender: "user",
        userId,
        timestamp: serverTimestamp(),
        status: "sent",
        isSimulation: isSimulationMode
      });
      audioSent.current?.play().catch(() => {});
      setIsTyping(true);

      const context = {
        location,
        deviceId,
        userProfile,
        isCeoActive: userProfile?.role === "CEO",
        timestamp: new Date().toISOString()
      };

      const aiResponse = await getNoaResponse([...messages, { text, sender: "user" } as Message], context);
      let finalNoaText = aiResponse.text;

      if (aiResponse.functionCalls) {
        await executeTools(aiResponse.functionCalls);
      }

      await addDoc(collection(dbIntelligence, getIntelligencePath("chats")), {
        text: finalNoaText,
        sender: "noa",
        userId,
        timestamp: serverTimestamp(),
        status: "delivered",
        isSimulation: isSimulationMode
      });
      audioReceived.current?.play().catch(() => {});
      setIsTyping(false);
    } catch (e) {
      console.error(e);
      setIsTyping(false);
    }
  };

  if (!isMounted || isLoading) {
    return (
      <div className="h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-8 text-center">
        <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}>
          <img src={NOA_AVATAR} className="w-28 h-28 rounded-full border-4 border-[#C5A059] shadow-2xl" alt="SabanOS" />
        </motion.div>
        <h2 className="mt-8 text-[#C5A059] font-black tracking-[0.2em] text-2xl uppercase">SabanOS V31</h2>
        <p className="text-white/40 font-mono text-[10px] mt-2 uppercase tracking-widest">Waking up the operational brain...</p>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-900 font-['Heebo'] selection:bg-[#C5A059]/30 rtl" dir="rtl">
      {isSimulationMode && (
        <div className="fixed top-0 inset-x-0 h-1 bg-amber-500 z-[100] shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
      )}

      <div className="w-full h-full flex flex-col bg-[#EDEDED]">
        <header className="bg-[#1e293b] text-white h-16 md:h-20 flex items-center px-4 md:px-6 justify-between shadow-2xl z-30 flex-shrink-0">
           <div className="flex items-center gap-3">
              <div className="relative group cursor-pointer" onClick={() => setView("admin")}>
                 <img src={NOA_AVATAR} className="w-10 h-10 md:w-14 md:h-14 rounded-full border-2 border-white/20 shadow-lg object-cover" alt="Noa" />
                 <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${isSimulationMode ? "bg-amber-500" : "bg-emerald-500"} rounded-full border-2 border-[#1e293b] shadow-sm`} />
              </div>
              <div className="flex flex-col">
                 <h1 className="text-sm md:text-lg font-black tracking-tight leading-none uppercase">noa brain v31</h1>
                 <span className="text-[9px] md:text-[10px] text-[#C5A059] font-bold tracking-widest uppercase opacity-80">Operational Intelligence</span>
              </div>
           </div>

           <div className="flex items-center gap-4">
              <button 
                onClick={() => setView("admin")} 
                className="w-10 h-10 md:w-12 md:h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-all active:scale-90"
              >
                 <Shield size={20} className="text-[#C5A059]" />
              </button>
              <div className="flex flex-col items-end">
                 <span className="text-[10px] font-black text-white/50">{userProfile?.name?.toUpperCase() || "AGENT"}</span>
                 <span className="text-[9px] font-bold text-[#C5A059]">{userProfile?.role || "OPERATIONAL"}</span>
              </div>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#e5ddd5] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] custom-scrollbar">
           <AnimatePresence>
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`flex gap-3 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                   <img 
                      src={msg.sender === "noa" ? NOA_AVATAR : (userProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`)} 
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm object-cover mt-auto" 
                      alt="" 
                   />
                   
                   <div className={`relative max-w-[85%] md:max-w-[70%] p-3 md:p-4 rounded-3xl shadow-sm ${msg.sender === "user" ? "bg-[#DCF8C6] border border-green-200 rounded-tr-none" : "bg-white border border-slate-200 rounded-tl-none"}`}>
                      {msg.sender === "noa" ? (
                        <div className="noa-render text-[14px] md:text-[18px]" dangerouslySetInnerHTML={{ __html: msg.text }} />
                      ) : (
                        <p className="text-[15px] md:text-[16px] font-bold text-slate-800 leading-snug">{msg.text}</p>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1 opacity-40 text-[9px] font-black">
                         <span>{msg.timestamp?.toDate ? format(msg.timestamp.toDate(), "HH:mm") : "--:--"}</span>
                      </div>
                   </div>
                </motion.div>
              ))}
           </AnimatePresence>
           {isTyping && (
             <div className="flex gap-2 p-4 bg-white/50 backdrop-blur-sm rounded-full w-20 justify-center">
                <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce [animation-delay:0.4s]" />
             </div>
           )}
           <div ref={scrollRef} className="h-4 w-full" />
        </main>

        <footer className="bg-white/95 backdrop-blur-xl p-4 flex items-center gap-3 border-t border-slate-200 shadow-inner">
           <div className="hidden sm:flex gap-3 text-slate-400">
              <Smile className="hover:text-[#C5A059] cursor-pointer transition-colors" />
              <Paperclip className="rotate-45 hover:text-[#C5A059] cursor-pointer transition-colors" />
           </div>
           <input 
             value={inputText}
             onChange={e => setInputText(e.target.value)}
             onKeyDown={e => e.key === "Enter" && handleSendMessage()}
             placeholder="Message SabanOS Intelligence..."
             className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-3 font-bold text-[#1e293b] outline-none focus:border-[#C5A059] transition-all"
           />
           <button 
             onClick={handleSendMessage}
             disabled={!inputText.trim() || isTyping}
             className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${!inputText.trim() || isTyping ? "bg-slate-200 text-slate-400" : "bg-[#1e293b] text-white hover:bg-black active:scale-95"}`}
           >
              <Send size={22} className="rotate-180" />
           </button>
        </footer>
      </div>

      <AnimatePresence>
        {view === "admin" && (
          <>
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setView("chat")}
               className="fixed inset-0 bg-[#1e293b]/60 backdrop-blur-md z-[80]"
            />
            <motion.div 
               initial={{ x: "-100%" }} 
               animate={{ x: isAdminMinimized ? "-98%" : 0 }} 
               exit={{ x: "-100%" }}
               transition={{ type: "spring", damping: 25, stiffness: 200 }}
               className="fixed inset-y-0 left-0 w-[95%] md:w-[850px] bg-[#f1f5f9] z-[90] shadow-3xl flex flex-col border-r border-[#C5A059]/20"
            >
               <div className="absolute top-4 left-4 z-[100] flex flex-col gap-3 items-end">
                  <button onClick={() => setView("chat")} className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all ring-2 ring-red-500/20">
                     <X size={24} />
                  </button>
                  <button onClick={() => setIsAdminMinimized(!isAdminMinimized)} className="w-10 h-10 bg-slate-800 text-white rounded-full shadow-lg flex items-center justify-center">
                     {isAdminMinimized ? <ChevronLeft size={20} /> : <div className="w-4 h-1 bg-white/30 rounded-full" />}
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
    </div>
  );
}
