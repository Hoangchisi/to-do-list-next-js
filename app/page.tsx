'use client'; // Quan trọng: Bắt buộc dùng trong Next.js App Router

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Edit2, Calendar, CheckCircle, 
  Search, LogOut, ArrowUpDown, Layout, User as UserIcon 
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
// Lưu ý: Trong dự án thật, bạn dùng process.env.NEXT_PUBLIC_...
const firebaseConfig = JSON.parse((window as any).__firebase_config || '{}');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// Hack nhỏ để lấy appId trong môi trường sandbox
const appId = (window as any).__app_id || 'default-app-id';


// --- 3. COMPONENTS ---

// --- Auth Component ---
interface AuthScreenProps {
  onLogin?: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = () => {
  const [isRegister, setIsRegister] = useState<boolean>(false);
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

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Todo Pro (TS)</h1>
          <p className="text-slate-500 mt-2">{isRegister ? 'Tạo tài khoản mới' : 'Đăng nhập để tiếp tục'}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-slate-700">Tên hiển thị</label>
              <input 
                type="text" 
                required 
                className="mt-1 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input 
              type="email" 
              required 
              className="mt-1 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Mật khẩu</label>
            <input 
              type="password" 
              required 
              className="mt-1 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            {loading ? 'Đang xử lý...' : (isRegister ? 'Đăng ký' : 'Đăng nhập')}
          </button>
        </form>

        <div className="mt-4 text-center">
            <button 
                onClick={handleGoogleLogin}
                className="text-sm text-slate-500 hover:text-blue-600 flex items-center justify-center w-full gap-2 border p-2 rounded-lg"
            >
               <Layout size={16}/> Đăng nhập Google (Demo)
            </button>
        </div>
        
        <p className="mt-6 text-center text-sm text-slate-600">
          {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} 
          <button 
            onClick={() => setIsRegister(!isRegister)}
            className="ml-1 text-blue-600 hover:underline font-medium"
          >
            {isRegister ? 'Đăng nhập' : 'Đăng ký ngay'}
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
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    const taskRef = doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id);
    
    await updateDoc(taskRef, {
      status: newStatus,
      completedAt: newStatus === 'done' ? serverTimestamp() : null
    });
  };

  const deleteTask = async (taskId: string) => {
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
            <h1 className="text-xl font-bold text-slate-800 hidden sm:block">Todo Manager TS</h1>
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
              placeholder="Tìm tên công việc..." 
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
                  {f === 'all' ? 'Tất cả' : f === 'todo' ? 'Chưa xong' : f === 'done' ? 'Đã xong' : 'Quá hạn'}
                </button>
              ))}
            </div>

            <select 
              className="px-3 py-2 bg-slate-100 text-sm font-medium text-slate-600 rounded-lg outline-none border-none cursor-pointer hover:bg-slate-200"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
            >
              <option value="createAt">Ngày tạo</option>
              <option value="deadline">Hạn chót</option>
              <option value="name">Tên</option>
              <option value="status">Trạng thái</option>
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
            <div className="text-center py-12 text-slate-400">Đang tải dữ liệu...</div>
          ) : processedTasks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200">
               <div className="inline-block p-4 bg-slate-50 rounded-full mb-3 text-slate-400">
                <Layout size={32} />
              </div>
              <p className="text-slate-500">Chưa có công việc nào.</p>
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
                      <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Quá hạn</span>
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
              {editingTask ? 'Chỉnh sửa' : 'Thêm mới'}
            </h2>
            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên công việc</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Hạn chót</label>
                <input 
                  type="datetime-local" 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={closeModal} className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg">Hủy</button>
                <button type="submit" className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">{editingTask ? 'Lưu' : 'Tạo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}