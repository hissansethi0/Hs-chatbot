import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  rtdb, 
  auth, 
  logAnalyticsEvent,
  getFriendlyAuthErrorMessage
} from '../lib/firebase';
import { ref, set, push, update, remove, onValue, get } from 'firebase/database';
import { updateProfile, updatePassword, signOut } from 'firebase/auth';
import { uploadToCloudinary } from '../lib/cloudinary';
import { 
  Plus, MessageSquare, Search, Pin, Trash2, Edit2, 
  ChevronLeft, ChevronRight, ChevronDown, Send, Paperclip, Mic, MicOff,
  Volume2, VolumeX, Copy, RefreshCw, Square, LogOut, Settings,
  ShieldAlert, User, Check, Sparkles, Download, ArrowUpRight,
  Brain, FileText, Image, Loader2, Megaphone, X, KeyRound, AlertTriangle, Zap, Flame
} from 'lucide-react';
import { ChatSession, ChatMessage, UserProfile, AIModel, AppSettings } from '../types';
import SettingsModal from './SettingsModal';
import AdminDashboard from './AdminDashboard';

// Elegant copyable code blocks with language headers and dedicated buttons
const PreWithCopy = ({ children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  
  const extractText = (child: any): string => {
    if (!child) return '';
    if (typeof child === 'string') return child;
    if (Array.isArray(child)) return child.map(extractText).join('');
    if (child.props && child.props.children) return extractText(child.props.children);
    return '';
  };
  
  const codeString = extractText(children);
  
  let lang = 'Code';
  try {
    const codeChild = React.Children.toArray(children)[0] as any;
    if (codeChild && codeChild.props && codeChild.props.className) {
      const match = codeChild.props.className.match(/language-(\w+)/);
      if (match) {
        lang = match[1].toUpperCase();
      }
    }
  } catch (err) {}

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="relative border border-white/10 rounded-xl overflow-hidden my-4 bg-neutral-950 shadow-md">
      {/* Code Header Bar */}
      <div className="flex justify-between items-center px-4 py-2 bg-neutral-900 border-b border-white/5 text-3xs font-semibold text-neutral-400 uppercase tracking-wider">
        <span className="flex items-center gap-1.5">
          <span>👨‍💻</span>
          <span>{lang}</span>
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>
      <pre {...props} style={{ margin: 0 }} className="p-4 overflow-x-auto text-xs font-mono text-neutral-200">{children}</pre>
    </div>
  );
};

// Custom premium SVG logo for the HS brand, featuring interlocking HS and soundwave heartbeat
const HSLogo = ({ className = "w-10 h-10", animate = true }: { className?: string; animate?: boolean }) => (
  <svg className={`${className} ${animate ? "hover:scale-105 transition-transform duration-300" : ""}`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="hs-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="50%" stopColor="#06B6D4" />
        <stop offset="100%" stopColor="#10B981" />
      </linearGradient>
    </defs>
    {/* Concentric Circle Rings */}
    <circle cx="50" cy="50" r="42" stroke="url(#hs-logo-grad)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="185 45" />
    <circle cx="50" cy="50" r="34" stroke="url(#hs-logo-grad)" strokeWidth="1.5" strokeOpacity="0.3" strokeDasharray="5 5" />
    {/* Stylized Interlocking "H" and "S" */}
    <path d="M28 32 V68 M28 50 H46 M46 32 V50 Q46 58 38 58 H34 Q26 58 26 66 V66 Q26 74 34 74 H44" stroke="url(#hs-logo-grad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Soundwave pulse on the right */}
    <path d="M46 50 H56 L59 34 L62 66 L65 42 L68 54 L71 47 L75 51 L79 50 H88" stroke="url(#hs-logo-grad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface ChatInterfaceProps {
  user: any;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onLogout: () => void;
}

export default function ChatInterface({ user, settings, onUpdateSettings, onLogout }: ChatInterfaceProps) {
  // Sidebar state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');

  // Messages & Stream States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeModel, setActiveModel] = useState<AIModel>('gemini-3.5-flash');
  const [streamedText, setStreamedText] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  
  // Abort controller for stopping generation
  const abortControllerRef = useRef<AbortController | null>(null);

  // File Upload states
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileType, setUploadedFileType] = useState<string | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);

  // Speech & Voice states
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const speechRecognitionRef = useRef<any>(null);

  // User profile modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState(user.displayName || '');
  const [newPass, setNewPass] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.photoURL || '');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

  // Alerts, maintenance & Announcements
  const [systemMaintenance, setSystemMaintenance] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState<any>(null);
  const [dismissedAnnounce, setDismissedAnnounce] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Layout toggles
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Refs for scrolling and input auto-resize
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Dynamic Tailwind colors based on themeColor
  const getThemeColorClass = () => {
    switch (settings.themeColor) {
      case 'purple': return 'from-purple-500 to-indigo-500 bg-purple-500 hover:bg-purple-600 focus:border-purple-500';
      case 'emerald': return 'from-emerald-500 to-teal-500 bg-emerald-500 hover:bg-emerald-600 focus:border-emerald-500';
      case 'rose': return 'from-rose-500 to-pink-500 bg-rose-500 hover:bg-rose-600 focus:border-rose-500';
      case 'slate': return 'from-slate-600 to-slate-800 bg-slate-600 hover:bg-slate-700 focus:border-slate-600';
      default: return 'from-blue-500 to-sky-500 bg-blue-500 hover:bg-blue-600 focus:border-blue-500'; // blue
    }
  };

  const getThemeTextClass = () => {
    switch (settings.themeColor) {
      case 'purple': return 'text-purple-400';
      case 'emerald': return 'text-emerald-400';
      case 'rose': return 'text-rose-400';
      default: return 'text-blue-400';
    }
  };

  const triggerAlert = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  // Real-time synchronization of chat history, announcements, profile and maintenance
  useEffect(() => {
    if (!user) return;

    // Check if admin
    const userProfileRef = ref(rtdb, `users/${user.uid}`);
    onValue(userProfileRef, (snapshot) => {
      if (snapshot.exists()) {
        const profile = snapshot.val() as UserProfile;
        const isMasterEmail = user.email === "hissansethi0@gmail.com" || user.email === "ffplayerno0001@gmail.com";
        if (isMasterEmail && !profile.isAdmin) {
          update(userProfileRef, { isAdmin: true });
        }
        setIsAdmin(!!profile.isAdmin || isMasterEmail);
        setIsBanned(!!profile.isBanned);
        if (profile.isBanned) {
          triggerAlert('error', "Your user profile is currently restricted.");
          signOut(auth);
          onLogout();
        }
      } else {
        const isMasterEmail = user.email === "hissansethi0@gmail.com" || user.email === "ffplayerno0001@gmail.com";
        if (isMasterEmail) {
          setIsAdmin(true);
        }
      }
    });

    // Sync conversations list
    const convRef = ref(rtdb, `conversations/${user.uid}`);
    const unsubscribeSessions = onValue(convRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.values(data) as ChatSession[];
        setSessions(list.sort((a, b) => b.updatedAt - a.updatedAt));
      } else {
        setSessions([]);
      }
    });

    // Sync announcements
    const announceRef = ref(rtdb, 'announcements');
    onValue(announceRef, (snapshot) => {
      if (snapshot.exists()) {
        const list = Object.values(snapshot.val()) as any[];
        const latest = list.sort((a, b) => b.createdAt - a.createdAt).find(a => a.active);
        if (latest) {
          setActiveAnnouncement(latest);
        }
      } else {
        setActiveAnnouncement(null);
      }
    });

    // Sync maintenance mode
    const maintenanceRef = ref(rtdb, 'settings/maintenanceMode');
    onValue(maintenanceRef, (snap) => {
      if (snap.exists()) {
        setSystemMaintenance(snap.val());
      }
    });

    return () => {
      unsubscribeSessions();
    };
  }, [user]);

  // Sync messages of the active chat session
  useEffect(() => {
    if (!activeSession) {
      setMessages([]);
      return;
    }

    const msgRef = ref(rtdb, `messages/${activeSession.id}`);
    const unsubscribeMessages = onValue(msgRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.values(data) as ChatMessage[];
        setMessages(list.sort((a, b) => a.timestamp - b.timestamp));
      } else {
        setMessages([]);
      }
    });

    // Update active model
    setActiveModel(activeSession.model || 'gemini-3.5-flash');

    return () => {
      unsubscribeMessages();
    };
  }, [activeSession]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamedText]);

  // Auto-resize input textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + N to open a new chat
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        handleCreateNewChat();
      }
      // Ctrl + B to collapse sidebar
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(!sidebarCollapsed);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessions, sidebarCollapsed]);

  // Voice Inputs (Speech-to-Text) initialization
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setInputText(prev => prev + (prev ? " " : "") + transcript);
      };

      speechRecognitionRef.current = rec;
    }
  }, []);

  const handleToggleVoiceInput = () => {
    if (!speechRecognitionRef.current) {
      triggerAlert('error', "Speech recognition is not supported in this browser.");
      return;
    }
    if (isListening) {
      speechRecognitionRef.current.stop();
    } else {
      speechRecognitionRef.current.start();
    }
  };

  // Chat Actions
  const handleCreateNewChat = async () => {
    if (!user) return;
    try {
      const newChatRef = push(ref(rtdb, `conversations/${user.uid}`));
      const id = newChatRef.key || Date.now().toString();
      const newChat: ChatSession = {
        id,
        title: `Chat Session ${sessions.length + 1}`,
        userId: user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPinned: false,
        model: activeModel
      };
      await set(newChatRef, newChat);
      setActiveSession(newChat);
      logAnalyticsEvent('totalChats', 1);
    } catch (e: any) {
      triggerAlert('error', e.message);
    }
  };

  const handleTogglePinChat = async (sess: ChatSession) => {
    try {
      await update(ref(rtdb, `conversations/${user.uid}/${sess.id}`), {
        isPinned: !sess.isPinned
      });
    } catch (e: any) {
      triggerAlert('error', e.message);
    }
  };

  const handleStartRenameChat = (sess: ChatSession) => {
    setEditingSessionId(sess.id);
    setEditTitleText(sess.title);
  };

  const handleSaveRenameChat = async (id: string) => {
    if (!editTitleText.trim()) return;
    try {
      await update(ref(rtdb, `conversations/${user.uid}/${id}`), {
        title: editTitleText.trim()
      });
      setEditingSessionId(null);
    } catch (e: any) {
      triggerAlert('error', e.message);
    }
  };

  const handleDeleteChat = async (id: string) => {
    try {
      await remove(ref(rtdb, `conversations/${user.uid}/${id}`));
      await remove(ref(rtdb, `messages/${id}`));
      if (activeSession?.id === id) {
        setActiveSession(null);
      }
      triggerAlert('success', 'Conversation deleted successfully');
    } catch (e: any) {
      triggerAlert('error', e.message);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!activeSession) return;
    try {
      await remove(ref(rtdb, `messages/${activeSession.id}/${msgId}`));
      triggerAlert('success', 'Message deleted successfully');
    } catch (e: any) {
      triggerAlert('error', e.message);
    }
  };

  // Text-To-Speech function
  const handleSpeakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      triggerAlert('error', "Text-to-speech is not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    if (!isMuted) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.onstart = () => setIsMuted(false);
      utterance.onend = () => setIsMuted(true);
      window.speechSynthesis.speak(utterance);
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
  };

  // Copy Message helper
  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerAlert('success', "Copied response to clipboard.");
  };

  // File Upload Handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadedFileName(file.name);
    setUploadedFileType(file.type);

    try {
      // Read locally as Base64 for Gemini vision context and image previews
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileBase64(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      // 2. Upload durably to Cloudinary
      const cloudRes = await uploadToCloudinary(file);
      setUploadedFileUrl(cloudRes.secure_url);
      triggerAlert('success', "File uploaded successfully to cloud repository.");
    } catch (e: any) {
      console.error(e);
      triggerAlert('error', e.message || "Failed to process attachments.");
      setUploadedFileName(null);
      setUploadedFileType(null);
    } finally {
      setUploadingFile(false);
    }
  };


  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleClearAttachedFile = () => {
    setUploadedFileUrl(null);
    setUploadedFileName(null);
    setUploadedFileType(null);
    setFileBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Generate Answer via Express Full-stack endpoint
  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    
    const messageContent = customPrompt || inputText;
    if (!messageContent.trim() && !uploadedFileUrl) return;

    if (systemMaintenance && !isAdmin) {
      triggerAlert('error', "System is under scheduled maintenance. Inputs are currently locked.");
      return;
    }

    let chatSessionId = activeSession?.id;
    if (!chatSessionId) {
      // Auto-create chat if none exists
      const newChatRef = push(ref(rtdb, `conversations/${user.uid}`));
      chatSessionId = newChatRef.key || Date.now().toString();
      const newChat: ChatSession = {
        id: chatSessionId,
        title: messageContent.substring(0, 30) || "Auto Chat",
        userId: user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPinned: false,
        model: activeModel
      };
      await set(newChatRef, newChat);
      setActiveSession(newChat);
      logAnalyticsEvent('totalChats', 1);
    }

    // 1. Store user message in Realtime Database
    const userMsgRef = push(ref(rtdb, `messages/${chatSessionId}`));
    const userMsgId = userMsgRef.key || Date.now().toString();
    const userMsg: ChatMessage = {
      id: userMsgId,
      chatId: chatSessionId,
      senderId: user.uid,
      role: 'user',
      content: messageContent,
      timestamp: Date.now(),
      fileUrl: uploadedFileUrl || null,
      fileName: uploadedFileName || null,
      fileType: uploadedFileType || null
    };
    await set(userMsgRef, userMsg);
    
    // Clear Input
    setInputText('');
    handleClearAttachedFile();
    setIsGenerating(true);
    setStreamedText('');

    // Update conversation timestamp
    await update(ref(rtdb, `conversations/${user.uid}/${chatSessionId}`), {
      updatedAt: Date.now(),
      model: activeModel
    });

    // 2. Fetch full chat history for Gemini multi-turn conversation
    const historySnap = await get(ref(rtdb, `messages/${chatSessionId}`));
    let backendHistory: any[] = [];
    if (historySnap.exists()) {
      backendHistory = Object.values(historySnap.val()).sort((a: any, b: any) => a.timestamp - b.timestamp);
    } else {
      backendHistory = [userMsg];
    }

    // Adapt to Backend Request format
    const payloadHistory = backendHistory.map((m: any) => {
      const item: any = {
        role: m.role,
        content: m.content,
        fileUrl: m.fileUrl || null,
        fileType: m.fileType || null
      };
      // If there is an image attachment and we have the base64, send it in vision payload
      if (m.fileUrl && fileBase64 && m.id === userMsgId) {
        item.file = {
          mimeType: m.fileType,
          data: fileBase64
        };
      }
      return item;
    });

    // Create AbortController for Stopping Response Generation
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let response: Response;
      let isDirectClient = false;
      const clientApiKey = settings.clientApiKey;
      const isNetlifyOrStatic = window.location.hostname.includes("netlify.app") || window.location.hostname.includes("github.io");

      if (clientApiKey) {
        try {
          const keyToUse = clientApiKey;
          let geminiModel = activeModel === "hs-deep-thinking" ? "gemini-2.5-pro" : "gemini-2.5-flash";
          
          const contents = payloadHistory.map(m => {
            const parts: any[] = [];
            if (m.content) parts.push({ text: m.content });
            if (m.file) {
              let base64Data = m.file.data;
              if (base64Data.includes(";base64,")) {
                base64Data = base64Data.split(";base64,")[1];
              }
              parts.push({
                inlineData: {
                  mimeType: m.file.mimeType,
                  data: base64Data
                }
              });
            }
            return {
              role: (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user',
              parts
            };
          });

          const sysInstruction = activeModel === "hs-deep-thinking" ? 
            "You are HS Deep Thinking, an elite research-oriented AI specialist. Outlying structural thinking before answering." :
            "You are HS Chatbot, an elite, SaaS-level AI assistant designed by Hissan Sethi (HS) with an exceptionally professional, clean, and direct tone.";

          response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse&key=${keyToUse}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            signal: controller.signal,
            body: JSON.stringify({
              contents,
              systemInstruction: {
                parts: [{ text: sysInstruction }]
              },
              generationConfig: {
                temperature: activeModel === "hs-deep-thinking" ? 0.3 : 0.7
              }
            })
          });

          if (response.ok) {
            isDirectClient = true;
          } else {
            throw new Error("Direct client API key fetch returned non-ok status.");
          }
        } catch (directErr: any) {
          // Fall back to server
          response = await fetch("/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            signal: controller.signal,
            body: JSON.stringify({
              messages: payloadHistory,
              model: activeModel,
              stream: true,
              clientOpenAiApiKey: settings.clientOpenAiApiKey
            })
          });
        }
      } else {
        if (isNetlifyOrStatic) {
          // For OpenAI models, if they have a clientOpenAiApiKey, we can proxy it through /api/chat even if in netlify
          if ((activeModel === 'gpt-4o-mini' || activeModel === 'gpt-4o') && settings.clientOpenAiApiKey) {
            // allow proxy
          } else {
            throw new Error("Static environment detected. Please configure your HS Chat API Key in Preferences first.");
          }
        }
        response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          signal: controller.signal,
          body: JSON.stringify({
            messages: payloadHistory,
            model: activeModel,
            stream: true,
            clientOpenAiApiKey: settings.clientOpenAiApiKey
          })
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to establish AI stream channel. Please check backend.");
      }

      if (!response.body) {
        throw new Error("Empty streaming channel.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponseText = "";
      let partialLine = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = (partialLine + chunk).split("\n");
        partialLine = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") {
              break;
            } else {
              let parsed: any = null;
              try {
                parsed = JSON.parse(dataStr);
              } catch (e) {
                // Ignore incomplete JSON stream blocks
              }

              if (parsed) {
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (isDirectClient) {
                  const textPart = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (textPart) {
                    fullResponseText += textPart;
                    setStreamedText(fullResponseText);
                  }
                } else {
                  if (parsed.text) {
                    fullResponseText += parsed.text;
                    setStreamedText(fullResponseText);
                  }
                }
              }
            }
          }
        }
      }

      // Save complete stream to Firebase RTDB
      if (fullResponseText) {
        const assistantMsgRef = push(ref(rtdb, `messages/${chatSessionId}`));
        const assistantMsgId = assistantMsgRef.key || Date.now().toString();
        const assistantMsg: ChatMessage = {
          id: assistantMsgId,
          chatId: chatSessionId,
          senderId: 'assistant',
          role: 'model',
          content: fullResponseText,
          timestamp: Date.now()
        };
        await set(assistantMsgRef, assistantMsg);
        await logAnalyticsEvent('totalMessages', 2);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Handle manual stop
        if (streamedText) {
          const assistantMsgRef = push(ref(rtdb, `messages/${chatSessionId}`));
          const assistantMsgId = assistantMsgRef.key || Date.now().toString();
          await set(assistantMsgRef, {
            id: assistantMsgId,
            chatId: chatSessionId,
            senderId: 'assistant',
            role: 'model',
            content: streamedText + " *[Generation halted]*",
            timestamp: Date.now()
          });
        }
      } else {
        triggerAlert('error', err.message || "Failed to load assistant response.");
        try {
          const assistantMsgRef = push(ref(rtdb, `messages/${chatSessionId}`));
          const assistantMsgId = assistantMsgRef.key || Date.now().toString();
          await set(assistantMsgRef, {
            id: assistantMsgId,
            chatId: chatSessionId,
            senderId: 'assistant',
            role: 'model',
            content: `⚠️ **API Error:** ${err.message || "Failed to load assistant response."}`,
            timestamp: Date.now()
          });
        } catch (dbErr) {
          console.error("Failed to write error to RTDB:", dbErr);
        }
      }
    } finally {
      setIsGenerating(false);
      setStreamedText('');
      abortControllerRef.current = null;
    }
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async (index: number) => {
    if (messages.length === 0 || isGenerating) return;
    const lastUserIndex = messages.slice(0, index + 1).reverse().findIndex(m => m.role === 'user');
    if (lastUserIndex === -1) return;
    const actualIndex = index - lastUserIndex;
    const lastUserMsg = messages[actualIndex];
    
    // Clear and regenerate
    handleSendMessage(undefined, lastUserMsg.content);
  };

  // Conversation Export Handler
  const handleExportChat = (format: 'txt' | 'md' | 'json') => {
    if (messages.length === 0) {
      triggerAlert('error', "No data to export.");
      return;
    }

    let fileContent = "";
    let mimeType = "text/plain";
    let fileName = `${activeSession?.title || 'conversation'}.${format}`;

    if (format === 'json') {
      fileContent = JSON.stringify(messages, null, 2);
      mimeType = "application/json";
    } else {
      fileContent = messages.map(m => {
        const sender = m.role === 'user' ? 'USER' : 'ASSISTANT';
        const date = new Date(m.timestamp).toLocaleString();
        return `[${date}] ${sender}:\n${m.content}\n\n`;
      }).join('---\n\n');
      if (format === 'md') mimeType = "text/markdown";
    }

    const blob = new Blob([fileContent], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    triggerAlert('success', "Conversation exported successfully.");
  };

  // User Profile actions
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    try {
      await updateProfile(auth.currentUser!, {
        displayName: profileName,
        photoURL: avatarUrl
      });
      // Save details to users/ collection too
      await update(ref(rtdb, `users/${user.uid}`), {
        fullName: profileName,
        photoURL: avatarUrl
      });
      triggerAlert('success', "User profile details updated.");
      setShowProfileModal(false);
    } catch (e: any) {
      triggerAlert('error', e.message);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPass.trim()) return;

    try {
      await updatePassword(auth.currentUser!, newPass);
      triggerAlert('success', "Credentials updated successfully.");
      setNewPass('');
    } catch (e: any) {
      triggerAlert('error', getFriendlyAuthErrorMessage(e));
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    try {
      const res = await uploadToCloudinary(file);
      setAvatarUrl(res.secure_url);
      triggerAlert('success', "Profile photo compiled.");
    } catch (err: any) {
      triggerAlert('error', err.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  // Filtering chat Sessions for searching
  const filteredSessions = sessions.filter(s => 
    s.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="chat-workspace" className={`min-h-screen flex relative transition-colors ${settings.theme === 'dark' ? 'bg-black text-white' : 'bg-neutral-50 text-neutral-900'}`}>
      {/* Dynamic Overlay Alerts */}
      <AnimatePresence mode="wait">
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full bg-neutral-950/95 border border-emerald-500/20 text-emerald-400 text-xs font-semibold shadow-2xl flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full bg-neutral-950/95 border border-red-500/20 text-red-400 text-xs font-semibold shadow-2xl flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR NAVIGATION PANEL */}
      {!sidebarCollapsed && (
        <div 
          onClick={() => setSidebarCollapsed(true)}
          className="fixed inset-0 bg-black/70 z-30 lg:hidden"
        />
      )}
      <aside 
        className={`fixed lg:relative shrink-0 h-screen transition-all duration-300 border-r z-40 flex flex-col ${sidebarCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-0 overflow-hidden opacity-0 border-transparent' : `translate-x-0 w-72 ${settings.theme === 'dark' ? 'border-white/10 bg-[#0D0D0D] text-white' : 'border-neutral-200 bg-neutral-100 text-neutral-800'}`}`}
      >
        {/* Brand Header */}
        <div className={`p-4 flex items-center justify-between border-b ${settings.theme === 'dark' ? 'border-white/10 bg-[#0D0D0D]' : 'border-neutral-200 bg-neutral-100'}`}>
          <div className="flex items-center gap-2.5">
            <HSLogo className="w-8 h-8 shrink-0" />
            <span className={`font-semibold text-sm tracking-wider uppercase ${settings.theme === 'dark' ? 'text-neutral-200' : 'text-neutral-700'}`}>HS Chatbot</span>
          </div>
          <button 
            onClick={() => handleCreateNewChat()}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${settings.theme === 'dark' ? 'border-white/10 text-neutral-300 hover:text-white hover:bg-white/5' : 'border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'}`}
            title="Create New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search Engine */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chat history..."
              className={`w-full border rounded-xl py-2 pl-9 pr-3 text-xs outline-none transition-colors ${settings.theme === 'dark' ? 'bg-[#161616] border-white/10 text-white focus:border-blue-500/50 placeholder-neutral-500' : 'bg-white border-neutral-200 text-neutral-900 focus:border-blue-600/50 placeholder-neutral-400'}`}
            />
          </div>
        </div>

        {/* Sessions scroll feed */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {/* Pinned Sections first */}
          {filteredSessions.some(s => s.isPinned) && (
            <div className="py-2">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider px-2">Pinned Chats</span>
              <div className="space-y-1 mt-1">
                {filteredSessions.filter(s => s.isPinned).map((sess) => (
                  <div 
                    key={sess.id}
                    className={`group rounded-xl p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors relative ${activeSession?.id === sess.id ? (settings.theme === 'dark' ? 'bg-white/5 border border-white/10 text-white' : 'bg-neutral-200/80 border border-neutral-300/50 text-neutral-900') : (settings.theme === 'dark' ? 'hover:bg-white/5 text-neutral-300' : 'hover:bg-neutral-200/50 text-neutral-600')}`}
                    onClick={() => setActiveSession(sess)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <MessageSquare className="w-4 h-4 shrink-0 text-blue-400" />
                      {editingSessionId === sess.id ? (
                        <input
                          type="text"
                          value={editTitleText}
                          onChange={(e) => setEditTitleText(e.target.value)}
                          onBlur={() => handleSaveRenameChat(sess.id)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveRenameChat(sess.id)}
                          autoFocus
                          className={`bg-transparent text-xs outline-none border-b border-blue-500 w-full ${settings.theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className={`text-xs truncate font-medium ${settings.theme === 'dark' ? 'text-white' : 'text-neutral-800'}`}>{sess.title}</span>
                      )}
                    </div>
                    {/* Action buttons on hover / responsive on mobile */}
                    <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 flex gap-1 shrink-0 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleTogglePinChat(sess); }}
                        className={`p-1 rounded transition-colors ${settings.theme === 'dark' ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900'}`}
                      >
                        <Pin className="w-3 h-3 rotate-45 text-blue-400" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleStartRenameChat(sess); }}
                        className={`p-1 rounded transition-colors ${settings.theme === 'dark' ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900'}`}
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteChat(sess.id); }}
                        className={`p-1 rounded transition-colors ${settings.theme === 'dark' ? 'hover:bg-white/10 text-neutral-400 hover:text-red-400' : 'hover:bg-neutral-200 text-neutral-500 hover:text-red-500'}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Standard sessions list */}
          <div className="py-2">
            {filteredSessions.some(s => s.isPinned) && <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider px-2">Recent Chats</span>}
            <div className="space-y-1 mt-1">
              {filteredSessions.filter(s => !s.isPinned).map((sess) => (
                <div 
                  key={sess.id}
                  className={`group rounded-xl p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-all relative ${activeSession?.id === sess.id ? (settings.theme === 'dark' ? 'bg-white/5 border border-white/10 text-white' : 'bg-neutral-200/80 border border-neutral-300/50 text-neutral-900') : (settings.theme === 'dark' ? 'hover:bg-white/5 text-neutral-300' : 'hover:bg-neutral-200/50 text-neutral-600')}`}
                  onClick={() => setActiveSession(sess)}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <MessageSquare className={`w-4 h-4 shrink-0 ${activeSession?.id === sess.id ? 'text-blue-500' : 'text-neutral-400'}`} />
                    {editingSessionId === sess.id ? (
                      <input
                        type="text"
                        value={editTitleText}
                        onChange={(e) => setEditTitleText(e.target.value)}
                        onBlur={() => handleSaveRenameChat(sess.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveRenameChat(sess.id)}
                        autoFocus
                        className={`bg-transparent text-xs outline-none border-b border-blue-500 w-full ${settings.theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className={`text-xs truncate font-medium ${settings.theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'}`}>{sess.title}</span>
                    )}
                  </div>
                  {/* Hover Actions / responsive on mobile */}
                  <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 flex gap-1 shrink-0 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleTogglePinChat(sess); }}
                      className={`p-1 rounded transition-colors ${settings.theme === 'dark' ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900'}`}
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleStartRenameChat(sess); }}
                      className={`p-1 rounded transition-colors ${settings.theme === 'dark' ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900'}`}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteChat(sess.id); }}
                      className={`p-1 rounded transition-colors ${settings.theme === 'dark' ? 'hover:bg-white/10 text-neutral-400 hover:text-red-400' : 'hover:bg-neutral-200 text-neutral-500 hover:text-red-500'}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="text-xs text-neutral-500 text-center py-6">No chat sessions found. Make a new one!</p>
              )}
            </div>
          </div>
        </div>

        {/* Export / Sidebar bottom profile footer */}
        <div className={`p-3 border-t space-y-2 ${settings.theme === 'dark' ? 'bg-[#0D0D0D] border-white/10' : 'bg-neutral-100 border-neutral-200'}`}>
          {activeSession && (
            <div className="grid grid-cols-3 gap-1 mb-2">
              <button 
                onClick={() => handleExportChat('txt')}
                className={`py-1 px-1.5 text-3xs font-semibold border rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 ${settings.theme === 'dark' ? 'bg-[#161616] border-white/10 hover:bg-white/5 text-neutral-300' : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-600'}`}
                title="Export Plaintext"
              >
                <Download className="w-2.5 h-2.5" /> TXT
              </button>
              <button 
                onClick={() => handleExportChat('md')}
                className={`py-1 px-1.5 text-3xs font-semibold border rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 ${settings.theme === 'dark' ? 'bg-[#161616] border-white/10 hover:bg-white/5 text-neutral-300' : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-600'}`}
                title="Export Markdown"
              >
                <Download className="w-2.5 h-2.5" /> MD
              </button>
              <button 
                onClick={() => handleExportChat('json')}
                className={`py-1 px-1.5 text-3xs font-semibold border rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 ${settings.theme === 'dark' ? 'bg-[#161616] border-white/10 hover:bg-white/5 text-neutral-300' : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-600'}`}
                title="Export JSON"
              >
                <Download className="w-2.5 h-2.5" /> JSON
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div 
              onClick={() => setShowProfileModal(true)}
              className={`w-9 h-9 rounded-full overflow-hidden border cursor-pointer hover:border-blue-500 transition-colors shrink-0 ${settings.theme === 'dark' ? 'bg-[#161616] border-white/10' : 'bg-white border-neutral-200'}`}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-500 font-bold text-xs text-white">
                  {user.displayName?.substring(0, 2).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className={`text-xs font-semibold truncate ${settings.theme === 'dark' ? 'text-white' : 'text-neutral-800'}`}>{user.displayName || 'Profile Name'}</h4>
              <p className="text-3xs text-neutral-400 truncate">{user.email}</p>
            </div>
            <button 
              onClick={onLogout}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${settings.theme === 'dark' ? 'hover:bg-white/5 text-neutral-500 hover:text-red-400' : 'hover:bg-neutral-200 text-neutral-500 hover:text-red-600'}`}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* WORKSPACE CONTENT BODY */}
      <main className="flex-1 h-screen flex flex-col min-w-0 relative z-10">
        
        {/* TOP STATUS HEADER BAR */}
        <header className={`px-6 py-4 border-b flex justify-between items-center z-20 transition-colors ${settings.theme === 'dark' ? 'border-white/10 bg-[#0D0D0D]' : 'border-neutral-200 bg-white'}`}>
          <div className="flex items-center gap-3">
            {sidebarCollapsed && (
              <button 
                onClick={() => setSidebarCollapsed(false)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${settings.theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-neutral-100'}`}
              >
                <ChevronRight className={`w-5 h-5 ${settings.theme === 'dark' ? 'text-neutral-300' : 'text-neutral-600'}`} />
              </button>
            )}
            {!sidebarCollapsed && (
              <button 
                onClick={() => setSidebarCollapsed(true)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${settings.theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-neutral-100'}`}
              >
                <ChevronLeft className={`w-5 h-5 ${settings.theme === 'dark' ? 'text-neutral-300' : 'text-neutral-600'}`} />
              </button>
            )}

            {/* Premium Brand Logo */}
            <HSLogo className="w-7 h-7 shrink-0 hidden sm:block" />

            {/* Model Selection Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold transition-colors cursor-pointer select-none ${settings.theme === 'dark' ? 'bg-[#161616] border-white/10 text-neutral-200 hover:bg-neutral-800' : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'}`}
              >
                {activeModel === 'gemini-3.5-flash' && (
                  <>
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                    <span>HS Chat</span>
                  </>
                )}
                {activeModel === 'gemini-3.1-pro-preview' && (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>HS Chat Pro</span>
                  </>
                )}
                {activeModel === 'hs-deep-thinking' && (
                  <>
                    <Brain className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Deep Thinking</span>
                  </>
                )}
                {activeModel === 'gpt-4o-mini' && (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>GPT-4o Mini</span>
                  </>
                )}
                {activeModel === 'gpt-4o' && (
                  <>
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>GPT-4o</span>
                  </>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-neutral-500 ml-1 shrink-0" />
              </button>

              <AnimatePresence>
                {isModelDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsModelDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`absolute left-0 mt-2 w-52 border rounded-xl shadow-2xl p-1.5 z-40 space-y-0.5 ${settings.theme === 'dark' ? 'bg-[#0D0D0D] border-white/10 text-white' : 'bg-white border-neutral-200 text-neutral-800'}`}
                    >
                      <button
                        onClick={() => {
                          setActiveModel('gemini-3.5-flash');
                          if (activeSession) {
                            update(ref(rtdb, `conversations/${user.uid}/${activeSession.id}`), {
                              model: 'gemini-3.5-flash'
                            });
                          }
                          setIsModelDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${activeModel === 'gemini-3.5-flash' ? 'bg-blue-500/10 text-blue-400' : (settings.theme === 'dark' ? 'text-neutral-300 hover:bg-white/5' : 'text-neutral-600 hover:bg-neutral-50')}`}
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                          <span>HS Chat</span>
                        </div>
                        {activeModel === 'gemini-3.5-flash' && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => {
                          setActiveModel('gemini-3.1-pro-preview');
                          if (activeSession) {
                            update(ref(rtdb, `conversations/${user.uid}/${activeSession.id}`), {
                              model: 'gemini-3.1-pro-preview'
                            });
                          }
                          setIsModelDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${activeModel === 'gemini-3.1-pro-preview' ? 'bg-purple-500/10 text-purple-400' : (settings.theme === 'dark' ? 'text-neutral-300 hover:bg-white/5' : 'text-neutral-600 hover:bg-neutral-50')}`}
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                          <span>HS Chat Pro</span>
                        </div>
                        {activeModel === 'gemini-3.1-pro-preview' && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => {
                          setActiveModel('hs-deep-thinking');
                          if (activeSession) {
                            update(ref(rtdb, `conversations/${user.uid}/${activeSession.id}`), {
                              model: 'hs-deep-thinking'
                            });
                          }
                          setIsModelDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${activeModel === 'hs-deep-thinking' ? 'bg-emerald-500/10 text-emerald-400' : (settings.theme === 'dark' ? 'text-neutral-300 hover:bg-white/5' : 'text-neutral-600 hover:bg-neutral-50')}`}
                      >
                        <div className="flex items-center gap-2">
                          <Brain className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Deep Thinking</span>
                        </div>
                        {activeModel === 'hs-deep-thinking' && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => {
                          setActiveModel('gpt-4o-mini');
                          if (activeSession) {
                            update(ref(rtdb, `conversations/${user.uid}/${activeSession.id}`), {
                              model: 'gpt-4o-mini'
                            });
                          }
                          setIsModelDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${activeModel === 'gpt-4o-mini' ? 'bg-amber-500/10 text-amber-400' : (settings.theme === 'dark' ? 'text-neutral-300 hover:bg-white/5' : 'text-neutral-600 hover:bg-neutral-50')}`}
                      >
                        <div className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>GPT-4o Mini</span>
                        </div>
                        {activeModel === 'gpt-4o-mini' && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => {
                          setActiveModel('gpt-4o');
                          if (activeSession) {
                            update(ref(rtdb, `conversations/${user.uid}/${activeSession.id}`), {
                              model: 'gpt-4o'
                            });
                          }
                          setIsModelDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${activeModel === 'gpt-4o' ? 'bg-rose-500/10 text-rose-400' : (settings.theme === 'dark' ? 'text-neutral-300 hover:bg-white/5' : 'text-neutral-600 hover:bg-neutral-50')}`}
                      >
                        <div className="flex items-center gap-2">
                          <Flame className="w-3.5 h-3.5 text-rose-400" />
                          <span>GPT-4o</span>
                        </div>
                        {activeModel === 'gpt-4o' && <Check className="w-3.5 h-3.5" />}
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button 
                onClick={() => setShowAdmin(true)}
                className="px-3.5 py-1.5 text-xs bg-gradient-to-r from-blue-500/10 to-sky-500/10 border border-blue-500/20 text-blue-400 hover:from-blue-500/20 rounded-xl transition-all font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                Admin
              </button>
            )}
            {activeSession && (
              <button 
                onClick={() => handleDeleteChat(activeSession.id)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${settings.theme === 'dark' ? 'hover:bg-red-500/10 text-neutral-400 hover:text-red-400' : 'hover:bg-red-100 text-neutral-500 hover:text-red-600'}`}
                title="Delete Current Chat"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={() => setShowSettings(true)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${settings.theme === 'dark' ? 'hover:bg-white/5 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800'}`}
              title="System Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Dynamic System announcements */}
        {activeAnnouncement && dismissedAnnounce !== activeAnnouncement.id && (
          <div className="bg-blue-500/10 border-b border-blue-500/20 px-6 py-2.5 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2 text-blue-400 font-medium">
              <Megaphone className="w-4 h-4 shrink-0 animate-pulse" />
              <span><strong>Announcement:</strong> {activeAnnouncement.title} - {activeAnnouncement.content}</span>
            </div>
            <button 
              onClick={() => setDismissedAnnounce(activeAnnouncement.id)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Maintenance Banner */}
        {systemMaintenance && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-6 py-2 flex items-center gap-2 text-xs text-yellow-400 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
            <span>Core service maintenance mode active. New responses may fail.</span>
          </div>
        )}

        {/* CHAT MESSAGES CONTAINER */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          <div className="max-w-3xl mx-auto w-full space-y-6 flex flex-col min-h-full">
            {messages.length === 0 && (
              <div className="my-auto flex flex-col items-center justify-center text-center max-w-lg mx-auto py-12 space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-cyan-500/20 to-emerald-500/20 rounded-full blur-xl animate-pulse" />
                  <HSLogo className="w-20 h-20 relative z-10" />
                </div>
                <div className="space-y-2">
                  <h2 className={`text-xl font-bold tracking-tight ${settings.theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>How can I assist you today?</h2>
                  <p className={`text-sm leading-relaxed font-light ${settings.theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    Ask me anything from high-level computer program designs, language translations, bulk summarizations, to multi-modal diagram analysis.
                  </p>
                </div>

                {/* Suggestions Grid */}
                <div className="grid grid-cols-2 gap-3 w-full text-left">
                  <button 
                    onClick={() => handleSendMessage(undefined, "Write an optimized binary search tree in TypeScript with full explanations.")}
                    className={`p-3 rounded-xl transition-all text-xs font-medium text-left cursor-pointer flex flex-col gap-1 border shadow-sm ${
                      settings.theme === 'dark' 
                        ? 'bg-[#111] border-white/5 text-neutral-400 hover:border-white/10 hover:bg-white/5' 
                        : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    <span className={`font-semibold flex items-center gap-1 ${settings.theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}><Brain className="w-3 h-3 text-emerald-400" /> TS Binary Tree</span>
                    Draft binary tree structures
                  </button>
                  <button 
                    onClick={() => handleSendMessage(undefined, "Analyze the architectural differences between Monolith and Microservice patterns.")}
                    className={`p-3 rounded-xl transition-all text-xs font-medium text-left cursor-pointer flex flex-col gap-1 border shadow-sm ${
                      settings.theme === 'dark' 
                        ? 'bg-[#111] border-white/5 text-neutral-400 hover:border-white/10 hover:bg-white/5' 
                        : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    <span className={`font-semibold flex items-center gap-1 ${settings.theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}><FileText className="w-3 h-3 text-purple-400" /> Monolith vs Microservices</span>
                    Compare system design patterns
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
            <div 
              key={msg.id}
              className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role !== 'user' && (
                <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs shrink-0 shadow-[0_0_10px_rgba(96,165,250,0.1)]">
                  HS
                </div>
              )}

              <div className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-5 py-3.5 space-y-3 shadow-sm border ${
                msg.role === 'user' 
                  ? (settings.theme === 'dark' ? 'bg-[#161616] border-white/10 text-neutral-200 rounded-tr-none' : 'bg-blue-600 border-blue-600 text-white rounded-tr-none') 
                  : (settings.theme === 'dark' ? 'bg-[#0D0D0D] border-white/10 text-neutral-300 rounded-tl-none' : 'bg-white border-neutral-200 text-neutral-800 rounded-tl-none')
              }`}>
                {/* File attachments layout */}
                {msg.fileName && (
                  <div className={`mb-2 p-2.5 rounded-xl border flex items-center gap-3 ${settings.theme === 'dark' ? 'bg-neutral-900 border-white/10' : 'bg-neutral-100 border-neutral-200'}`}>
                    {msg.fileType?.startsWith('image/') ? (
                      <Image className="w-5 h-5 text-rose-400" />
                    ) : (
                      <FileText className="w-5 h-5 text-blue-400" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold truncate ${settings.theme === 'dark' || msg.role === 'user' ? 'text-white' : 'text-neutral-800'}`}>{msg.fileName}</p>
                      <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="text-3xs text-blue-400 hover:underline flex items-center gap-0.5 mt-0.5">
                        Download file <ArrowUpRight className="w-2 h-2" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Markdown text Content */}
                <div className={`${settings.theme === 'dark' ? 'prose prose-invert' : 'prose text-inherit'} max-w-none ${settings.fontSize === 'sm' ? 'text-xs' : settings.fontSize === 'lg' ? 'text-base' : 'text-sm'}`}>
                  <ReactMarkdown components={{ pre: PreWithCopy }}>{msg.content}</ReactMarkdown>
                </div>

                {/* Bubble action footer */}
                <div className={`flex justify-between items-center text-3xs border-t pt-2 ${
                  msg.role === 'user'
                    ? (settings.theme === 'dark' ? 'text-neutral-500 border-white/5' : 'text-white/70 border-white/10')
                    : (settings.theme === 'dark' ? 'text-neutral-500 border-white/5' : 'text-neutral-400 border-neutral-100')
                }`}>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <div className="flex gap-2">
                    {msg.role !== 'user' && (
                      <>
                        <button 
                          onClick={() => handleSpeakText(msg.content)}
                          className="p-1 hover:opacity-80 transition-opacity cursor-pointer"
                          title="Speak Text"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleRegenerate(idx)}
                          className="p-1 hover:opacity-80 transition-opacity cursor-pointer animate-spin-hover"
                          title="Regenerate"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => handleCopyMessage(msg.content)}
                      className="p-1 hover:opacity-80 transition-opacity cursor-pointer"
                      title="Copy Content"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="p-1 hover:text-red-400 hover:opacity-80 transition-colors cursor-pointer"
                      title="Delete Message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {msg.role === 'user' && (
                <div className={`w-8 h-8 rounded font-bold flex items-center justify-center text-xs shrink-0 border ${settings.theme === 'dark' ? 'bg-neutral-800 border-white/10 text-neutral-300' : 'bg-neutral-200 border-neutral-300 text-neutral-700'}`}>
                  {user.displayName?.substring(0, 2).toUpperCase() || 'U'}
                </div>
              )}
            </div>
          ))}

          {/* STREAMED INCOMING RESPONSE */}
          {streamedText && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs shrink-0 animate-pulse">
                HS
              </div>
              <div className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-5 py-3.5 space-y-3 shadow-sm border ${settings.theme === 'dark' ? 'bg-[#0D0D0D] border-white/10 text-neutral-300 rounded-tl-none' : 'bg-white border-neutral-200 text-neutral-800 rounded-tl-none'}`}>
                <div className={`${settings.theme === 'dark' ? 'prose prose-invert' : 'prose text-inherit'} max-w-none ${settings.fontSize === 'sm' ? 'text-xs' : settings.fontSize === 'lg' ? 'text-base' : 'text-sm'}`}>
                  <ReactMarkdown components={{ pre: PreWithCopy }}>{streamedText}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* Skeleton typing indicator */}
          {isGenerating && !streamedText && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs shrink-0 animate-bounce">
                HS
              </div>
              <div className={`rounded-2xl px-5 py-4 border text-xs flex gap-1.5 items-center ${settings.theme === 'dark' ? 'bg-[#0D0D0D] border-white/10 text-neutral-400' : 'bg-white border-neutral-200 text-neutral-500'}`}>
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 select-none">Synthesizing...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
          </div>
        </div>

        {/* BOTTOM USER INPUT DOCK AREA */}
        <div className={`p-4 border-t transition-colors ${settings.theme === 'dark' ? 'border-white/10 bg-[#0D0D0D]' : 'border-neutral-200 bg-white'}`}>
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto space-y-3">
            <div className={`w-full border rounded-2xl p-2 flex items-end gap-2.5 transition-all duration-200 ${
              settings.theme === 'dark' 
                ? 'bg-[#161616] border-white/10 focus-within:border-blue-500/50 shadow-[0_4px_20px_rgba(0,0,0,0.3)]' 
                : 'bg-white border-neutral-200 focus-within:border-blue-500 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
            }`}>
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isGenerating}
                placeholder="Ask Hissan's AI... ✨"
                className={`flex-1 py-2 px-1 text-sm outline-none bg-transparent resize-none overflow-y-auto max-h-[180px] ${
                  settings.theme === 'dark' ? 'text-white placeholder-neutral-500' : 'text-neutral-900 placeholder-neutral-400'
                }`}
              />

              {/* Action Buttons Group */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleVoiceInput}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    isListening 
                      ? 'bg-red-500/20 text-red-400 animate-pulse' 
                      : (settings.theme === 'dark' ? 'text-neutral-400 hover:text-white hover:bg-white/5' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100')
                  }`}
                  title={isListening ? "Stop listening" : "Record Voice message"}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {isGenerating ? (
                  <button
                    type="button"
                    onClick={handleStopGenerating}
                    className="p-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-white transition-colors cursor-pointer flex items-center justify-center h-10 w-10 shrink-0 shadow-md"
                    title="Stop Generating"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className={`p-2.5 rounded-xl text-white transition-all cursor-pointer flex items-center justify-center h-10 w-10 shrink-0 shadow-md hover:shadow-lg ${getThemeColorClass()}`}
                    title="Send Message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-center text-[10px] text-neutral-500">
              HS Chatbot can make mistakes. Verify critical computer designs, legal contracts, or system architecture plans.
            </p>
          </form>
        </div>

        {/* MODAL WINDOWS */}
        
        {/* Profile Settings Modal */}
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setShowProfileModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md border rounded-2xl shadow-2xl relative overflow-hidden z-10 ${settings.theme === 'dark' ? 'bg-neutral-950 border-white/10 text-white' : 'bg-white border-neutral-200 text-neutral-900'}`}
            >
              <div className={`flex justify-between items-center px-6 py-5 border-b ${settings.theme === 'dark' ? 'border-white/5' : 'border-neutral-200'}`}>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-400" />
                  <h3 className={`font-semibold text-lg ${settings.theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>Edit Profile Details</h3>
                </div>
                <button 
                  onClick={() => setShowProfileModal(false)} 
                  className={`p-1 rounded-lg cursor-pointer transition-colors ${settings.theme === 'dark' ? 'hover:bg-white/5 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Profile Pic selection */}
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-20 h-20 rounded-full border-2 border-blue-500/30 overflow-hidden relative group ${settings.theme === 'dark' ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center font-bold text-lg ${settings.theme === 'dark' ? 'text-neutral-400 bg-neutral-900' : 'text-neutral-500 bg-neutral-200'}`}>
                        {profileName.substring(0, 2).toUpperCase() || 'U'}
                      </div>
                    )}
                    {avatarUploading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <label className="text-xs text-blue-400 hover:underline font-semibold cursor-pointer">
                    Upload profile picture
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                  </label>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-neutral-400 font-semibold tracking-wider uppercase">Full name</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className={`w-full border rounded-xl py-3 px-4 text-sm outline-none focus:border-blue-500 transition-colors ${settings.theme === 'dark' ? 'bg-neutral-900 border-white/5 text-white' : 'bg-neutral-50 border-neutral-200 text-neutral-900'}`}
                      required
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </form>

                <hr className={settings.theme === 'dark' ? 'border-white/5' : 'border-neutral-200'} />

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-neutral-400 font-semibold tracking-wider uppercase">Change password</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input
                        type="password"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        placeholder="New password (min 6 chars)"
                        className={`w-full border rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 transition-colors ${settings.theme === 'dark' ? 'bg-neutral-900 border-white/5 text-white' : 'bg-neutral-50 border-neutral-200 text-neutral-900'}`}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className={`w-full py-3 border font-semibold rounded-xl text-sm transition-colors cursor-pointer ${settings.theme === 'dark' ? 'bg-neutral-900 border-white/10 text-neutral-300 hover:text-white' : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200'}`}
                  >
                    Update Password
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {/* App Settings Modal */}
        {showSettings && (
          <SettingsModal 
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Admin Control Center Modal */}
        {showAdmin && (
          <AdminDashboard 
            currentUserId={user.uid}
            onClose={() => setShowAdmin(false)}
          />
        )}

      </main>
    </div>
  );
}
