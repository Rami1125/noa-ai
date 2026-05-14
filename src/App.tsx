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
import { db, initAuth } from "./lib/firebase";
import { getNoaResponse } from "./services/geminiService";
import { format } from "date-fns";

const SPEC_APP_ID = "ai-studio-cc5d2687-b402-4b97-b808-5ba700689e0e";
const NOA_AVATAR = "https://i.postimg.cc/qqLm9M5t/Gemini-Generated-Image-gmd5k7gmd5k7gmd5.png";

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
  const [deviceId, setDeviceId] = useState<string>("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [view, setView] = useState<"chat" | "admin">("chat");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [locationAlertActive, setLocationAlertActive] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioSent = useRef<HTMLAudioElement | null>(null);
  const audioReceived = useRef<HTMLAudioElement | null>(null);
  const audioAlert = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
    audioSent.current = new Audio("https://www.myinstants.com/media/sounds/whatsapp_sent.mp3");
    audioReceived.current = new Audio("https://www.myinstants.com/media/sounds/whatsapp_incoming.mp3");
    audioAlert.current = new Audio("https://www.myinstants.com/media/sounds/emergency-alarm-with-reverb.mp3");
    
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

  const getCollectionPath = (name: string) => `artifacts/${SPEC_APP_ID}/public/data/${name}`;

  const logInteraction = async (event: string, metadata: any) => {
    if (!isMounted) return;
    try {
      await addDoc(collection(db, getCollectionPath("ai_logs")), {
        event,
        deviceId: localStorage.getItem("deviceId") || "unknown",
        userId,
        location,
        timestamp: serverTimestamp(),
        ...metadata
      });
    } catch (e) { console.error("Logging error", e); }
  };

  useEffect(() => {
    if (!userId || view !== "chat" || !isMounted) return;
    const q = query(collection(db, getCollectionPath("chats")), orderBy("timestamp", "asc"));
    return onSnapshot(q, (snap) => {
      const msgs: Message[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (d.userId === userId) msgs.push({ id: doc.id, ...d } as Message);
      });
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      
      const unread = msgs.filter(m => m.sender === "noa" && m.status !== "seen");
      unread.forEach(m => updateDoc(doc(db, getCollectionPath("chats"), m.id), { status: "seen" }));
    });
  }, [userId, view, isMounted]);

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
    const text = inputText;
    setInputText("");
    
    try {
      await addDoc(collection(db, getCollectionPath("chats")), {
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
      const [orders, sales, dnaLogs] = await Promise.all([
        getDocs(query(collection(db, getCollectionPath("orders")), orderBy("timestamp", "desc"), limit(5))),
        getDocs(query(collection(db, getCollectionPath("sales")), orderBy("timestamp", "desc"), limit(5))),
        getDocs(query(collection(db, getCollectionPath("ai_logs")), where("type", "==", "dna_training"), orderBy("timestamp", "desc"), limit(1)))
      ]);

      const context = {
        orders: orders.docs.map(d => d.data()),
        sales: sales.docs.map(d => d.data()),
        dnaTraining: dnaLogs.docs.length > 0 ? dnaLogs.docs[0].data().content : null,
        deviceId,
        location
      };

      const noaText = await getNoaResponse(messages.map(m => ({ text: m.text, sender: m.sender })), context);
      
      await addDoc(collection(db, getCollectionPath("chats")), {
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
    <div className="h-screen w-full flex bg-[#F8FAFC] font-['Heebo'] rtl overflow-hidden" dir="rtl" suppressHydrationWarning>
      {view === "admin" ? (
        <AdminDashboard 
          userId={userId || ""} 
          specId={SPEC_APP_ID} 
          onBack={() => setView("chat")} 
          locationAlertActive={locationAlertActive}
          onDismissAlert={() => setLocationAlertActive(false)}
        />
      ) : (
        <div className="flex-1 flex flex-col bg-[#e5ddd5] bg-opacity-40 relative overflow-hidden" 
             style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundBlendMode: "overlay"}}>
          
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

          <main className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id} 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`shadow-sm relative mb-2 max-w-[95%] sm:max-w-[85%]
                    ${msg.sender === "noa" ? "bg-white rounded-[24px] rounded-tl-none border-r-4 border-[#C5A059] w-full" : "bg-[#DCF8C6] rounded-[24px] rounded-tr-none px-4 py-3"}`}>
                    
                    {msg.sender === "noa" ? (
                      <div 
                        className="noa-render p-4 overflow-x-hidden text-[18px]" 
                        dangerouslySetInnerHTML={{ __html: msg.text }} 
                      />
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
