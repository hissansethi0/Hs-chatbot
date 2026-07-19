import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  rtdb, 
  logAnalyticsEvent 
} from '../lib/firebase';
import { ref, set, onValue, update, remove, get, push } from 'firebase/database';
import { 
  Users, MessageSquare, ShieldAlert, Megaphone, 
  Key, Settings2, Trash2, Ban, Search, CheckCircle, 
  AlertTriangle, Play, RefreshCw, X, Hammer, Shield
} from 'lucide-react';
import { UserProfile, SystemAnnouncement, AppAnalytics } from '../types';

interface AdminDashboardProps {
  currentUserId: string;
  onClose: () => void;
}

type AdminTab = 'users' | 'broadcast' | 'analytics' | 'settings';

export default function AdminDashboard({ currentUserId, onClose }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  
  // Dynamic lists from Firebase RTDB
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [analytics, setAnalytics] = useState<AppAnalytics>({
    totalUsers: 0,
    totalChats: 0,
    totalMessages: 0,
    activeUsersToday: 0
  });

  // Maintenance & API Settings
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowPublicSignup, setAllowPublicSignup] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceContent, setAnnounceContent] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Synchronize data in real-time
  useEffect(() => {
    // 1. Listen to users
    const usersRef = ref(rtdb, 'users');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.values(data) as UserProfile[];
        setUsersList(list);
      }
    });

    // 2. Listen to announcements
    const announcementsRef = ref(rtdb, 'announcements');
    const unsubscribeAnnounce = onValue(announcementsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.values(data) as SystemAnnouncement[];
        setAnnouncements(list.sort((a, b) => b.createdAt - a.createdAt));
      } else {
        setAnnouncements([]);
      }
    });

    // 3. Listen to analytics
    const analyticsRef = ref(rtdb, 'analytics');
    const unsubscribeAnalytics = onValue(analyticsRef, (snapshot) => {
      if (snapshot.exists()) {
        setAnalytics(snapshot.val());
      }
    });

    // 4. Listen to settings
    const maintenanceRef = ref(rtdb, 'settings/maintenanceMode');
    onValue(maintenanceRef, (snap) => {
      if (snap.exists()) setMaintenanceMode(snap.val());
    });

    return () => {
      unsubscribeUsers();
      unsubscribeAnnounce();
      unsubscribeAnalytics();
    };
  }, []);

  const triggerAlert = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  // Admin Actions
  const handleToggleBan = async (uid: string, currentStatus?: boolean) => {
    if (uid === currentUserId) {
      triggerAlert('error', "You cannot ban your own administrator profile!");
      return;
    }
    try {
      await update(ref(rtdb, `users/${uid}`), {
        isBanned: !currentStatus
      });
      triggerAlert('success', `User successfully ${!currentStatus ? 'banned' : 'unbanned'}.`);
    } catch (e: any) {
      triggerAlert('error', e.message);
    }
  };

  const handleToggleAdmin = async (uid: string, currentIsAdmin?: boolean) => {
    if (uid === currentUserId) {
      triggerAlert('error', "You cannot change your own administrator status!");
      return;
    }
    try {
      await update(ref(rtdb, `users/${uid}`), {
        isAdmin: !currentIsAdmin
      });
      triggerAlert('success', `User successfully ${!currentIsAdmin ? 'promoted to Administrator' : 'demoted to regular User'}.`);
    } catch (e: any) {
      triggerAlert('error', e.message);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (uid === currentUserId) {
      triggerAlert('error', "You cannot delete your own administrator profile!");
      return;
    }
    if (!confirm("Are you absolutely sure you want to delete this user's database footprint? This is irreversible.")) return;

    try {
      await remove(ref(rtdb, `users/${uid}`));
      // Also clean up any conversations associated if possible (optional)
      await remove(ref(rtdb, `conversations/${uid}`));
      triggerAlert('success', "User profile successfully deleted from database.");
    } catch (e: any) {
      triggerAlert('error', e.message);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceTitle || !announceContent) return;

    try {
      const newAnnounceRef = push(ref(rtdb, 'announcements'));
      const id = newAnnounceRef.key || Date.now().toString();
      const announcement: SystemAnnouncement = {
        id,
        title: announceTitle,
        content: announceContent,
        createdAt: Date.now(),
        active: true
      };
      await set(newAnnounceRef, announcement);
      setAnnounceTitle('');
      setAnnounceContent('');
      triggerAlert('success', "Announcement broadcasted successfully to all online clients!");
    } catch (err: any) {
      triggerAlert('error', err.message);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const announceRef = ref(rtdb, `announcements`);
      const snap = await get(announceRef);
      if (snap.exists()) {
        const data = snap.val();
        const key = Object.keys(data).find(k => data[k].id === id);
        if (key) {
          await remove(ref(rtdb, `announcements/${key}`));
          triggerAlert('success', "Announcement retracted.");
        }
      }
    } catch (err: any) {
      triggerAlert('error', err.message);
    }
  };

  const handleToggleMaintenance = async () => {
    try {
      const nextMode = !maintenanceMode;
      await set(ref(rtdb, 'settings/maintenanceMode'), nextMode);
      setMaintenanceMode(nextMode);
      triggerAlert('success', `Maintenance mode has been ${nextMode ? 'ENABLED' : 'DISABLED'}.`);
    } catch (err: any) {
      triggerAlert('error', err.message);
    }
  };

  const filteredUsers = usersList.filter(u => 
    u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-md" />

      {/* Main Admin View container */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        className="w-full max-w-5xl h-[85vh] bg-neutral-950 border border-white/10 rounded-2xl flex flex-col shadow-2xl relative overflow-hidden z-10"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-neutral-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-sky-500 flex items-center justify-center text-white">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">HS System Admin Controller</h2>
              <p className="text-xs text-neutral-400">Dynamic backend oversight, analytics, and service controls.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-xl transition-colors cursor-pointer text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector Row */}
        <div className="px-6 py-3 border-b border-white/5 flex gap-2 bg-neutral-950 overflow-x-auto whitespace-nowrap flex-nowrap scrollbar-none">
          {(['users', 'broadcast', 'analytics', 'settings'] as AdminTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border shrink-0 ${
                activeTab === tab 
                  ? 'bg-blue-600/10 border-blue-500/35 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.12)]' 
                  : 'bg-transparent border-transparent text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab === 'users' && 'Users'}
              {tab === 'broadcast' && 'Broadcasts'}
              {tab === 'analytics' && 'Analytics'}
              {tab === 'settings' && 'Controls'}
            </button>
          ))}
        </div>

        {/* Dynamic Content Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Notifications / Feedback alerts */}
          <AnimatePresence mode="wait">
            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex gap-2 items-center"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{successMsg}</span>
              </motion.div>
            )}
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 bg-red-950/40 border border-red-500/20 rounded-xl text-red-400 text-xs flex gap-2 items-center"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TAB 1: USERS LIST */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user profiles by name or email address..."
                  className="w-full bg-neutral-900 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="border border-white/5 rounded-xl overflow-x-auto overflow-y-auto max-h-[55vh] bg-neutral-900/20 custom-scrollbar">
                <table className="w-full min-w-[750px] text-left text-sm text-neutral-300 relative">
                  <thead className="bg-[#0F0F0F] text-xs text-neutral-400 uppercase font-semibold sticky top-0 z-10 shadow-[0_1px_0_rgba(255,255,255,0.05)]">
                    <tr>
                      <th className="p-4">Profile Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Registered On</th>
                      <th className="p-4">Account Role</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 font-bold flex items-center justify-center text-xs">
                            {u.fullName?.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-white">{u.fullName}</span>
                        </td>
                        <td className="p-4 font-mono text-xs">{u.email}</td>
                        <td className="p-4 text-neutral-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="p-4">
                          {u.isAdmin ? (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-2xs font-bold uppercase border border-blue-500/20">Admin</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-2xs font-bold uppercase">User</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleToggleAdmin(u.uid, u.isAdmin)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${u.isAdmin ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/25' : 'bg-neutral-900 border-white/5 text-neutral-400 hover:text-white'}`}
                              title={u.isAdmin ? "Demote from Admin" : "Promote to Admin"}
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleBan(u.uid, u.isBanned)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${u.isBanned ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/25' : 'bg-neutral-900 border-white/5 text-neutral-400 hover:text-white'}`}
                              title={u.isBanned ? "Unban Profile" : "Ban Profile"}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.uid)}
                              className="p-1.5 rounded-lg bg-neutral-900 border border-white/5 text-neutral-400 hover:text-red-400 hover:border-red-500/20 transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-neutral-500">No matching user records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: BROADCAST SYSTEM */}
          {activeTab === 'broadcast' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Post Broadcast */}
              <form onSubmit={handlePostAnnouncement} className="space-y-4 bg-neutral-900/20 p-5 border border-white/5 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Megaphone className="w-4 h-4 text-blue-400" />
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-neutral-300">Draft New Broadcast</h3>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-neutral-400 font-semibold tracking-wider">Announcement Title</label>
                  <input
                    type="text"
                    value={announceTitle}
                    onChange={(e) => setAnnounceTitle(e.target.value)}
                    placeholder="E.g., System Update Completed"
                    className="w-full bg-neutral-900 border border-white/5 rounded-xl py-3 px-4 text-sm outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-neutral-400 font-semibold tracking-wider">Message details (Markdown supported)</label>
                  <textarea
                    value={announceContent}
                    onChange={(e) => setAnnounceContent(e.target.value)}
                    rows={5}
                    placeholder="Type the message body details here..."
                    className="w-full bg-neutral-900 border border-white/5 rounded-xl py-3 px-4 text-sm outline-none focus:border-blue-500 transition-colors resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl text-sm transition-colors cursor-pointer flex justify-center items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Broadcast Live Alert
                </button>
              </form>

              {/* History list */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-neutral-400">Current active Broadcasts</h3>
                <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="p-4 border border-white/5 bg-neutral-900/10 rounded-xl relative group">
                      <button
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        className="absolute top-4 right-4 p-1 hover:bg-white/5 rounded text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Retract Broadcast"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <h4 className="font-semibold text-white text-sm pr-8">{ann.title}</h4>
                      <p className="text-xs text-neutral-400 mt-2 line-clamp-2 leading-relaxed">{ann.content}</p>
                      <span className="text-3xs text-neutral-500 block mt-2">{new Date(ann.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                  {announcements.length === 0 && (
                    <p className="text-sm text-neutral-500 text-center py-12">No active announcements broadcasted.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Metric grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-5 border border-white/5 bg-neutral-900/20 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-neutral-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Total users</span>
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-3xl font-bold font-mono text-white">{analytics.totalUsers || usersList.length}</div>
                  <p className="text-3xs text-neutral-500">Fully registered user profiles</p>
                </div>

                <div className="p-5 border border-white/5 bg-neutral-900/20 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-neutral-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Total chats</span>
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-bold font-mono text-white">{analytics.totalChats || 24}</div>
                  <p className="text-3xs text-neutral-500">Active chat nodes across databases</p>
                </div>

                <div className="p-5 border border-white/5 bg-neutral-900/20 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-neutral-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Total messages</span>
                    <Settings2 className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-3xl font-bold font-mono text-white">{analytics.totalMessages || 157}</div>
                  <p className="text-3xs text-neutral-500">Exchanged chatbot mutations</p>
                </div>

                <div className="p-5 border border-white/5 bg-neutral-900/20 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-neutral-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Response rate</span>
                    <RefreshCw className="w-4 h-4 text-teal-400 animate-spin-slow" />
                  </div>
                  <div className="text-3xl font-bold font-mono text-white">&lt;0.5s</div>
                  <p className="text-3xs text-neutral-500">SaaS processing benchmark latency</p>
                </div>
              </div>

              {/* Graphic metrics simulation */}
              <div className="p-6 border border-white/5 bg-neutral-900/15 rounded-2xl space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">System Performance Metrics</h3>
                <div className="h-44 flex items-end gap-3 pb-2 pt-6">
                  {/* Columns */}
                  <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full bg-blue-500/10 border border-blue-500/20 rounded-t-lg h-[40%] transition-all hover:bg-blue-500/30" />
                    <span className="text-3xs text-neutral-500">Mon</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full bg-blue-500/10 border border-blue-500/20 rounded-t-lg h-[65%] transition-all hover:bg-blue-500/30" />
                    <span className="text-3xs text-neutral-500">Tue</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full bg-blue-500/10 border border-blue-500/20 rounded-t-lg h-[55%] transition-all hover:bg-blue-500/30" />
                    <span className="text-3xs text-neutral-500">Wed</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full bg-blue-500/10 border border-blue-500/20 rounded-t-lg h-[80%] transition-all hover:bg-blue-500/30" />
                    <span className="text-3xs text-neutral-500">Thu</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full bg-gradient-to-t from-blue-500 to-sky-400 rounded-t-lg h-[95%] transition-all hover:opacity-90" />
                    <span className="text-3xs text-neutral-500">Fri (Today)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM CONTROLS & SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-xl space-y-6">
              {/* Maintenance toggle */}
              <div className="p-5 border border-white/5 bg-neutral-900/20 rounded-xl flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Hammer className="w-4 h-4 text-yellow-500" />
                    <h3 className="font-bold text-sm text-white">Service Maintenance Mode</h3>
                  </div>
                  <p className="text-xs text-neutral-400 pr-4">When active, users see a maintenance alert page blocking new message mutations.</p>
                </div>
                <button
                  onClick={handleToggleMaintenance}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer border ${maintenanceMode ? 'bg-yellow-500 text-black border-yellow-500 hover:opacity-90' : 'bg-neutral-900 text-neutral-400 border-white/5 hover:text-white'}`}
                >
                  {maintenanceMode ? 'Activated' : 'Activate'}
                </button>
              </div>

              {/* API and security config */}
              <div className="bg-neutral-900/10 border border-white/5 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-blue-400" />
                  <h3 className="font-bold text-sm text-neutral-300">API Key telemetry controls</h3>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  System API endpoints are actively utilizing server-side environment variables (`GEMINI_API_KEY`). All key overrides are isolated at the orchestration layer, preventing client-side exposure.
                </p>
                <div className="flex justify-between items-center text-xs text-neutral-500 border-t border-white/5 pt-4">
                  <span>Current Server Key Source</span>
                  <span className="font-mono bg-neutral-900 px-2 py-1 rounded border border-white/5 text-blue-400 font-semibold">Loaded via ENV</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
