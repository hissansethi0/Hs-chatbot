import React from 'react';
import { motion } from 'motion/react';
import { X, Settings, Moon, Sun, Type, Languages, Bell, Database, KeyRound } from 'lucide-react';
import { AppSettings, ThemeColor, FontSize, Language } from '../types';

interface SettingsModalProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onClose: () => void;
}

const colors: { name: ThemeColor; value: string; class: string }[] = [
  { name: 'blue', value: '#60A5FA', class: 'bg-blue-500' },
  { name: 'purple', value: '#A78BFA', class: 'bg-purple-500' },
  { name: 'emerald', value: '#34D399', class: 'bg-emerald-500' },
  { name: 'rose', value: '#F43F5E', class: 'bg-rose-500' },
  { name: 'slate', value: '#94A3B8', class: 'bg-slate-500' }
];

export default function SettingsModal({ settings, onUpdateSettings, onClose }: SettingsModalProps) {
  const toggleTheme = () => {
    onUpdateSettings({
      ...settings,
      theme: settings.theme === 'dark' ? 'light' : 'dark'
    });
  };

  const setFontSize = (size: FontSize) => {
    onUpdateSettings({ ...settings, fontSize: size });
  };

  const setThemeColor = (color: ThemeColor) => {
    onUpdateSettings({ ...settings, themeColor: color });
  };

  const setLanguage = (lang: Language) => {
    onUpdateSettings({ ...settings, language: lang });
  };

  const toggleNotifications = () => {
    onUpdateSettings({ ...settings, notificationsEnabled: !settings.notificationsEnabled });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
      />

      {/* Modal Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`w-full max-w-lg ${settings.theme === 'dark' ? 'bg-neutral-950 text-white border-white/10' : 'bg-white text-neutral-900 border-neutral-200'} border rounded-2xl shadow-2xl relative overflow-hidden z-10`}
      >
        <div className={`flex justify-between items-center px-6 py-5 border-b ${settings.theme === 'dark' ? 'border-white/5' : 'border-neutral-100'}`}>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <h3 className={`font-semibold text-lg ${settings.theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>System Preferences</h3>
          </div>
          <button 
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${settings.theme === 'dark' ? 'hover:bg-white/5 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Theme Mode */}
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h4 className={`text-sm font-medium flex items-center gap-2 ${settings.theme === 'dark' ? 'text-white' : 'text-neutral-800'}`}>
                {settings.theme === 'dark' ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                Theme Workspace
              </h4>
              <p className="text-xs text-neutral-500">Toggle between immersive dark canvas or crisp light mode.</p>
            </div>
            <button 
              onClick={toggleTheme}
              className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${settings.theme === 'dark' ? 'bg-white text-black border-white hover:bg-neutral-200' : 'bg-black text-white border-black hover:bg-neutral-800'}`}
            >
              {settings.theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>

          <hr className={settings.theme === 'dark' ? 'border-white/5' : 'border-neutral-100'} />

          {/* Accent Colors */}
          <div className="space-y-3">
            <div className="space-y-1">
              <h4 className={`text-sm font-medium flex items-center gap-2 ${settings.theme === 'dark' ? 'text-white' : 'text-neutral-800'}`}>
                <Database className="w-4 h-4 text-blue-400" />
                SaaS Accent Color
              </h4>
              <p className="text-xs text-neutral-500">Choose the brand highlights for primary buttons, tags, and loaders.</p>
            </div>
            <div className="flex gap-3">
              {colors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setThemeColor(color.name)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border-2 cursor-pointer hover:scale-110 ${color.class} ${settings.themeColor === color.name ? (settings.theme === 'dark' ? 'border-white ring-2 ring-blue-500/50' : 'border-neutral-900 ring-2 ring-blue-500/50') : 'border-transparent'}`}
                  title={color.name}
                >
                  {settings.themeColor === color.name && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <hr className={settings.theme === 'dark' ? 'border-white/5' : 'border-neutral-100'} />

          {/* Font Resizing */}
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h4 className={`text-sm font-medium flex items-center gap-2 ${settings.theme === 'dark' ? 'text-white' : 'text-neutral-800'}`}>
                <Type className="w-4 h-4 text-blue-400" />
                Font Sizing
              </h4>
              <p className="text-xs text-neutral-500">Configure core reading sizing for high-density document screens.</p>
            </div>
            <div className={`flex p-1 rounded-xl border ${settings.theme === 'dark' ? 'bg-neutral-900 border-white/10' : 'bg-neutral-100 border-neutral-200'}`}>
              {(['sm', 'md', 'lg'] as FontSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`px-3 py-1.5 text-xs font-medium uppercase rounded-lg transition-all cursor-pointer ${settings.fontSize === size ? 'bg-blue-500 text-white shadow-sm' : (settings.theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-neutral-900')}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <hr className={settings.theme === 'dark' ? 'border-white/5' : 'border-neutral-100'} />

          {/* Language selection */}
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h4 className={`text-sm font-medium flex items-center gap-2 ${settings.theme === 'dark' ? 'text-white' : 'text-neutral-800'}`}>
                <Languages className="w-4 h-4 text-blue-400" />
                Language
              </h4>
              <p className="text-xs text-neutral-500">Configure localized text templates and output standards.</p>
            </div>
            <select
              value={settings.language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className={`border text-xs font-medium px-3 py-2 rounded-xl outline-none transition-colors ${settings.theme === 'dark' ? 'bg-neutral-900 border-white/10 text-white focus:border-blue-500' : 'bg-neutral-100 border-neutral-200 text-neutral-800 focus:border-blue-600'}`}
            >
              <option value="en">English (EN)</option>
              <option value="es">Español (ES)</option>
              <option value="fr">Français (FR)</option>
              <option value="de">Deutsch (DE)</option>
              <option value="zh">中文 (ZH)</option>
            </select>
          </div>

          <hr className={settings.theme === 'dark' ? 'border-white/5' : 'border-neutral-100'} />

          {/* Desktop notifications toggle */}
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h4 className={`text-sm font-medium flex items-center gap-2 ${settings.theme === 'dark' ? 'text-white' : 'text-neutral-800'}`}>
                <Bell className="w-4 h-4 text-blue-400" />
                System Notifications
              </h4>
              <p className="text-xs text-neutral-500">Push desktop alerts when background deep generation finishes.</p>
            </div>
            <button
              onClick={toggleNotifications}
              className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${settings.notificationsEnabled ? 'bg-blue-500' : (settings.theme === 'dark' ? 'bg-neutral-800' : 'bg-neutral-200')}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <hr className={settings.theme === 'dark' ? 'border-white/5' : 'border-neutral-100'} />

          {/* API Key Input for Netlify/Static hosting */}
          <div className="space-y-2">
            <div className="space-y-1">
              <h4 className={`text-sm font-medium flex items-center gap-2 ${settings.theme === 'dark' ? 'text-white' : 'text-neutral-800'}`}>
                <KeyRound className="w-4 h-4 text-blue-400" />
                HS Chat API Key (Optional)
              </h4>
              <p className="text-xs text-neutral-500">Provide an optional direct Google Gemini key if running on static platforms like Netlify.</p>
            </div>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={settings.clientApiKey || ''}
              onChange={(e) => onUpdateSettings({ ...settings, clientApiKey: e.target.value })}
              className={`w-full border rounded-xl py-2 px-3 text-xs outline-none transition-colors ${settings.theme === 'dark' ? 'bg-neutral-900 border-white/10 text-white placeholder-neutral-600 focus:border-blue-500' : 'bg-neutral-100 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-blue-600'}`}
            />
          </div>

          <hr className={settings.theme === 'dark' ? 'border-white/5' : 'border-neutral-100'} />

          {/* OpenAI API Key Input */}
          <div className="space-y-2">
            <div className="space-y-1">
              <h4 className={`text-sm font-medium flex items-center gap-2 ${settings.theme === 'dark' ? 'text-white' : 'text-neutral-800'}`}>
                <KeyRound className="w-4 h-4 text-emerald-400" />
                OpenAI API Key (Optional)
              </h4>
              <p className="text-xs text-neutral-500">Provide a custom OpenAI API Key if you wish to override the system key for GPT models.</p>
            </div>
            <input
              type="password"
              placeholder="sk-proj-..."
              value={settings.clientOpenAiApiKey || ''}
              onChange={(e) => onUpdateSettings({ ...settings, clientOpenAiApiKey: e.target.value })}
              className={`w-full border rounded-xl py-2 px-3 text-xs outline-none transition-colors ${settings.theme === 'dark' ? 'bg-neutral-900 border-white/10 text-white placeholder-neutral-600 focus:border-emerald-500' : 'bg-neutral-100 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-emerald-600'}`}
            />
          </div>

          <hr className={settings.theme === 'dark' ? 'border-white/5' : 'border-neutral-100'} />

          {/* API Info panel */}
          <div className={`border rounded-xl p-4 space-y-2 ${settings.theme === 'dark' ? 'bg-blue-500/5 border-blue-500/10' : 'bg-blue-50 border-blue-100'}`}>
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-500" />
              <h5 className="text-xs font-bold uppercase tracking-wider text-blue-500">HS Chat Service Status</h5>
            </div>
            <p className={`text-xs leading-relaxed ${settings.theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>
              HS Chat uses highly-polished full-stack secure proxy routes. Designed by HS with automatic fallbacks. Under active telemetry.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
