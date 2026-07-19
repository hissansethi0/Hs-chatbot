import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  rtdb, 
  logAnalyticsEvent,
  getFriendlyAuthErrorMessage
} from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  updateProfile 
} from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { KeyRound, Mail, User, ShieldAlert, ArrowLeft, Loader2, Sparkles, Eye, EyeOff } from 'lucide-react';

interface AuthPageProps {
  onAuthSuccess: () => void;
  onBackToLanding: () => void;
}

type AuthMode = 'login' | 'signup' | 'forgot';

export default function AuthPage({ onAuthSuccess, onBackToLanding }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  
  // Status states
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setError(null);
    setInfoMessage(null);
    setShowLoginPassword(false);
    setShowSignupPassword(false);
    setShowSignupConfirmPassword(false);
  };

  const changeMode = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill out all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      await logAnalyticsEvent('totalUsers', 0); // Trigger analytics lookup without increment
      onAuthSuccess();
    } catch (err: any) {
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword || !fullName) {
      setError("Please fill out all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Update Auth display name
      await updateProfile(user, {
        displayName: fullName
      });

      // 3. Create database profile
      const userProfile = {
        uid: user.uid,
        fullName: fullName,
        email: email,
        createdAt: Date.now(),
        isAdmin: email === "hissansethi0@gmail.com" || email === "ffplayerno0001@gmail.com" // Grant administrative access
      };

      await set(ref(rtdb, `users/${user.uid}`), userProfile);
      
      // Update analytics
      await logAnalyticsEvent('totalUsers', 1);

      setInfoMessage("Registration successful! Logging in...");
      setTimeout(() => {
        onAuthSuccess();
      }, 1000);
    } catch (err: any) {
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      await sendPasswordResetEmail(auth, email);
      setInfoMessage("A password reset email has been dispatched. Please check your inbox.");
    } catch (err: any) {
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-page" className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-6 relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Back button */}
      <button 
        onClick={onBackToLanding}
        className="absolute top-6 left-6 flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </button>

      {/* Main card */}
      <div className="w-full max-w-md glass-panel rounded-2xl p-8 relative shadow-2xl">
        <div className="absolute -inset-px bg-gradient-to-r from-blue-500/10 to-transparent rounded-2xl -z-10" />

        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center font-bold text-xl text-white shadow-[0_0_20px_rgba(96,165,250,0.4)] mb-4">
            HS
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {mode === 'login' && "Welcome back"}
            {mode === 'signup' && "Create an account"}
            {mode === 'forgot' && "Reset your password"}
          </h2>
          <p className="text-neutral-400 text-sm mt-2 text-center">
            {mode === 'login' && "Access your personalized workspace and deep history."}
            {mode === 'signup' && "Start exploring the next level of HS Chat AI assistance."}
            {mode === 'forgot' && "Enter your email to receive a secure recovery link."}
          </p>
        </div>

        {/* Feedback Messages */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/20 text-red-400 text-xs flex gap-2 items-start"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {infoMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-xl bg-blue-950/40 border border-blue-500/20 text-blue-300 text-xs flex gap-2 items-start"
            >
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Forms */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-neutral-400 font-semibold tracking-wider uppercase">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-blue-500 outline-none transition-colors"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs text-neutral-400 font-semibold tracking-wider uppercase">Password</label>
                <button 
                  type="button" 
                  onClick={() => changeMode('forgot')}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type={showLoginPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/5 rounded-xl py-3 pl-10 pr-12 text-sm focus:border-blue-500 outline-none transition-colors"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer p-1"
                  title={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="playbtn w-full py-3.5 text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
            >
              {!loading && (
                <>
                  <span className="border-line"></span>
                  <span className="border-line"></span>
                  <span className="border-line"></span>
                  <span className="border-line"></span>
                </>
              )}
              <span className="btn-text relative z-10 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
              </span>
            </button>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-neutral-400 font-semibold tracking-wider uppercase">Full name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-blue-500 outline-none transition-colors"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-400 font-semibold tracking-wider uppercase">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-blue-500 outline-none transition-colors"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-400 font-semibold tracking-wider uppercase">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type={showSignupPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/5 rounded-xl py-3 pl-10 pr-12 text-sm focus:border-blue-500 outline-none transition-colors"
                  placeholder="At least 6 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer p-1"
                  title={showSignupPassword ? "Hide password" : "Show password"}
                >
                  {showSignupPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-400 font-semibold tracking-wider uppercase">Confirm password</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type={showSignupConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/5 rounded-xl py-3 pl-10 pr-12 text-sm focus:border-blue-500 outline-none transition-colors"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer p-1"
                  title={showSignupConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showSignupConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="playbtn w-full py-3.5 text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
            >
              {!loading && (
                <>
                  <span className="border-line"></span>
                  <span className="border-line"></span>
                  <span className="border-line"></span>
                  <span className="border-line"></span>
                </>
              )}
              <span className="btn-text relative z-10 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
              </span>
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-neutral-400 font-semibold tracking-wider uppercase">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-blue-500 outline-none transition-colors"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="playbtn w-full py-3.5 text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
            >
              {!loading && (
                <>
                  <span className="border-line"></span>
                  <span className="border-line"></span>
                  <span className="border-line"></span>
                  <span className="border-line"></span>
                </>
              )}
              <span className="btn-text relative z-10 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Link"}
              </span>
            </button>

            <button 
              type="button" 
              onClick={() => changeMode('login')}
              className="w-full text-center text-xs text-neutral-400 hover:text-white"
            >
              Back to Sign In
            </button>
          </form>
        )}

        {/* Card Footer toggle */}
        {mode !== 'forgot' && (
          <div className="mt-8 text-center text-sm text-neutral-500">
            {mode === 'login' ? (
              <>
                Don't have an account?{" "}
                <button 
                  onClick={() => changeMode('signup')}
                  className="text-blue-400 hover:underline font-medium"
                >
                  Create one now
                </button>
              </>
            ) : (
              <>
                Already registered?{" "}
                <button 
                  onClick={() => changeMode('login')}
                  className="text-blue-400 hover:underline font-medium"
                >
                  Sign in instead
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
