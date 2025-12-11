'use client'; // Quan trọng: Bắt buộc dùng trong Next.js App Router

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Edit2, Calendar, CheckCircle, 
  Search, LogOut, ArrowUpDown, Layout, User as UserIcon,
  CheckCircle2, ArrowRight, Zap, Shield 
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  signInWithCustomToken,
  signInAnonymously,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

// --- 1. TYPE DEFINITIONS (Điểm khác biệt chính của TS) ---

// Định nghĩa kiểu dữ liệu cho Task
interface Task {
  id: string;
  userId: string;
  name: string;
  status: 'todo' | 'done';
  createAt: Date;
  deadline: Date | null;
  completedAt: Date | null;
  // Trường ảo dùng cho UI, không lưu trong DB
  displayStatus?: 'late' | 'todo' | 'done'; 
}

// Định nghĩa các loại Filter
type FilterType = 'all' | 'todo' | 'done' | 'late';
type SortType = 'createAt' | 'deadline' | 'name' | 'completedAt' | 'status';
type SortOrder = 'asc' | 'desc';

// --- 2. FIREBASE CONFIGURATION ---

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
// Kiểm tra xem config có hợp lệ không trước khi init
if (!firebaseConfig.apiKey) {
  // Silent fallback or log if needed, checking explicitly to avoid runtime errors if env is missing
  // console.error("Firebase Config Error");
}

// Initialize safely
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Đặt tên cố định cho app của bạn thay vì lấy dynamic id
const appId = 'todo-app-production'; 


// --- 3. COMPONENTS ---

// --- Auth Component ---
interface AuthScreenProps {
  onLogin?: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = () => {
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false); // State để chuyển đổi giữa Landing và Login Form
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message?.replace('Firebase: ', '') || 'Lỗi đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
       console.error("Google Auth Error:", err);
       setError("Google login yêu cầu domain thật. Đang chuyển sang chế độ Demo...");
       setTimeout(() => signInAnonymously(auth), 1000);
    }
  };

  // Nút Button tùy chỉnh để thay thế shadcn/ui button
  const CustomButton = ({ children, onClick, variant = 'primary', className = '' }: any) => {
    const baseStyle = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50";
    const variants = {
      primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
      outline: "border border-slate-200 bg-white hover:bg-slate-100 text-slate-900",
      ghost: "hover:bg-slate-100 text-slate-700"
    };
    const sizes = "h-10 px-4 py-2"; // default size
    
    return (
      <button 
        onClick={onClick}
        className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${sizes} ${className}`}
      >
        {children}
      </button>
    );
  };

  // Nếu đang ở màn hình Landing (chưa bấm Get Started/Sign In)
  if (!showForm) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
        {/* Navigation */}
        <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="font-bold text-2xl flex items-center gap-2 text-slate-800">
            <CheckCircle2 className="text-blue-600 w-8 h-8" />
            <span>My Tasks</span>
          </div>
          <div className="flex gap-4">
            <CustomButton onClick={() => setShowForm(true)}>
              Sign In
            </CustomButton>
          </div>
        </nav>
  
        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center justify-center text-center px-4 animate-fade-in pb-16">
          <div className="space-y-8 max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight tracking-tight">
              Organize your life, <br />
              <span className="text-blue-600">one task at a time.</span>
            </h1>
            
            <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
              The simple, elegant to-do list application designed to help you stay focused and get more done without the clutter.
            </p>
  
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button 
                onClick={() => setShowForm(true)}
                className="inline-flex items-center justify-center h-14 px-8 rounded-full text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 hover:-translate-y-1"
              >
                Start for free <ArrowRight className="ml-2 w-5 h-5" />
              </button>
            </div>
            
            {/* Feature Grid Mockup */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-white/20 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <CheckCircle2 className="text-blue-600 w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-slate-800">Simple Tasks</h3>
                <p className="text-slate-500 leading-relaxed">Create and manage tasks with an intuitive interface designed for clarity.</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-white/20 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
                  <Zap className="text-amber-500 w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-slate-800">Fast & Fluid</h3>
                <p className="text-slate-500 leading-relaxed">Built for speed so you spend less time managing and more time doing.</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-white/20 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-4">
                  <Shield className="text-green-600 w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-slate-800">Secure</h3>
                <p className="text-slate-500 leading-relaxed">Your data is authenticated via Google & Firebase securely.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Màn hình Form Đăng nhập (Hiện ra khi bấm Start/Sign In)
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-200/30 rounded-full blur-3xl"></div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10 border border-white/50 animate-in fade-in zoom-in duration-300">
        <button 
          onClick={() => setShowForm(false)}
          className="absolute top-4 left-4 text-slate-400 hover:text-slate-600"
        >
          ← Back
        </button>

        <div className="text-center mb-8 mt-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-blue-600 mb-4">
            <CheckCircle2 size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isRegister ? 'Create an account' : 'Welcome back'}
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            {isRegister ? 'Enter your details to get started' : 'Please enter your details to sign in'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
            <div className="w-1 h-1 bg-red-500 rounded-full"></div>
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
              <input 
                type="text" 
                required 
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input 
              type="email" 
              required 
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input 
              type="password" 
              required 
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200 shadow-md shadow-blue-500/20"
          >
            {loading ? 'Processing...' : (isRegister ? 'Create account' : 'Sign in')}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 bg-white/80 text-slate-400 font-medium">Or continue with</span>
            </div>
          </div>
          <button 
            onClick={handleGoogleLogin}
            className="mt-6 w-full flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-4 rounded-lg transition-all"
          >
            <Layout className="w-4 h-4" /> Google
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-slate-600">
          {isRegister ? 'Already have an account?' : "Don't have an account?"} 
          <button 
            onClick={() => setIsRegister(!isRegister)}
            className="ml-1 text-blue-600 hover:text-blue-700 font-semibold hover:underline"
          >
            {isRegister ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  // State Types
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // UI State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Filter & Sort State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('createAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Form State
  const [taskName, setTaskName] = useState<string>('');
  const [deadline, setDeadline] = useState<string>('');

  // --- AUTH & DATA FETCHING ---
  useEffect(() => {
    // Sandbox helper logic
    const initAuth = async () => {
      const token = (window as any).__initial_auth_token;
      if (token) await signInWithCustomToken(auth, token);
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setTasks([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = collection(db, 'artifacts', appId, 'users', user.uid, 'tasks');
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const fetchedTasks: Task[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: user.uid,
            name: data.name,
            status: data.status,
            // Convert Firestore Timestamp to JS Date safely
            createAt: data.createAt instanceof Timestamp ? data.createAt.toDate() : new Date(),
            deadline: data.deadline ? new Date(data.deadline) : null,
            completedAt: data.completedAt instanceof Timestamp ? data.completedAt.toDate() : null,
          } as Task;
        });
        setTasks(fetchedTasks);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching tasks:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // --- HANDLERS ---
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !taskName.trim()) return;

    const taskData = {
      name: taskName,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      userId: user.uid,
    };

    try {
      if (editingTask) {
        const taskRef = doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', editingTask.id);
        await updateDoc(taskRef, taskData);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'), {
          ...taskData,
          status: 'todo',
          createAt: serverTimestamp(),
          completedAt: null
        });
      }
      closeModal();
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Có lỗi xảy ra khi lưu công việc");
    }
  };

  const toggleStatus = async (task: Task) => {
    // FIX: Kiểm tra user tồn tại trước khi dùng user.uid
    if (!user) return; 

    const newStatus = task.status === 'done' ? 'todo' : 'done';
    const taskRef = doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id);
    
    await updateDoc(taskRef, {
      status: newStatus,
      completedAt: newStatus === 'done' ? serverTimestamp() : null
    });
  };

  const deleteTask = async (taskId: string) => {
    // FIX: Kiểm tra user tồn tại trước khi dùng user.uid
    if (!user) return;

    if(!window.confirm("Bạn có chắc chắn muốn xóa không?")) return;
    const taskRef = doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId);
    await deleteDoc(taskRef);
  };

  const openModal = (task: Task | null = null) => {
    if (task) {
      setEditingTask(task);
      setTaskName(task.name);
      // Format Date object to YYYY-MM-DDTHH:mm string for input
      const d = task.deadline;
      if (d) {
        // Handle timezone offset simply
        const offset = d.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
        setDeadline(localISOTime);
      } else {
        setDeadline('');
      }
    } else {
      setEditingTask(null);
      setTaskName('');
      setDeadline('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  // --- SEARCH & SORT LOGIC ---
  const processedTasks = useMemo(() => {
    let result = [...tasks];
    const now = new Date();

    // 1. Calc Display Status
    result = result.map(t => {
      let displayStatus: Task['displayStatus'] = t.status;
      if (t.status !== 'done' && t.deadline && t.deadline < now) {
        displayStatus = 'late';
      }
      return { ...t, displayStatus };
    });

    // 2. Search
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(lowerTerm));
    }

    // 3. Filter
    if (statusFilter !== 'all') {
        if (statusFilter === 'late') {
            result = result.filter(t => t.displayStatus === 'late');
        } else {
            result = result.filter(t => t.status === statusFilter);
        }
    }

    // 4. Sort
    result.sort((a, b) => {
      let valA: number | string, valB: number | string;
      // Helper to handle null dates safely
      const getTime = (d: Date | null) => d ? d.getTime() : (sortOrder === 'asc' ? 9999999999999 : 0);

      switch (sortBy) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'deadline':
          valA = getTime(a.deadline);
          valB = getTime(b.deadline);
          break;
        case 'completedAt':
          valA = getTime(a.completedAt);
          valB = getTime(b.completedAt);
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        default: // createAt
          valA = getTime(a.createAt);
          valB = getTime(b.createAt);
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [tasks, searchTerm, statusFilter, sortBy, sortOrder]);

  if (!user) return <AuthScreen />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <CheckCircle size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 hidden sm:block">My Tasks - Manage your tasks</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={16} />
                )}
              </div>
              <span className="hidden sm:inline font-medium">{user.displayName || user.email}</span>
            </div>
            <button 
              onClick={() => signOut(auth)}
              className="p-2 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-full transition"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Controls */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search task..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              {(['all', 'todo', 'done', 'late'] as FilterType[]).map((f) => (
                <button 
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition capitalize 
                    ${statusFilter === f ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                >
                  {f === 'all' ? 'All' : f === 'todo' ? 'Pending' : f === 'done' ? 'Done' : 'Overdue'}
                </button>
              ))}
            </div>

            <select 
              className="px-3 py-2 bg-slate-100 text-sm font-medium text-slate-600 rounded-lg outline-none border-none cursor-pointer hover:bg-slate-200"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
            >
              <option value="createAt">Add first</option>
              <option value="deadline">Deadline</option>
              <option value="name">Task name</option>
              <option value="status">Status</option>
            </select>

            <button 
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
            >
              <ArrowUpDown size={18} />
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading...</div>
          ) : processedTasks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200">
               <div className="inline-block p-4 bg-slate-50 rounded-full mb-3 text-slate-400">
                <Layout size={32} />
              </div>
              <p className="text-slate-500">No tasks yet. Try add one.</p>
            </div>
          ) : (
            processedTasks.map(task => (
              <div 
                key={task.id} 
                className={`group bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 transition hover:shadow-md ${task.status === 'done' ? 'opacity-70 bg-slate-50' : ''}`}
              >
                <button 
                  onClick={() => toggleStatus(task)}
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition 
                    ${task.status === 'done' 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : 'border-slate-300 text-transparent hover:border-blue-500'}`}
                >
                  <CheckCircle size={14} fill="currentColor" />
                </button>

                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-slate-800 truncate ${task.status === 'done' ? 'line-through text-slate-500' : ''}`}>
                    {task.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                    {task.deadline && (
                      <span className={`flex items-center gap-1 ${task.displayStatus === 'late' ? 'text-red-500 font-medium' : ''}`}>
                        <Calendar size={12} />
                        {task.deadline.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'})}
                      </span>
                    )}
                    {task.displayStatus === 'late' && (
                      <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Overdue</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => openModal(task)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <button 
        onClick={() => openModal()}
        className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition hover:scale-110"
      >
        <Plus size={24} />
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-slate-800">
              {editingTask ? 'Edit task' : 'Add task'}
            </h2>
            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task name</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
                <input 
                  type="datetime-local" 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={closeModal} className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">{editingTask ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}