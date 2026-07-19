import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  set, 
  update, 
  push, 
  onValue, 
  get, 
  remove, 
  child,
  query,
  orderByChild,
  equalTo,
  increment
} from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAN0_4mNdHc8GMyKoeSDnzDdVVpk56a5Sw",
  authDomain: "ai-chatbot-4beb6.firebaseapp.com",
  databaseURL: "https://ai-chatbot-4beb6-default-rtdb.firebaseio.com",
  projectId: "ai-chatbot-4beb6",
  storageBucket: "ai-chatbot-4beb6.firebasestorage.app",
  messagingSenderId: "319844338452",
  appId: "1:319844338452:web:6903a18653ef39e96c5001",
  measurementId: "G-6G55FKH1LV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);

// Helper function to update analytics
export const logAnalyticsEvent = async (metric: 'totalChats' | 'totalMessages' | 'totalUsers', amount = 1) => {
  try {
    const analyticsRef = ref(rtdb, `analytics`);
    await update(analyticsRef, {
      [metric]: increment(amount)
    });
  } catch (err) {
    console.warn("Failed to log analytics event", err);
  }
};

// Initial setup for analytics if they do not exist
export const ensureAnalyticsInitialized = async () => {
  try {
    const analyticsRef = ref(rtdb, 'analytics');
    const snap = await get(analyticsRef);
    if (!snap.exists()) {
      await set(analyticsRef, {
        totalUsers: 1,
        totalChats: 0,
        totalMessages: 0,
        activeUsersToday: 1
      });
    }
  } catch (err) {
    console.warn("Failed to initialize analytics", err);
  }
};

/**
 * Parses a Firebase Auth error and returns a clean, human-readable, and polished error message.
 * This ensures that users do not see confusing raw messages like "Firebase: Error (auth/invalid-credential)."
 */
export function getFriendlyAuthErrorMessage(err: any): string {
  if (!err) return "An unknown error occurred.";
  
  const code = err.code || (typeof err === 'string' ? err : '');
  const message = err.message || '';

  switch (code) {
    case 'auth/invalid-credential':
      return "Incorrect email or password. Please verify your credentials and try again.";
    case 'auth/user-not-found':
      return "No account found with this email. Please check your spelling or sign up.";
    case 'auth/wrong-password':
      return "The password you entered is incorrect. Please try again.";
    case 'auth/invalid-email':
      return "Please enter a valid email address.";
    case 'auth/email-already-in-use':
      return "This email is already registered. Please sign in instead.";
    case 'auth/weak-password':
      return "Password is too weak. It must be at least 6 characters.";
    case 'auth/too-many-requests':
      return "This account has been temporarily locked due to multiple failed login attempts. Please reset your password or try again later.";
    case 'auth/popup-closed-by-user':
      return "The sign-in popup was closed before completing authentication.";
    case 'auth/network-request-failed':
      return "A network error occurred. Please check your internet connection and try again.";
    case 'auth/user-disabled':
      return "This user account has been disabled. Please contact support.";
    case 'auth/operation-not-allowed':
      return "This sign-in method is not enabled. Please contact support.";
    case 'auth/requires-recent-login':
      return "For security reasons, changing your password requires you to sign in again recently.";
    default:
      if (message.includes('auth/invalid-credential') || message.includes('invalid-credential')) {
        return "Incorrect email or password. Please verify your credentials and try again.";
      }
      if (message.includes('auth/user-not-found') || message.includes('user-not-found')) {
        return "No account found with this email. Please check your spelling or sign up.";
      }
      if (message.includes('auth/wrong-password') || message.includes('wrong-password')) {
        return "The password you entered is incorrect. Please try again.";
      }
      if (message.includes('auth/email-already-in-use') || message.includes('email-already-in-use')) {
        return "This email is already registered. Please sign in instead.";
      }
      if (message.includes('auth/weak-password') || message.includes('weak-password')) {
        return "Password is too weak. It must be at least 6 characters.";
      }
      if (message.includes('auth/too-many-requests') || message.includes('too-many-requests')) {
        return "This account has been temporarily locked due to multiple failed login attempts. Please reset your password or try again later.";
      }
      if (message.includes('auth/requires-recent-login') || message.includes('requires-recent-login')) {
        return "For security reasons, changing your password requires you to sign in again recently.";
      }
      
      return message.replace(/^Firebase:\s*(Error\s*)?(\([^)]+\))?:?\s*/i, '') || "An unexpected authentication error occurred.";
  }
}
