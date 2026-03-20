import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, handleFirestoreError, OperationType, UserProfile } from '../context/AuthContext';
import { ShieldCheck, User, Mail, Clock, Check, X, Loader2, Users, Trash2, Calendar, Search, MessageCircle, Settings } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp, deleteDoc, updateDoc, Timestamp, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AdminPanel({ onBack }: { onBack?: () => void }) {
  const { user, language } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'system'>('overview');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userSessions, setUserSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [musicUrl, setMusicUrl] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userData = snapshot.docs.map(doc => ({ ...doc.data() })) as UserProfile[];
      setUsers(userData);
      setLoadingUsers(false);
    });

    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'music');
        const docSnap = await getDocs(query(collection(db, 'settings'), where('__name__', '==', 'music')));
        if (!docSnap.empty) {
          setMusicUrl(docSnap.docs[0].data().url || '');
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchSettings();

    return () => { unsubUsers(); };
  }, []);

  const stats = {
    totalUsers: users.length,
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'music'), {
        url: musicUrl,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      }, { merge: true });
      showToast(language === 'vi' ? 'Đã lưu cài đặt hệ thống' : 'System settings saved');
    } catch (err) {
      console.error('Error saving settings:', err);
      showToast(language === 'vi' ? 'Lỗi khi lưu cài đặt' : 'Error saving settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };
  const fetchUserSessions = async (uid: string) => {
    setLoadingSessions(true);
    try {
      const q = query(
        collection(db, 'chats', uid, 'sessions'),
        orderBy('updatedAt', 'desc'),
        limit(5)
      );
      const snapshot = await getDocs(q);
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUserSessions(sessions);
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      showToast(language === 'vi' ? 'Lỗi khi tải lịch sử' : 'Error loading history', 'error');
    } finally {
      setLoadingSessions(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-[110] font-bold text-white",
              toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
            )}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400">
              <X className="w-6 h-6" />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{language === 'vi' ? 'Bảng quản trị' : 'Admin Panel'}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{language === 'vi' ? 'Quản lý hệ thống và người dùng' : 'Manage system and users'}</p>
          </div>
        </div>
        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <button onClick={() => setActiveTab('overview')} className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200')}>{language === 'vi' ? 'Tổng quan' : 'Overview'}</button>
          <button onClick={() => setActiveTab('users')} className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200')}>{language === 'vi' ? 'Người dùng' : 'Users'}</button>
          <button onClick={() => setActiveTab('system')} className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'system' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200')}>{language === 'vi' ? 'Hệ thống' : 'System'}</button>
        </div>
      </header>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard icon={<Users className="w-6 h-6" />} label={language === 'vi' ? 'Tổng người dùng' : 'Total Users'} value={stats.totalUsers} color="bg-blue-500" />
          </div>
        </div>
      )}
      
      {activeTab === 'system' && (
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-8">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-6 h-6 text-blue-600" />
                {language === 'vi' ? 'Cấu hình Nhạc nền' : 'Background Music Configuration'}
              </h3>
              <p className="text-sm text-slate-500">
                {language === 'vi' 
                  ? 'Nhập URL của tệp âm thanh (mp3, wav) để phát trên toàn hệ thống.' 
                  : 'Enter the URL of the audio file (mp3, wav) to play system-wide.'}
              </p>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{language === 'vi' ? 'URL Nhạc' : 'Music URL'}</label>
                <input 
                  type="text" 
                  value={musicUrl}
                  onChange={(e) => setMusicUrl(e.target.value)}
                  placeholder="https://example.com/music.mp3"
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
              >
                {savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                {language === 'vi' ? 'Lưu cấu hình' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder={language === 'vi' ? 'Tìm kiếm người dùng (tên, email)...' : 'Search users (name, email)...'} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              />
            </div>
            <div className="text-sm text-slate-500">
              {language === 'vi' ? 'Hiển thị' : 'Showing'} <span className="font-bold text-slate-900 dark:text-white">{filteredUsers.length}</span> {language === 'vi' ? 'người dùng' : 'users'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 text-[10px] uppercase font-bold">
                  <tr>
                    <th className="px-6 py-4">{language === 'vi' ? 'Người dùng' : 'User'}</th>
                    <th className="px-6 py-4 text-right">{language === 'vi' ? 'Hành động' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {filteredUsers.map(u => (
                    <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer" onClick={() => {
                      setSelectedUser(u);
                      fetchUserSessions(u.uid);
                    }}>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            className="text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1 rounded-lg transition-all"
                          >
                            {language === 'vi' ? 'Xem chi tiết' : 'View Details'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <AnimatePresence>
            {selectedUser && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                onClick={() => setSelectedUser(null)}
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedUser.name}</h3>
                        <p className="text-sm text-slate-500">{selectedUser.email}</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                      <X className="w-6 h-6 text-slate-400" />
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        {language === 'vi' ? 'Lịch sử trò chuyện gần đây' : 'Recent Chat History'}
                      </h4>
                      {loadingSessions ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {userSessions.map(session => (
                            <div key={session.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[70%]">{session.title || (language === 'vi' ? 'Không có tiêu đề' : 'No title')}</span>
                                <span className="text-[10px] text-slate-400">{session.updatedAt?.toDate().toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-slate-500 truncate">{session.lastMessage || (language === 'vi' ? 'Chưa có tin nhắn' : 'No messages')}</p>
                            </div>
                          ))}
                          {userSessions.length === 0 && (
                            <p className="text-center py-8 text-slate-400 italic">{language === 'vi' ? 'Chưa có lịch sử trò chuyện' : 'No chat history'}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
      <div className={`w-12 h-12 ${color} text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-opacity-20`}>
        {icon}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}
