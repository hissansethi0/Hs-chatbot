export type ThemeColor = 'blue' | 'purple' | 'emerald' | 'rose' | 'slate';
export type FontSize = 'sm' | 'md' | 'lg';
export type Language = 'en' | 'es' | 'fr' | 'de' | 'zh';
export type AIModel = 'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'hs-deep-thinking' | 'gpt-4o-mini' | 'gpt-4o';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  photoURL?: string;
  isAdmin?: boolean;
  isBanned?: boolean;
  createdAt: number;
}

export interface ChatSession {
  id: string;
  title: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  isPinned: boolean;
  model: AIModel;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string; // 'user' or 'assistant'
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  reasoning?: string | null; // For HS Deep Thinking reasoning
}

export interface AppSettings {
  theme: 'dark' | 'light';
  themeColor: ThemeColor;
  fontSize: FontSize;
  defaultModel: AIModel;
  language: Language;
  notificationsEnabled: boolean;
  systemMaintenanceMode?: boolean;
  clientApiKey?: string;
  clientOpenAiApiKey?: string;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  active: boolean;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface AppAnalytics {
  totalUsers: number;
  totalChats: number;
  totalMessages: number;
  activeUsersToday: number;
}
