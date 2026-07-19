import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, ensureAnalyticsInitialized } from './lib/firebase';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import ChatInterface from './components/ChatInterface';
import { AppSettings } from './types';
import { Loader2, Sparkles } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<'landing' | 'auth' | 'chat'>('landing');

  // Load client settings with local persistence
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('hs-chatbot-settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return {
      theme: 'dark',
      themeColor: 'blue',
      fontSize: 'md',
      defaultModel: 'gemini-3.5-flash',
      language: 'en',
      notificationsEnabled: true
    };
  });

  // Save settings on update
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('hs-chatbot-settings', JSON.stringify(newSettings));
    
    // Manage document html classes for Light/Dark themes
    const root = window.document.documentElement;
    if (newSettings.theme === 'light') {
      root.classList.add('light');
      root.style.backgroundColor = '#ffffff';
      root.style.color = '#171717';
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#171717';
    } else {
      root.classList.remove('light');
      root.style.backgroundColor = '#000000';
      root.style.color = '#f3f4f6';
      document.body.style.backgroundColor = '#000000';
      document.body.style.color = '#f3f4f6';
    }

    // Dynamic browser/mobile status bar theme color support
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', newSettings.theme === 'light' ? '#ffffff' : '#000000');
  };

  useEffect(() => {
    // Initial setup of analytics and settings theme on mount
    ensureAnalyticsInitialized();
    handleUpdateSettings(settings);

    // Subscribe to Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setView('chat');
      } else {
        setUser(null);
        if (view === 'chat') {
          setView('landing');
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setView('landing');
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 relative" />
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
          Loading HS Chatbot...
        </div>
      </div>
    );
  }

  return (
    <>
      {view === 'landing' && (
        <LandingPage onGetStarted={() => setView('auth')} />
      )}

      {view === 'auth' && (
        <AuthPage 
          onAuthSuccess={() => setView('chat')}
          onBackToLanding={() => setView('landing')}
        />
      )}

      {view === 'chat' && user && (
        <ChatInterface 
          user={user}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}
