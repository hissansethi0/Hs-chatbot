import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Brain, Code, Languages, FileImage, 
  FileText, ListCollapse, Download, Mic, ArrowRight,
  ShieldAlert, Activity, ChevronDown, MessageSquare, Zap, Clock, Users
} from 'lucide-react';
import { FAQItem } from '../types';

interface LandingPageProps {
  onGetStarted: () => void;
}

const faqs: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'What is HS Chatbot?',
    answer: 'HS Chatbot is a next-generation AI assistant built for deep logical thinking, coding aid, translation, document digestion, and voice processing. It utilizes advanced HS Chat models for immediate, hyper-accurate answers.'
  },
  {
    id: 'faq-2',
    question: 'What is the HS Deep Thinking mode?',
    answer: 'HS Deep Thinking is our special reasoning mode that activates advanced pro models with specific structured instructions. It takes extra time to construct logic paths, write cleaner code, and answer complex research-level queries.'
  },
  {
    id: 'faq-3',
    question: 'How secure is my data?',
    answer: 'Your data is secured directly via Google Firebase Authentication and Realtime Database. Your personal information, chats, and uploaded files are protected under strict private read/write permissions.'
  },
  {
    id: 'faq-4',
    question: 'Can I upload files for analysis?',
    answer: 'Yes! HS Chatbot supports PDF, DOCX, TXT, and major image formats. The system processes the uploaded documents and utilizes HS Chat Multimodal API to give you instant contextual answers.'
  },
  {
    id: 'faq-5',
    question: 'Can I export my conversations?',
    answer: 'Absolutely. You can download any conversation as formatted Markdown, standard text files, or printable PDF documents instantly from the sidebar menu.'
  }
];

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<string | null>(null);

  const features = [
    {
      icon: <Brain className="w-6 h-6 text-blue-400" />,
      title: "Deep Thinking AI",
      desc: "Activate HS Deep Thinking for structured, multi-step logical reasoning and advanced explanations."
    },
    {
      icon: <Code className="w-6 h-6 text-emerald-400" />,
      title: "Coding Assistant",
      desc: "Instant syntax highlighting, unit-test drafting, debugging, and code translations across 30+ languages."
    },
    {
      icon: <Languages className="w-6 h-6 text-purple-400" />,
      title: "Translation System",
      desc: "Zero-latency, high-context translation across standard and complex languages with cultural nuance."
    },
    {
      icon: <FileImage className="w-6 h-6 text-rose-400" />,
      title: "Image Understanding",
      desc: "Upload screenshots, sketches, or diagrams and get immediate OCR, structural mapping, and code conversions."
    },
    {
      icon: <FileText className="w-6 h-6 text-sky-400" />,
      title: "Document Analysis",
      desc: "Drop standard PDF, DOCX, and text files. The AI parses the bulk content and acts as an expert on your database."
    },
    {
      icon: <ListCollapse className="w-6 h-6 text-amber-400" />,
      title: "AI Summaries",
      desc: "Transform long-winded documents or lengthy research logs into ultra-precise, bulleted, actionable lists."
    },
    {
      icon: <Download className="w-6 h-6 text-indigo-400" />,
      title: "Export Conversations",
      desc: "Instantly package your research, outputs, and chat histories into Markdown, PDF, or Plain Text."
    },
    {
      icon: <Mic className="w-6 h-6 text-teal-400" />,
      title: "Voice Interaction",
      desc: "Realtime Speech-to-Text inputs and smooth Text-to-Speech vocal summaries for screen-free productivity."
    }
  ];

  return (
    <div id="landing-page" className="min-h-screen bg-black text-white selection:bg-blue-500/30 overflow-x-hidden">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 w-full z-50 glass-panel border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(96,165,250,0.5)]">
            HS
          </div>
          <span className="font-semibold text-lg tracking-wider text-white">HS CHATBOT</span>
        </div>
        <div className="flex items-center gap-4">
          <motion.button 
            onClick={onGetStarted}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            className="px-5 py-2.5 text-sm bg-white hover:bg-neutral-100 text-black font-semibold rounded-full transition-colors shadow-[0_4px_20px_rgba(255,255,255,0.15)] hover:shadow-[0_4px_25px_rgba(255,255,255,0.35)] cursor-pointer"
          >
            Launch App
          </motion.button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Background Gradients */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 right-10 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8"
        >
          <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
          <span className="text-xs font-medium tracking-wide text-gray-300">Next-Gen HS Chat Assistant</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-none max-w-5xl"
        >
          Your Smart AI Assistant <br className="hidden md:inline"/>
          for <span className="bg-gradient-to-r from-blue-400 via-sky-400 to-indigo-500 bg-clip-text text-transparent">Everything</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-gray-400 text-lg md:text-xl max-w-2xl mt-6 font-light leading-relaxed"
        >
          A premium full-stack solution with multi-model capability, document digestion, voice intelligence, and a dedicated workspace.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 mt-10 z-10"
        >
          <motion.button
            onClick={onGetStarted}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="relative group px-8 py-4 rounded-full flex items-center justify-center gap-2.5 cursor-pointer overflow-hidden"
          >
            {/* Ambient blooming glow on hover */}
            <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-600 rounded-full blur-md opacity-25 group-hover:opacity-75 transition-opacity duration-500 -z-20" />
            
            {/* Spinning Conic Gradient Border Beam */}
            <motion.div
              className="absolute inset-[-250%] bg-[conic-gradient(from_0deg,transparent_30%,#3b82f6_45%,#60a5fa_50%,#818cf8_55%,transparent_70%)] opacity-90 -z-10"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
            />
            
            {/* Center masking container for the perfect 1.5px border */}
            <div className="absolute inset-[1.5px] bg-neutral-950 rounded-full -z-10 transition-colors duration-300 group-hover:bg-neutral-900/90" />
            
            {/* Gliding shimmer swipe effect */}
            <motion.div
              className="absolute inset-0 w-[200%] h-full -z-10"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2) 50%, transparent)",
                transform: "skewX(-20deg) translateX(-100%)"
              }}
              animate={{
                transform: ["skewX(-20deg) translateX(-120%)", "skewX(-20deg) translateX(120%)"]
              }}
              transition={{
                repeat: Infinity,
                duration: 2.2,
                ease: "easeInOut",
                repeatDelay: 1.5
              }}
            />

            <span className="relative z-10 font-bold tracking-wide text-white flex items-center gap-2">
              Get Started Free
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1.5 transition-transform duration-300" />
            </span>
          </motion.button>
        </motion.div>

        {/* Floating Chat Interface Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="w-full max-w-4xl mt-16 rounded-2xl glass-panel p-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative"
        >
          <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl -z-10 blur-xl opacity-70" />
          <div className="bg-neutral-900/60 rounded-xl overflow-hidden border border-white/5">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 bg-neutral-900 border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/40" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
                <div className="w-3 h-3 rounded-full bg-green-500/40" />
              </div>
              <div className="text-xs text-neutral-500 font-mono">ai-workspace.hs</div>
              <div className="w-8" />
            </div>
            {/* UI Content Preview */}
            <div className="p-6 text-left space-y-4 font-sans text-sm">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center">U</div>
                <div className="bg-neutral-800/80 rounded-2xl px-4 py-3 max-w-[80%] text-neutral-200">
                  Can you outline a complete system design for a highly scalable messaging engine?
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center">AI</div>
                <div className="bg-neutral-900 rounded-2xl px-4 py-3 max-w-[85%] text-neutral-300 border border-white/5 space-y-2">
                  <p className="font-semibold text-white">Certainly! Here is a core architectural outline for your messaging system:</p>
                  <table className="w-full border-collapse mt-2 text-xs text-neutral-400">
                    <thead>
                      <tr className="border-b border-white/10 text-left">
                        <th className="pb-1 text-white">Tier</th>
                        <th className="pb-1 text-white">Technology</th>
                        <th className="pb-1 text-white">Objective</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-1">Ingress Gateway</td>
                        <td>Nginx + WebSockets</td>
                        <td>Manage persistent user sockets</td>
                      </tr>
                      <tr>
                        <td className="py-1">Event Broker</td>
                        <td>Redis Pub/Sub</td>
                        <td>Real-time chat dispatch</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Statistics Section */}
      <section className="border-t border-b border-white/5 bg-neutral-950/40 py-16 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <motion.div 
            whileHover={{ y: -4, scale: 1.02 }}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-2 p-6 rounded-2xl border border-white/[0.02] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/5 transition-all duration-300"
          >
            <div className="flex justify-center mb-1"><Users className="w-8 h-8 text-blue-400" /></div>
            <div className="text-4xl md:text-5xl font-bold text-white font-mono tracking-tight">10K+</div>
            <p className="text-xs text-neutral-500 tracking-wider uppercase font-semibold">Active Profiles</p>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -4, scale: 1.02 }}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-2 p-6 rounded-2xl border border-white/[0.02] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/5 transition-all duration-300"
          >
            <div className="flex justify-center mb-1"><MessageSquare className="w-8 h-8 text-emerald-400" /></div>
            <div className="text-4xl md:text-5xl font-bold text-white font-mono tracking-tight">5.2M+</div>
            <p className="text-xs text-neutral-500 tracking-wider uppercase font-semibold">Messages Processed</p>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -4, scale: 1.02 }}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-2 p-6 rounded-2xl border border-white/[0.02] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/5 transition-all duration-300"
          >
            <div className="flex justify-center mb-1"><Clock className="w-8 h-8 text-purple-400" /></div>
            <div className="text-4xl md:text-5xl font-bold text-white font-mono tracking-tight">&lt; 0.5s</div>
            <p className="text-xs text-neutral-500 tracking-wider uppercase font-semibold">Avg Response Latency</p>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">Packed with Advanced Features</h2>
          <p className="text-neutral-400 max-w-2xl mx-auto font-light">Everything you expect from an industrial SaaS platform, polished to absolute visual perfection.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              whileHover={{ 
                y: -6, 
                scale: 1.03,
                boxShadow: "0 12px 30px rgba(59,130,246,0.15)",
                borderColor: "rgba(59,130,246,0.3)"
              }}
              className="glass-card p-6 rounded-2xl flex flex-col gap-4 text-left group cursor-pointer border border-white/5 bg-white/[0.02] transition-colors duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500/10 group-hover:border-blue-500/20 transition-all duration-300">
                {feat.icon}
              </div>
              <h3 className="font-semibold text-lg text-white group-hover:text-blue-400 transition-colors">{feat.title}</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Accordion FAQ Section */}
      <section className="py-24 px-6 md:px-12 max-w-3xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Frequently Asked Questions</h2>
          <p className="text-neutral-400 font-light">Got a question? We have answers. Learn more about HS Chatbot.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq) => {
            const isOpen = activeFaq === faq.id;
            return (
              <div 
                key={faq.id} 
                className="border-b border-white/10 pb-4 transition-all"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : faq.id)}
                  className="w-full py-4 flex justify-between items-center text-left text-white hover:text-blue-400 transition-colors font-medium text-lg"
                >
                  <span>{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="text-neutral-400 text-sm leading-relaxed pr-6 pb-2">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer Section */}
      <footer className="border-t border-white/5 bg-neutral-950/60 py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center font-bold text-white">HS</div>
              <span className="font-semibold text-lg tracking-wider text-white">HS CHATBOT</span>
            </div>
            <p className="text-neutral-400 text-sm max-w-sm font-light">
              Designing the future of human-AI collaboration. Fully responsive, highly secure, and optimized for real-world enterprise operations.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs text-neutral-300 font-bold uppercase tracking-wider">Product</h4>
            <ul className="space-y-2 text-sm text-neutral-500">
              <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs text-neutral-300 font-bold uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2 text-sm text-neutral-500">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs text-neutral-300 font-bold uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-sm text-neutral-500">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-white/5 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-neutral-500">&copy; 2026 HS Chatbot Inc. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-neutral-500">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
            <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
