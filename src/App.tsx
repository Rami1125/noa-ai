/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  Check, 
  CheckCheck,
  Trash2,
  ChevronLeft,
  Shield
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
  deleteDoc,
  getDocs,
  setDoc,
  limit,
  where,
  arrayUnion,
  arrayRemove 
} from "firebase/firestore";
import { auth, db, initAuth } from "./lib/firebase";
import { getNoaResponse } from "./services/geminiService";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { format } from "date-fns";

// Branding Constants
const APP_ID = "ai-studio-cc5d2687-b402-4b97-b402-4b97-b402-4b97-b402"; // Note: User provided ID is different but common pattern. I'll use the one from their prompt.
const SPEC_APP_ID = "ai-studio-cc5d2687-b402-4b97-b808-5ba700689e0e";
const BRAND_GREEN = "#128C7E";
const BRAND_DARK_GREEN = "#075E54";
const NOA_AVATAR = "https://i.postimg.cc/qqLm9M5t/Gemini-Generated-Image-gmd5k7gmd5k7gmd5.png";
const DRIVE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY || "";

type Message = {
  id: string;
  text: string;
  sender: "user" | "noa";
  timestamp: any;
  status: "sent" | "delivered" | "seen";
  userId?: string;
  reactions?: string[];
  location?: { lat: number; lng: number } | null;
  fileMetadata?: { name: string; size: number; type: string; driveId?: string; previewUrl?: string };
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string>("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [view, setView] = useState<"chat" | "contacts" | "admin">("chat");
  const [activeReactionPicker, setActiveReactionPicker] = useState<string | null>(null);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [customerInfo, setCustomerInfo] = useState({ name: "לקוח מס' 1290", orderId: "ORD-9821" });
  const [userProfile, setUserProfile] = useState<any>(null);
  const [locationAlertActive, setLocationAlertActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Audio Refs
  const audioSent = useRef<HTMLAudioElement>(new Audio("https://www.myinstants.com/media/sounds/whatsapp_sent.mp3"));
  const audioReceived = useRef<HTMLAudioElement>(new Audio("https://www.myinstants.com/media/sounds/whatsapp_incoming.mp3"));
  const audioLocation = useRef<HTMLAudioElement>(new Audio("https://www.myinstants.com/media/sounds/whatsapp_location.mp3"));
  const audioAlert = useRef<HTMLAudioElement>(new Audio("https://www.myinstants.com/media/sounds/emergency-alarm-with-reverb.mp3"));

  // Fetch DNA DNA (Personality Profile)
  useEffect(() => {
    if (!userId) return;
    const fetchDna = async () => {
      try {
        const dnaSnap = await getDocs(collection(db, getCollectionPath("user_profiles")));
        // For demo, we just take the first profile or one named 'rami'
        const profile = dnaSnap.docs.find(d => d.id === "rami")?.data();
        if (profile) setUserProfile(profile);
      } catch (err) { console.error("DNA fetch error", err); }
    };
    fetchDna();
  }, [userId]);

  // Location Alert Loop for Admin
  useEffect(() => {
    if (view === "admin" && locationAlertActive) {
      audioAlert.current.loop = true;
      audioAlert.current.play().catch(() => {});
    } else {
      audioAlert.current.pause();
      audioAlert.current.currentTime = 0;
    }
  }, [view, locationAlertActive]);

  // Monitor logs for location alerts (Simulating real-time alert trigger)
  useEffect(() => {
    if (!userId) return;
    const logsQ = query(collection(db, getCollectionPath("ai_logs")), where("event", "==", "location_sent"), limit(1));
    const unsub = onSnapshot(logsQ, (snap) => {
      if (!snap.empty) {
        const latest = snap.docs[0].data();
        const now = Date.now();
        const msgTime = latest.timestamp?.toMillis() || 0;
        if (now - msgTime < 10000) { // If sent in last 10 seconds
           setLocationAlertActive(true);
        }
      }
    });
    return () => unsub();
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    const updateHeartbeat = async () => {
      try {
        await setDoc(doc(db, getCollectionPath("user_settings"), userId), {
          lastHeartbeat: serverTimestamp(),
          status: "online",
          deviceId
        }, { merge: true });
      } catch (err) { console.error("Heartbeat error", err); }
    };
    const interval = setInterval(updateHeartbeat, 30000);
    updateHeartbeat();
    return () => clearInterval(interval);
  }, [userId, deviceId]);

  // Path Helper
  const getCollectionPath = (collectionName: string) => `artifacts/${SPEC_APP_ID}/public/data/${collectionName}`;

  // Log Event Helper
  const logInteraction = async (event: string, metadata: any) => {
    if (!SPEC_APP_ID) return;
    try {
      await addDoc(collection(db, getCollectionPath("ai_logs")), {
        event,
        deviceId: localStorage.getItem("deviceId") || "unknown",
        userId,
        location,
        timestamp: serverTimestamp(),
        ...metadata
      });
    } catch (err) {
      console.error("Logging error:", err);
    }
  };

  // Device & Location Init
  useEffect(() => {
    let id = localStorage.getItem("deviceId");
    if (!id) {
      id = "DEV-" + Math.random().toString(36).substr(2, 9).toUpperCase();
      localStorage.setItem("deviceId", id);
    }
    setDeviceId(id);

    if ("geolocation" in navigator) {
      navigator.geolocation.watchPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("Location blocked", err)
      );
    }
    
    logInteraction("app_init", { platform: navigator.platform });
  }, []);

  // Mark messages as seen when entering chat view
  useEffect(() => {
    if (view === "chat" && messages.length > 0 && userId) {
      const chatPath = getCollectionPath("chats");
      const unreadMsgs = messages.filter(m => m.sender === "noa" && m.status !== "seen");
      
      if (unreadMsgs.length > 0) {
        unreadMsgs.forEach(async (m) => {
          try {
            await updateDoc(doc(db, chatPath, m.id), { status: "seen" });
          } catch (err) {
            console.error("Status update error", err);
          }
        });
      }
    }
  }, [view, messages, userId]);

  // Calculate unread count
  useEffect(() => {
    const count = messages.filter(m => m.sender === "noa" && m.status !== "seen").length;
    setUnreadCount(count);
  }, [messages]);

  // Reaction options
  const REACTION_EMOJIS = ["❤️", "👍", "😮", "😂", "😢", "🙏"];

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!userId) return;
    const chatPath = getCollectionPath("chats");
    const messageRef = doc(db, chatPath, messageId);
    
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const hasReaction = message.reactions?.includes(emoji);

    try {
      if (hasReaction) {
        await updateDoc(messageRef, {
          reactions: arrayRemove(emoji)
        });
      } else {
        await updateDoc(messageRef, {
          reactions: arrayUnion(emoji)
        });
      }
      setActiveReactionPicker(null);
    } catch (error) {
      console.error("Error updating reaction:", error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!userId) return;
    const chatPath = getCollectionPath("chats");
    try {
      await deleteDoc(doc(db, chatPath, messageId));
      setDeletingMessageId(null);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  // Initialize Auth (Anonymous priority)
  useEffect(() => {
    import("firebase/auth").then(({ signInAnonymously, getAuth }) => {
      const auth = getAuth();
      signInAnonymously(auth).then((cred) => {
        setUserId(cred.user.uid);
      }).catch(err => {
        console.error("Auth error", err);
        // Fallback to existing initAuth if any
        initAuth().then((user) => {
          if (user) setUserId(user.uid);
        });
      });
    }).catch(err => {
       console.error("Auth import error", err);
    });
  }, []);

  // Sync Messages
  useEffect(() => {
    if (!userId || view !== "chat") return;

    const chatPath = getCollectionPath("chats");
    const q = query(collection(db, chatPath), orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.userId === userId) {
          msgs.push({ id: doc.id, ...data } as Message);
        }
      });
      setMessages(msgs);
      setTimeout(() => scrollToBottom(), 100);
    });

    return () => unsubscribe();
  }, [userId, view]);

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    const chatPath = getCollectionPath("chats");
    
    try {
      let previewUrl = "";
      if (file.type.startsWith("image/")) {
        previewUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      const fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl: previewUrl || undefined
      };

      await addDoc(collection(db, chatPath), {
        text: file.type.startsWith("image/") ? "" : `📎 **קובץ צורף:** ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        sender: "user",
        userId: userId,
        timestamp: serverTimestamp(),
        status: "sent",
        fileMetadata: fileData,
        location
      });

      // Log to AI Logs and Bridge Sessions
      logInteraction("file_upload", { fileName: file.name, fileSize: file.size });
      await addDoc(collection(db, getCollectionPath("bridge_sessions")), {
        type: "attachment",
        userId,
        fileName: file.name,
        timestamp: serverTimestamp()
      });

      setIsTyping(true);
      const noaText = await getNoaResponse([{ text: `העליתי קובץ בשם ${file.name}`, sender: "user" }]);
      await addDoc(collection(db, chatPath), {
        text: noaText,
        sender: "noa",
        userId: userId,
        timestamp: serverTimestamp(),
        status: "delivered",
      });
      
      audioReceived.current.play().catch(() => {});
      setIsTyping(false);
    } catch (error) {
      console.error("Error attaching file:", error);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !userId) return;

    const chatPath = getCollectionPath("chats");
    const userMsg = inputText.trim();
    setInputText("");

    try {
      await addDoc(collection(db, chatPath), {
        text: userMsg,
        sender: "user",
        userId: userId,
        timestamp: serverTimestamp(),
        status: "sent",
        location
      });
      
      audioSent.current.play().catch(() => {});
      if (location) {
        audioLocation.current.play().catch(() => {});
        logInteraction("location_sent", { coords: location });
      }
      logInteraction("message_sent", { textLength: userMsg.length });

      setIsTyping(true);
      
      // Fetch Multi-Collection Context (Knowledge Base Sync)
      const [ordersSnap, salesSnap, inventorySnap, customerSnap] = await Promise.all([
        getDocs(query(collection(db, getCollectionPath("orders")), orderBy("timestamp", "desc"), limit(5))),
        getDocs(query(collection(db, getCollectionPath("sales")), orderBy("timestamp", "desc"), limit(10))),
        getDocs(collection(db, getCollectionPath("inventory"))),
        getDocs(query(collection(db, getCollectionPath("customers")), limit(1)))
      ]);

      const context = {
        orders: ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        sales: salesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        inventory: inventorySnap.docs.map(d => ({ id: d.id, ...d.data() })),
        customerProfile: customerSnap.docs[0]?.data() || customerInfo,
        userProfile: userProfile, // PASSING DNA
        deviceId,
        location
      };
      
      const history = messages.map(m => ({ text: m.text, sender: m.sender }));
      history.push({ text: userMsg, sender: "user" });
      
      const noaText = await getNoaResponse(history, context);
      
      await addDoc(collection(db, chatPath), {
        text: noaText,
        sender: "noa",
        userId: userId,
        timestamp: serverTimestamp(),
        status: "delivered",
      });
      
      setIsTyping(false);
    } catch (error) {
      console.error("Error sending message:", error);
      setIsTyping(false);
    }
  };

  const clearChat = async () => {
    if (!userId) return;
    const chatPath = getCollectionPath("chats");
    const q = query(collection(db, chatPath));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs
      .filter(doc => doc.data().userId === userId)
      .map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  };

  if (!userId) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#f0f2f5]">
        <div className="text-center animate-pulse">
           <div className="w-20 h-20 bg-[#25d366] rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg">
             <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
           </div>
           <p className="text-gray-500 font-medium">מתחבר למערכת...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col h-screen w-full shadow-2xl overflow-hidden font-heebo relative" 
      style={{ 
        backgroundColor: "#e5ddd5", 
        backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
        backgroundBlendMode: "overlay"
      }} 
      dir="rtl"
    >
      {view === "admin" ? (
        <AdminDashboard 
          userId={userId} 
          specId={SPEC_APP_ID} 
          onBack={() => setView("chat")} 
          locationAlertActive={locationAlertActive}
          onDismissAlert={() => setLocationAlertActive(false)}
        />
      ) : view === "contacts" ? (
        <>
          {/* Contacts Header */}
          <header className="h-20 bg-[#075E54] text-white flex items-center px-6 justify-between shadow-lg z-10">
            <div className="flex items-center gap-4">
              <button onClick={() => setView("chat")} className="hover:bg-white/10 p-2 rounded-full transition-colors">
                <ChevronLeft size={24} />
              </button>
              <div>
                <h1 className="text-lg font-bold leading-tight flex items-center gap-2">
                  בחר איש קשר
                  {unreadCount > 0 && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]"></div>}
                </h1>
                <p className="text-xs text-white/80">אנשי קשר זמינים</p>
              </div>
            </div>
          </header>

          {/* Contacts List Body */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 custom-scrollbar bg-white/40 backdrop-blur-sm">
            <div 
              onClick={() => setView("chat")}
              className="flex items-center gap-4 p-4 bg-white/60 hover:bg-[#DCF8C6]/60 rounded-2xl cursor-pointer transition-all border border-white/40 shadow-sm"
            >
              <div className="relative">
                <img 
                  src={NOA_AVATAR} 
                  alt="Noa" 
                  className="w-14 h-14 rounded-full border-2 border-[#128C7E]/20"
                />
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-[#075E54]">נועה AI</h2>
                <p className="text-sm text-gray-600 truncate">מענה חכם ללוגיסטיקה ח.סבן</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="text-green-600 font-bold text-xs">מחוברת</div>
                {unreadCount > 0 && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-[#25D366] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-sm"
                  >
                    {unreadCount}
                  </motion.div>
                )}
              </div>
            </div>
            
            {/* Mock Contacts for visual fidelity */}
            {["שירות לקוחות", "מחסן מרכזי", "הנהלת חשבונות"].map((name, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-white/30 rounded-2xl grayscale opacity-70 border border-white/20">
                <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
                   <div className="w-8 h-8 rounded-full bg-gray-300"></div>
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-gray-500">{name}</h2>
                  <p className="text-sm text-gray-400">לא זמין כרגע</p>
                </div>
              </div>
            ))}
          </main>
        </>
      ) : (
        <>
          {/* Header */}
          <header className="h-16 bg-[#075E54] text-white flex items-center px-4 justify-between shadow-md z-20">
            <div className="flex items-center gap-[10px]">
              <div className="flex items-center gap-1 group">
                <button onClick={() => setView("contacts")} className="md:hidden hover:bg-white/10 p-1 rounded-full">
                  <ChevronLeft size={24} className="rotate-180" />
                </button>
                <div className="relative cursor-pointer" onClick={() => {
                  let clicks = parseInt(sessionStorage.getItem("admin_clicks") || "0") + 1;
                  sessionStorage.setItem("admin_clicks", clicks.toString());
                  if (clicks >= 5) {
                    setIsAdminUnlocked(true);
                    alert("🔐 Admin Node Access Enabled");
                  }
                }}>
                  <img 
                    src={NOA_AVATAR} 
                    alt="Noa" 
                    className="w-10 h-10 rounded-full border border-white/40 object-cover"
                  />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#25D366] border border-[#075E54] rounded-full"></div>
                </div>
              </div>
              <div onClick={() => setView("contacts")} className="cursor-pointer">
                <h1 className="text-[16px] font-bold leading-tight">נועה - ח.סבן</h1>
                <p className="text-[12px] text-white/80">מחוברת</p>
              </div>
            </div>

            <div className="flex items-center gap-5 opacity-90">
              {isAdminUnlocked && (
                <button onClick={() => setView("admin")} className="hover:scale-110 transition-transform">
                  <Shield size={20} className="text-yellow-400" />
                </button>
              )}
              <Video size={20} className="cursor-pointer" />
              <Phone size={18} className="cursor-pointer" />
              <Search size={18} className="cursor-pointer" />
              <div className="relative group">
                <MoreVertical size={20} className="cursor-pointer" />
                <div className="absolute left-0 top-full mt-2 w-40 bg-white text-black shadow-xl rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-30 overflow-hidden text-sm">
                  <button 
                    onClick={clearChat}
                    className="w-full flex items-center gap-2 p-3 hover:bg-gray-100 text-red-600"
                  >
                    <Trash2 size={16} />
                    נקה שיחה
                  </button>
                  <button 
                    onClick={() => setView("contacts")}
                    className="w-full flex items-center gap-2 p-3 hover:bg-gray-100 border-t border-gray-100"
                  >
                    אנשי קשר
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Chat Area */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scroll-smooth relative custom-scrollbar">
            {/* Date bubble */}
            <div className="flex justify-center mb-6">
               <span className="bg-[#DDF4FF] text-[#558199] text-[11px] px-3 py-1 rounded-lg shadow-sm font-medium">היום</span>
            </div>

            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div 
                    className={`max-w-[85%] p-2 px-3 shadow-sm relative mb-2
                      ${msg.sender === "noa" 
                        ? "bg-[#DCF8C6] rounded-lg rounded-tl-none bubble-tail-left" 
                        : "bg-white rounded-lg rounded-tr-none bubble-tail-right"}`}
                    onClick={() => setActiveReactionPicker(activeReactionPicker === msg.id ? null : msg.id)}
                  >
                    <div className="markdown-body text-[14.2px] text-[#111111] leading-relaxed overflow-hidden">
                      {msg.fileMetadata && (
                        <div className="mb-1">
                          {msg.fileMetadata.type.startsWith("image/") ? (
                            <div className="relative group">
                              <img 
                                src={msg.fileMetadata.previewUrl || "https://via.placeholder.com/400x200?text=" + msg.fileMetadata.name}
                                alt={msg.fileMetadata.name}
                                className="w-full max-w-sm rounded-lg shadow-sm border border-black/5 hover:brightness-95 transition-all cursor-zoom-in"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 p-3 bg-black/5 rounded-xl border border-black/5 shadow-inner mb-2">
                               <div className="p-2 bg-red-50 text-red-500 rounded-lg">
                                  <Paperclip size={20} />
                               </div>
                               <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold truncate">{msg.fileMetadata.name}</p>
                                  <p className="text-[10px] text-gray-500">{(msg.fileMetadata.size / 1024).toFixed(1)} KB • Document</p>
                               </div>
                            </div>
                          )}
                        </div>
                      )}
                      <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                    
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span 
                        className="text-[10px] text-gray-400 capitalize cursor-help"
                        title={msg.timestamp ? format(msg.timestamp.toDate(), "dd/MM/yyyy HH:mm:ss") : ""}
                      >
                        {msg.timestamp ? format(msg.timestamp.toDate(), "HH:mm") : ""}
                      </span>
                      {msg.sender === "user" && (
                        <span className="text-gray-400">
                          {msg.status === "seen" ? (
                            <CheckCheck size={14} className="text-blue-500" />
                          ) : msg.status === "delivered" ? (
                            <CheckCheck size={14} />
                          ) : (
                            <Check size={14} />
                          )}
                        </span>
                      )}
                    </div>

                    {/* Reaction Display */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="absolute -bottom-3 right-2 flex items-center bg-white border border-gray-100 rounded-full px-1.5 py-0.5 shadow-sm space-x-0.5 z-10">
                        {msg.reactions.map((emoji, idx) => (
                          <span key={idx} className="text-[12px]">{emoji}</span>
                        ))}
                      </div>
                    )}

                    {/* Reaction Picker Overlay */}
                    <AnimatePresence>
                      {activeReactionPicker === msg.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: 10 }}
                          className="absolute -top-12 right-0 bg-white border border-gray-200 rounded-full p-1.5 shadow-xl z-50 flex gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className={`hover:scale-125 transition-transform p-1 rounded-full ${msg.reactions?.includes(emoji) ? "bg-gray-100" : ""}`}
                            >
                              {emoji}
                            </button>
                          ))}
                          <div className="w-px h-6 bg-gray-200 mx-1"></div>
                          <button
                            onClick={() => setDeletingMessageId(msg.id)}
                            className="text-red-500 hover:bg-red-50 p-1 rounded-full px-2"
                          >
                            <Trash2 size={16} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-[#DCF8C6] rounded-lg rounded-tl-none p-2 px-3 shadow-sm bubble-tail-left">
                    <div className="flex gap-1.5 items-center h-5">
                      <div className="w-1 bg-[#00a884] rounded-full h-1 animate-bounce"></div>
                      <div className="w-1 bg-[#00a884] rounded-full h-1 animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1 bg-[#00a884] rounded-full h-1 animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                </div>
              </motion.div>
            )}
            <div ref={scrollRef} />
          </main>

          {/* Input Bar */}
          <footer className="h-20 bg-[#F0F2F5] flex items-center px-4 gap-3 border-t border-gray-200 z-10">
            <button className="text-gray-500 hover:text-gray-700">
              <Smile size={24} />
            </button>
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,application/pdf,.doc,.docx,.txt"
            />
            <button 
              onClick={handleFileClick}
              className="text-gray-500 hover:text-gray-700 rotate-45"
            >
              <Paperclip size={24} />
            </button>
            
            <div className="flex-1 bg-white rounded-full flex items-center px-4 py-2 border border-white shadow-sm">
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="הקלד הודעה..."
                className="w-full bg-transparent outline-none text-[15px] text-gray-700 placeholder:text-gray-400"
              />
            </div>

            <button 
              onClick={() => handleSendMessage()}
              className="w-12 h-12 bg-[#128C7E] rounded-full flex items-center justify-center text-white shadow-md active:scale-95 transition-all"
            >
              <Send size={20} className="transform rotate-180" />
            </button>
          </footer>
        </>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {deletingMessageId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingMessageId(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full space-y-4"
            >
              <h3 className="text-lg font-bold text-[#075E54]">מחיקת הודעה</h3>
              <p className="text-gray-600">האם אתה בטוח שברצונך למחוק את ההודעה הזו? פעולה זו אינה ניתנת לביטול.</p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleDeleteMessage(deletingMessageId)}
                  className="flex-1 bg-red-600 text-white rounded-xl py-3 font-bold hover:bg-red-700 transition-colors"
                >
                  מחק הודעה
                </button>
                <button
                  onClick={() => setDeletingMessageId(null)}
                  className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 font-bold hover:bg-gray-200 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CSS for custom scrollbar and markdown */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        
        .markdown-body table { 
          width: 100%; 
          border-collapse: separate; 
          border-spacing: 0;
          margin: 12px 0; 
          border-radius: 8px; 
          overflow: hidden; 
          font-size: 13px; 
          border: 1px solid rgba(0,0,0,0.1);
          background: rgba(255, 255, 255, 0.3);
        }
        .markdown-body th, .markdown-body td { 
          border-bottom: 1px solid rgba(0,0,0,0.05); 
          border-left: 1px solid rgba(0,0,0,0.05); 
          padding: 10px; 
          text-align: right; 
        }
        .markdown-body th:last-child, .markdown-body td:last-child {
          border-left: none;
        }
        .markdown-body tr:last-child td {
          border-bottom: none;
        }
        .markdown-body th { 
          background: rgba(18, 140, 126, 0.1); 
          color: #075E54;
          font-weight: 700; 
        }
        .markdown-body tr:nth-child(even) {
          background: rgba(255, 255, 255, 0.2);
        }
        .markdown-body b, .markdown-body strong { 
          color: #075E54; 
          font-weight: 800; 
        }
        
        /* Frosted Glass internal cards as requested */
        .card { 
          background: rgba(255, 255, 255, 0.7); 
          backdrop-filter: blur(8px);
          border: 1px solid rgba(18, 140, 126, 0.2); 
          border-radius: 16px; 
          padding: 16px; 
          margin: 12px 0; 
          box-shadow: 0 4px 15px rgba(0,0,0,0.05); 
        }
        
        .timeline-item {
          display: flex;
          gap: 12px;
          border-right: 2px solid #128C7E;
          padding-right: 16px;
          margin-bottom: 8px;
          position: relative;
        }
        .bubble-tail-right::before {
          content: "";
          position: absolute;
          top: 0;
          right: -8px;
          width: 0;
          height: 0;
          border-left: 10px solid white;
          border-bottom: 10px solid transparent;
        }
        .bubble-tail-left::before {
          content: "";
          position: absolute;
          top: 0;
          left: -8px;
          width: 0;
          height: 0;
          border-right: 10px solid #DCF8C6;
          border-bottom: 10px solid transparent;
        }
      `}</style>
    </div>
  );
}
