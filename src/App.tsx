import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  HeartHandshake, 
  Ambulance, 
  ClipboardList, 
  AlertTriangle, 
  TrendingDown,
  ChevronRight,
  Plus,
  BarChart3,
  Settings,
  LogOut,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  Trash2,
  RefreshCw,
  Key,
  Info,
  Activity,
  Lock,
  PlusSquare,
  Heart,
  ShieldAlert,
  Pill,
  Stethoscope,
  Check,
  X,
  Shield,
  Users,
  UserCheck,
  Upload,
  UserPlus,
  Palette,
  Save,
  Database,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDocFromServer } from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { db, auth } from './firebase';

// --- Types ---
interface Summary {
  totalItems: number;
  expiringSoon: number;
  lowStock: number;
  donationsCount: number;
}

interface Item {
  id: string;
  name: string;
  batch: string;
  expiry_date: string;
  quantity: number;
  min_stock: number;
  is_donation: number;
  category: string;
}

interface AmbulanceData {
  id: string;
  name: string;
  status: string;
  items?: any[];
}

interface Order {
  id: string;
  type: string;
  item_name: string;
  quantity: number;
  status: string;
  created_at: string;
}

// --- Helpers ---
function getExpiryStatus(expiryDateStr: string | undefined | null) {
  if (!expiryDateStr) return { daysLeft: null, isClose: false, isCritical: false, colorClass: '', label: '' };
  
  const today = new Date();
  const todayTime = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Safely parse "YYYY-MM-DD"
  const parts = expiryDateStr.split('-');
  let expiryTime = 0;
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-based month
    const day = parseInt(parts[2], 10);
    expiryTime = Date.UTC(year, month, day);
  } else {
    const expiry = new Date(expiryDateStr);
    expiryTime = Date.UTC(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  }
  
  const diffTime = expiryTime - todayTime;
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (daysLeft < 0) {
    return {
      daysLeft,
      isExpired: true,
      isClose: true,
      isCritical: true,
      label: `Vencido há ${Math.abs(daysLeft)} dia(s)`,
      colorClass: 'text-red-400 bg-red-950/40 border-red-900/60'
    };
  } else if (daysLeft <= 30) {
    return {
      daysLeft,
      isExpired: false,
      isClose: true,
      isCritical: true,
      label: `Vence em ${daysLeft} dias! (Crítico)`,
      colorClass: 'text-red-400 bg-red-950/20 border-red-900/40 animate-pulse'
    };
  } else if (daysLeft <= 60) {
    return {
      daysLeft,
      isExpired: false,
      isClose: true,
      isCritical: false,
      label: `Vence em ${daysLeft} dias. (Atenção)`,
      colorClass: 'text-amber-400 bg-amber-950/20 border-amber-900/40'
    };
  }
  
  return {
    daysLeft,
    isExpired: false,
    isClose: false,
    isCritical: false,
    label: `Vence em ${daysLeft} dias.`,
    colorClass: 'text-slate-400'
  };
}

const LogoIcon = ({ iconName, size = 24, className = "" }: { iconName: string; size?: number; className?: string }) => {
  switch (iconName) {
    case 'PlusSquare': return <PlusSquare size={size} className={className} />;
    case 'Activity': return <Activity size={size} className={className} />;
    case 'Heart': return <Heart size={size} className={className} />;
    case 'ShieldAlert': return <ShieldAlert size={size} className={className} />;
    case 'HeartHandshake': return <HeartHandshake size={size} className={className} />;
    case 'Stethoscope': return <Stethoscope size={size} className={className} />;
    case 'Shield': return <Shield size={size} className={className} />;
    case 'Pill':
    default:
      return <Pill size={size} className={className} />;
  }
};

const getColorClasses = (color: string) => {
  switch (color) {
    case 'blue':
      return {
        text: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        primaryBg: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700',
        accentBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
        accentText: 'text-blue-500',
        badge: 'text-blue-400 font-mono',
        indicatorBg: 'border-t-2 border-blue-500',
        glow: 'bg-blue-500/5',
        focusRing: 'focus:ring-blue-500/20 focus:border-blue-500'
      };
    case 'indigo':
      return {
        text: 'text-indigo-400',
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20',
        primaryBg: 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700',
        accentBg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
        accentText: 'text-indigo-500',
        badge: 'text-indigo-400 font-mono',
        indicatorBg: 'border-t-2 border-indigo-500',
        glow: 'bg-indigo-500/5',
        focusRing: 'focus:ring-indigo-500/20 focus:border-indigo-500'
      };
    case 'violet':
      return {
        text: 'text-violet-400',
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/20',
        primaryBg: 'bg-violet-600 hover:bg-violet-500 active:bg-violet-700',
        accentBg: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
        accentText: 'text-violet-500',
        badge: 'text-violet-400 font-mono',
        indicatorBg: 'border-t-2 border-violet-500',
        glow: 'bg-violet-500/5',
        focusRing: 'focus:ring-violet-500/20 focus:border-violet-500'
      };
    case 'rose':
      return {
        text: 'text-rose-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20',
        primaryBg: 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700',
        accentBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
        accentText: 'text-rose-500',
        badge: 'text-rose-400 font-mono',
        indicatorBg: 'border-t-2 border-rose-500',
        glow: 'bg-rose-500/5',
        focusRing: 'focus:ring-rose-500/20 focus:border-rose-500'
      };
    case 'emerald':
    default: // emerald
      return {
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        primaryBg: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700',
        accentBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        accentText: 'text-emerald-500',
        badge: 'text-emerald-400 font-mono',
        indicatorBg: 'border-t-2 border-emerald-500',
        glow: 'bg-emerald-500/5',
        focusRing: 'focus:ring-emerald-500/20 focus:border-emerald-500'
      };
  }
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [reportTab, setReportTab] = useState('geral');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [inventory, setInventory] = useState<Item[]>([]);
  const [ambulances, setAmbulances] = useState<AmbulanceData[]>([]);
  const [alerts, setAlerts] = useState<Item[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Authentication State
  const [user, setUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  // Dynamic branding and role states
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPendingAuthorization, setIsPendingAuthorization] = useState(false);
  const [systemSettings, setSystemSettings] = useState({
    systemName: 'PharmaStock SaaS',
    logoType: 'icon' as 'icon' | 'url',
    logoValue: 'Pill',
    primaryColor: 'emerald' as 'emerald' | 'blue' | 'indigo' | 'violet' | 'rose'
  });
  const [appUsers, setAppUsers] = useState<any[]>([]);
  const [settingsActiveSubTab, setSettingsActiveSubTab] = useState<'branding' | 'users' | 'createUser' | 'maintenance'>('branding');

  // Form states for creating a user
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Operador' | 'Administrador'>('Operador');
  const [newUserStatus, setNewUserStatus] = useState<'Autorizado' | 'Pendente'>('Autorizado');
  const [newUserMsg, setNewUserMsg] = useState({ type: '', text: '' });

  // Settings save state
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'inventory' | 'order' | 'ambulance'>('inventory');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  // Ambulance registered cargo state
  const [selectedAmbulance, setSelectedAmbulance] = useState<any | null>(null);
  const [ambItemName, setAmbItemName] = useState('');
  const [ambItemCategory, setAmbItemCategory] = useState<'Medicamento' | 'Material' | 'Equipamento'>('Medicamento');
  const [ambItemQuantity, setAmbItemQuantity] = useState(1);
  const [ambItemBatch, setAmbItemBatch] = useState('');
  const [ambItemExpiry, setAmbItemExpiry] = useState('');
  const [ambItemFilter, setAmbItemFilter] = useState<'Todos' | 'Medicamento' | 'Material' | 'Equipamento'>('Todos');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Clearing / Reset State
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  useEffect(() => {
    if (activeTab === 'settings' && !isAdmin && user) {
      setActiveTab('dashboard');
    }
  }, [activeTab, isAdmin, user]);

  // Auth Observer
  useEffect(() => {
    const localUserSession = localStorage.getItem('pharmastock_user_session');
    if (localUserSession) {
      try {
        const parsed = JSON.parse(localUserSession);
        setUser(parsed);
        setAuthLoading(false);
        return;
      } catch (err) {
        console.error("Local user session parse failed", err);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      const localSession = localStorage.getItem('pharmastock_user_session');
      if (currentUser) {
        setUser(currentUser);
      } else if (!localSession) {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid || null,
        email: auth.currentUser?.email || null,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  const testConnection = async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
    }
  };

  const fetchSettingsAndUsers = async (currentUser: any) => {
    try {
      // 1. Fetch system settings
      try {
        const settingsSnapshot = await getDocs(collection(db, 'settings'));
        if (!settingsSnapshot.empty) {
          const sysDoc = settingsSnapshot.docs.find(d => d.id === 'system' || d.data().systemName);
          if (sysDoc) {
            setSystemSettings(sysDoc.data() as any);
          }
        } else {
          // Setup initial default doc in localStorage/state if empty
          const initialSettings = {
            systemName: 'PharmaStock SaaS',
            logoType: 'icon' as const,
            logoValue: 'Pill',
            primaryColor: 'emerald' as const
          };
          setSystemSettings(initialSettings);
        }
      } catch (settingsErr) {
        console.warn("Could not fetch settings from Firestore, using LocalStorage:", settingsErr);
        const localSettings = localStorage.getItem('pharmastock_settings');
        if (localSettings) {
          setSystemSettings(JSON.parse(localSettings));
        }
      }

      // 2. Fetch users
      let usersList: any[] = [];
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        usersList = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Ensure default admin user is in the list
        const hasAdminInList = usersList.some(u => u.email === 'sinron@pharmastock.com' || u.email === 'sinron');
        if (!hasAdminInList) {
          const initialAdmin = {
            email: 'sinron@pharmastock.com',
            role: 'Administrador',
            status: 'Autorizado',
            createdAt: new Date().toISOString()
          };
          await addDoc(collection(db, 'users'), initialAdmin);
          usersList.push(initialAdmin);
        }
        
        setAppUsers(usersList);
        localStorage.setItem('pharmastock_users', JSON.stringify(usersList));
      } catch (usersErr) {
        console.warn("Could not fetch users from Firestore, using LocalStorage:", usersErr);
        const localUsers = localStorage.getItem('pharmastock_users');
        if (localUsers) {
          usersList = JSON.parse(localUsers);
        } else {
          usersList = [
            { id: 'u1', email: 'sinron@pharmastock.com', role: 'Administrador', status: 'Autorizado', createdAt: new Date().toISOString() }
          ];
          localStorage.setItem('pharmastock_users', JSON.stringify(usersList));
        }
        setAppUsers(usersList);
      }

      // 3. Verify currentUser authorization status
      if (currentUser) {
        const email = currentUser.email || '';
        const isSuperAdmin = email === 'sinron@pharmastock.com' || email === 'sinron' || email.split('@')[0] === 'sinron';
        
        if (isSuperAdmin) {
          setIsPendingAuthorization(false);
          setIsAdmin(true);
        } else {
          const matchedUser = usersList.find(u => u.email.toLowerCase() === email.toLowerCase() || u.email.split('@')[0].toLowerCase() === email.toLowerCase());
          if (matchedUser) {
            if (matchedUser.role === 'Administrador' || matchedUser.status === 'Autorizado') {
              setIsPendingAuthorization(false);
              setIsAdmin(matchedUser.role === 'Administrador');
            } else {
              setIsPendingAuthorization(true);
            }
          } else {
            // Self-registered user not in collection yet, auto-add as Pendente
            const newUserRecord = {
              email: email,
              role: 'Operador' as const,
              status: 'Pendente' as const,
              createdAt: new Date().toISOString()
            };
            try {
              await addDoc(collection(db, 'users'), newUserRecord);
            } catch (addErr) {
              console.warn("Failed to save new user to Firestore:", addErr);
            }
            usersList.push(newUserRecord);
            setAppUsers([...usersList]);
            localStorage.setItem('pharmastock_users', JSON.stringify(usersList));
            setIsPendingAuthorization(true);
          }
        }
      }
    } catch (err) {
      console.error("Error in fetchSettingsAndUsers:", err);
    }
  };

  const fetchData = async () => {
    try {
      await testConnection();

      const bDontSeed = localStorage.getItem('pharmastock_dont_auto_seed') === 'true';

      // 1. Fetch Inventory Items
      let inv: Item[] = [];
      try {
        const inventoryCol = collection(db, 'inventory');
        let inventorySnapshot = await getDocs(inventoryCol);

        // Seed if empty AND not blocked by clean flag
        if (inventorySnapshot.empty && !bDontSeed) {
          const seedItems = [
            { name: "Amoxicilina 500mg", batch: "A123", expiry_date: "2026-03-25", quantity: 150, min_stock: 20, is_donation: 0, category: "Antibiótico" },
            { name: "Dipirona Sódica", batch: "B456", expiry_date: "2026-06-10", quantity: 8, min_stock: 15, is_donation: 0, category: "Analgésico" },
            { name: "Paracetamol 750mg", batch: "C789", expiry_date: "2026-04-15", quantity: 200, min_stock: 30, is_donation: 1, category: "Analgésico" },
            { name: "Soro Fisiológico 500ml", batch: "S001", expiry_date: "2027-01-01", quantity: 50, min_stock: 10, is_donation: 0, category: "Material" }
          ];
          for (const item of seedItems) {
            await addDoc(inventoryCol, item);
          }
          inventorySnapshot = await getDocs(inventoryCol);
        }
        inv = inventorySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any;
        localStorage.setItem('pharmastock_inventory', JSON.stringify(inv));
      } catch (err) {
        console.warn("Firestore retrieve inventory failed, falling back to LocalStorage:", err);
        const localInv = localStorage.getItem('pharmastock_inventory');
        if (localInv) {
          inv = JSON.parse(localInv);
        } else if (!bDontSeed) {
          inv = [
            { id: "s1", name: "Amoxicilina 500mg", batch: "A123", expiry_date: "2026-03-25", quantity: 150, min_stock: 20, is_donation: 0, category: "Antibiótico" },
            { id: "s2", name: "Dipirona Sódica", batch: "B456", expiry_date: "2026-06-10", quantity: 8, min_stock: 15, is_donation: 0, category: "Analgésico" },
            { id: "s3", name: "Paracetamol 750mg", batch: "C789", expiry_date: "2026-04-15", quantity: 200, min_stock: 30, is_donation: 1, category: "Analgésico" },
            { id: "s4", name: "Soro Fisiológico 500ml", batch: "S001", expiry_date: "2027-01-01", quantity: 50, min_stock: 10, is_donation: 0, category: "Material" }
          ];
          localStorage.setItem('pharmastock_inventory', JSON.stringify(inv));
        }
      }

      // 2. Fetch Ambulances
      let amb: AmbulanceData[] = [];
      try {
        const ambulanceCol = collection(db, 'ambulances');
        let ambulanceSnapshot = await getDocs(ambulanceCol);

        // Seed if empty AND not blocked by clean flag
        if (ambulanceSnapshot.empty && !bDontSeed) {
          const seedAmbulances = [
            { name: "Ambulância 01 - UTI", status: "Equipada" },
            { name: "Ambulância 02 - Básica", status: "Reposição Necessária" },
            { name: "Ambulância 03 - Suporte", status: "Equipada" }
          ];
          for (const a of seedAmbulances) {
            await addDoc(ambulanceCol, a);
          }
          ambulanceSnapshot = await getDocs(ambulanceCol);
        }
        amb = ambulanceSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any;
        localStorage.setItem('pharmastock_ambulances', JSON.stringify(amb));
      } catch (err) {
        console.warn("Firestore retrieve ambulances failed, falling back to LocalStorage:", err);
        const localAmb = localStorage.getItem('pharmastock_ambulances');
        if (localAmb) {
          amb = JSON.parse(localAmb);
        } else if (!bDontSeed) {
          amb = [
            { id: "a1", name: "Ambulância 01 - UTI", status: "Equipada", items: [] },
            { id: "a2", name: "Ambulância 02 - Básica", status: "Reposição Necessária", items: [] },
            { id: "a3", name: "Ambulância 03 - Suporte", status: "Equipada", items: [] }
          ];
          localStorage.setItem('pharmastock_ambulances', JSON.stringify(amb));
        }
      }

      // 3. Fetch Orders
      let ord: Order[] = [];
      try {
        const ordersCol = collection(db, 'orders');
        let ordersSnapshot = await getDocs(ordersCol);

        // Seed if empty AND not blocked by clean flag
        if (ordersSnapshot.empty && !bDontSeed) {
          const seedOrders = [
            { type: "Pedido", item_name: "Gaze Estéril", quantity: 100, status: "Concluído", created_at: new Date(Date.now() - 86400000).toISOString() },
            { type: "Devolução", item_name: "Seringa 5ml", quantity: 20, status: "Pendente", created_at: new Date().toISOString() }
          ];
          for (const order of seedOrders) {
            await addDoc(ordersCol, order);
          }
          ordersSnapshot = await getDocs(ordersCol);
        }
        ord = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any;
        localStorage.setItem('pharmastock_orders', JSON.stringify(ord));
      } catch (err) {
        console.warn("Firestore retrieve orders failed, falling back to LocalStorage:", err);
        const localOrd = localStorage.getItem('pharmastock_orders');
        if (localOrd) {
          ord = JSON.parse(localOrd);
        } else if (!bDontSeed) {
          ord = [
            { id: "o1", type: "Pedido", item_name: "Gaze Estéril", quantity: 100, status: "Concluído", created_at: new Date(Date.now() - 86400000).toISOString() },
            { id: "o2", type: "Devolução", item_name: "Seringa 5ml", quantity: 20, status: "Pendente", created_at: new Date().toISOString() }
          ];
          localStorage.setItem('pharmastock_orders', JSON.stringify(ord));
        }
      }

      // Sort orders descending by created_at
      ord.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // 4. Calculate stats
      const totalCentralItems = inv.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
      const totalAmbItems = amb.reduce((acc, a) => {
        const items = a.items || [];
        return acc + items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);
      }, 0);
      const totalItems = totalCentralItems + totalAmbItems;

      const lowStock = inv.filter(item => (item.quantity ?? 0) < (item.min_stock ?? 5)).length;
      const donationsCount = inv.filter(item => item.is_donation === 1).length;
      
      const centralExpiring = inv.filter(item => {
        const status = getExpiryStatus(item.expiry_date);
        return status.isClose;
      }).length;
      const ambExpiring = amb.reduce((acc, a) => {
        const items = a.items || [];
        return acc + items.filter((item: any) => {
          const status = getExpiryStatus(item.expiry_date);
          return status.isClose;
        }).length;
      }, 0);
      const expiringSoon = centralExpiring + ambExpiring;

      const sum: Summary = {
        totalItems,
        expiringSoon,
        lowStock,
        donationsCount
      };

      // 5. Filter Alerts
      const centralAlerts = inv.filter(item => {
        const status = getExpiryStatus(item.expiry_date);
        const isLow = (item.quantity ?? 0) < (item.min_stock ?? 5);
        return status.isClose || isLow;
      });
      const ambAlerts: any[] = [];
      amb.forEach(a => {
        const items = a.items || [];
        items.forEach((item: any) => {
          const status = getExpiryStatus(item.expiry_date);
          if (status.isClose) {
            ambAlerts.push({
              id: `${a.id}_alert_${item.id}`,
              name: `${item.name} (${a.name})`,
              batch: item.batch,
              expiry_date: item.expiry_date,
              quantity: item.quantity,
              min_stock: 0,
              is_donation: 0,
              category: item.category
            });
          }
        });
      });
      const alrt = [...centralAlerts, ...ambAlerts];

      // 6. Generate Category Distribution logic
      const categoryMap: { [key: string]: number } = {};
      inv.forEach(item => {
        const cat = item.category || 'Medicamento';
        categoryMap[cat] = (categoryMap[cat] || 0) + (item.quantity || 0);
      });
      amb.forEach(a => {
        const items = a.items || [];
        items.forEach((item: any) => {
          const cat = item.category || 'Medicamento';
          categoryMap[cat] = (categoryMap[cat] || 0) + (Number(item.quantity) || 0);
        });
      });
      const rep = Object.keys(categoryMap).map(key => ({
        name: key,
        value: categoryMap[key]
      }));

      setSummary(sum);
      setInventory(inv);
      setAmbulances(amb);
      setAlerts(alrt);
      setOrders(ord);
      setReportData(rep);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSettingsAndUsers(user).then(() => {
        fetchData();
      });
    } else {
      setIsAdmin(false);
      setIsPendingAuthorization(false);
    }
  }, [user]);

  // Helper to allow simple username login by auto-converting to a generic domain if no @ is present
  const resolveEmail = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    if (trimmed.includes('@')) {
      return trimmed;
    }
    return `${trimmed}@pharmastock.com`;
  };

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const resolvedEmail = resolveEmail(authEmail);

    // Strict default admin validation
    if (resolvedEmail === 'sinron@pharmastock.com' || authEmail.trim().toLowerCase() === 'sinron') {
      if (authPassword !== '@Bky3735192') {
        setAuthError("Senha incorreta para o usuário administrador 'sinron'.");
        return;
      }
      const adminUser = {
        email: 'sinron@pharmastock.com',
        uid: 'admin_sinron',
        isLocal: true
      };
      localStorage.setItem('pharmastock_user_session', JSON.stringify(adminUser));
      setUser(adminUser);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, resolvedEmail, authPassword);
    } catch (err: any) {
      console.warn("Sign-in attempt failed:", err?.message || err);
      const errStr = err?.message || '';
      const errorCode = err?.code || '';
      
      // If the email/password sign-in provider is disabled or not configured in Firebase console, 
      // gracefully fail over to a local session fallback so the user is never locked out of testing!
      if (errorCode === 'auth/operation-not-allowed' || errStr.includes('operation-not-allowed')) {
        console.warn("Firebase Email/Password Auth is disabled. Falling back to secure local session.");
        const fallbackUser = {
          email: resolvedEmail,
          uid: 'local_user_' + Math.random().toString(36).substring(2, 11),
          isLocal: true
        };
        localStorage.setItem('pharmastock_user_session', JSON.stringify(fallbackUser));
        setUser(fallbackUser);
        return;
      }

      // If user doesn't exist, automatically register them to make access extremely seamless!
      if (
        errStr.includes('user-not-found') || 
        errStr.includes('invalid-credential') || 
        errStr.includes('auth/invalid-credential') ||
        errStr.includes('auth/user-not-found')
      ) {
        try {
          await createUserWithEmailAndPassword(auth, resolvedEmail, authPassword);
          return; // Successful auto-registration and login
        } catch (regErr: any) {
          console.warn("Auto-registration attempt failed:", regErr?.message || regErr);
          const regErrStr = regErr?.message || '';
          const regErrorCode = regErr?.code || '';
          if (regErrorCode === 'auth/operation-not-allowed' || regErrStr.includes('operation-not-allowed')) {
            const fallbackUser = {
              email: resolvedEmail,
              uid: 'local_user_' + Math.random().toString(36).substring(2, 11),
              isLocal: true
            };
            localStorage.setItem('pharmastock_user_session', JSON.stringify(fallbackUser));
            setUser(fallbackUser);
            return;
          }
        }
      }
      setAuthError('Credenciais inválidas. Use no mínimo 6 caracteres para a senha.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const resolvedEmail = resolveEmail(authEmail);

    if (resolvedEmail === 'sinron@pharmastock.com' || authEmail.trim().toLowerCase() === 'sinron') {
      setAuthError("O usuário administrador padrão 'sinron' é reservado e não pode ser recriado.");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, resolvedEmail, authPassword);
      alert('Cadastro realizado com sucesso!');
      setIsRegistering(false);
    } catch (err: any) {
      console.warn("Register attempt failed:", err?.message || err);
      const errStr = err?.message || '';
      const errorCode = err?.code || '';
      if (errorCode === 'auth/operation-not-allowed' || errStr.includes('operation-not-allowed')) {
        const fallbackUser = {
          email: resolvedEmail,
          uid: 'local_user_' + Math.random().toString(36).substring(2, 11),
          isLocal: true
        };
        localStorage.setItem('pharmastock_user_session', JSON.stringify(fallbackUser));
        setUser(fallbackUser);
        alert('Cadastro realizado localmente (Serviço de autenticação Firebase offline/desabilitado).');
        return;
      }
      setAuthError(err.message?.includes('weak-password') ? 'A senha deve conter no mínimo 6 caracteres.' : 'Erro ao cadastrar. Verifique os dados ou tente um nome diferente.');
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('pharmastock_user_session');
      try {
        await signOut(auth);
      } catch (fErr) {
        console.warn("Ignored Firebase signOut error", fErr);
      }
      setUser(null);
      setInventory([]);
      setSummary(null);
      setSearchTerm('');
    } catch (err) {
      console.error("Erro ao sair:", err);
    }
  };

  // --- System Settings & User Authorization Handlers ---
  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsMsg('');

    try {
      try {
        const settingsCol = collection(db, 'settings');
        const settingsSnap = await getDocs(settingsCol);
        const sysDoc = settingsSnap.docs.find(d => d.id === 'system' || d.data().systemName);
        if (sysDoc) {
          await updateDoc(doc(db, 'settings', sysDoc.id), systemSettings);
        } else {
          await addDoc(settingsCol, systemSettings);
        }
        setSettingsMsg('Configurações salvas com sucesso no Firebase!');
      } catch (fErr) {
        console.warn("Could not write settings to Firestore, saving to LocalStorage fallback:", fErr);
        setSettingsMsg('Configurações salvas localmente no navegador.');
      }

      localStorage.setItem('pharmastock_settings', JSON.stringify(systemSettings));
      document.title = systemSettings.systemName;
      setTimeout(() => setSettingsMsg(''), 4000);
    } catch (err) {
      console.error("Error saving settings:", err);
      setSettingsMsg('Erro ao salvar as configurações.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleToggleAuthorizeUser = async (userToUpdate: any) => {
    const newStatus = userToUpdate.status === 'Autorizado' ? 'Pendente' : 'Autorizado';
    const updatedUsers = appUsers.map(u => u.email === userToUpdate.email ? { ...u, status: newStatus } : u);
    setAppUsers(updatedUsers);
    localStorage.setItem('pharmastock_users', JSON.stringify(updatedUsers));

    try {
      if (userToUpdate.id) {
        await updateDoc(doc(db, 'users', userToUpdate.id), { status: newStatus });
      } else {
        const usersSnap = await getDocs(collection(db, 'users'));
        const docToUpdate = usersSnap.docs.find(d => d.data().email === userToUpdate.email);
        if (docToUpdate) {
          await updateDoc(doc(db, 'users', docToUpdate.id), { status: newStatus });
        }
      }
    } catch (err) {
      console.warn("Could not synchronize user status toggle with Firebase:", err);
    }
  };

  const handleToggleUserRole = async (userToUpdate: any) => {
    const newRole = userToUpdate.role === 'Administrador' ? 'Operador' : 'Administrador';
    const updatedUsers = appUsers.map(u => u.email === userToUpdate.email ? { ...u, role: newRole } : u);
    setAppUsers(updatedUsers);
    localStorage.setItem('pharmastock_users', JSON.stringify(updatedUsers));

    try {
      if (userToUpdate.id) {
        await updateDoc(doc(db, 'users', userToUpdate.id), { role: newRole });
      } else {
        const usersSnap = await getDocs(collection(db, 'users'));
        const docToUpdate = usersSnap.docs.find(d => d.data().email === userToUpdate.email);
        if (docToUpdate) {
          await updateDoc(doc(db, 'users', docToUpdate.id), { role: newRole });
        }
      }
    } catch (err) {
      console.warn("Could not synchronize user role toggle with Firebase:", err);
    }
  };

  const handleDeleteAppUser = async (userToDelete: any) => {
    if (userToDelete.email === 'sinron@pharmastock.com' || userToDelete.email === 'sinron') {
      alert("O usuário administrador principal 'sinron' não pode ser excluído.");
      return;
    }

    if (!confirm(`Deseja realmente excluir o usuário ${userToDelete.email}?`)) {
      return;
    }

    const updatedUsers = appUsers.filter(u => u.email !== userToDelete.email);
    setAppUsers(updatedUsers);
    localStorage.setItem('pharmastock_users', JSON.stringify(updatedUsers));

    try {
      if (userToDelete.id) {
        await deleteDoc(doc(db, 'users', userToDelete.id));
      } else {
        const usersSnap = await getDocs(collection(db, 'users'));
        const docToDelete = usersSnap.docs.find(d => d.data().email === userToDelete.email);
        if (docToDelete) {
          await deleteDoc(doc(db, 'users', docToDelete.id));
        }
      }
    } catch (err) {
      console.warn("Could not delete user document from Firebase:", err);
    }
  };

  const handleAdminCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewUserMsg({ type: '', text: '' });

    const emailToCreate = resolveEmail(newUserEmail);
    if (!emailToCreate || newUserPassword.length < 6) {
      setNewUserMsg({ type: 'error', text: 'Insira um e-mail válido e senha com no mínimo 6 caracteres.' });
      return;
    }

    const emailLower = emailToCreate.toLowerCase();
    const alreadyExists = appUsers.some(u => u.email.toLowerCase() === emailLower);
    if (alreadyExists) {
      setNewUserMsg({ type: 'error', text: 'Este usuário já está cadastrado no sistema.' });
      return;
    }

    try {
      let registeredInAuth = false;
      const newUserObj: any = {
        email: emailToCreate,
        role: newUserRole,
        status: newUserStatus,
        createdAt: new Date().toISOString()
      };

      try {
        await createUserWithEmailAndPassword(auth, emailToCreate, newUserPassword);
        registeredInAuth = true;
      } catch (authErr: any) {
        console.warn("Could not register user in Firebase Auth directly (or already registered):", authErr);
      }

      try {
        const docRef = await addDoc(collection(db, 'users'), newUserObj);
        newUserObj.id = docRef.id;
      } catch (dbErr) {
        console.warn("Could not save user to Firestore, continuing with local fallback:", dbErr);
      }

      const updatedUsers = [...appUsers, newUserObj];
      setAppUsers(updatedUsers);
      localStorage.setItem('pharmastock_users', JSON.stringify(updatedUsers));

      setNewUserMsg({
        type: 'success',
        text: `Usuário '${emailToCreate}' criado com sucesso${registeredInAuth ? ' e registrado no Firebase Auth' : ' localmente'}!`
      });

      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
    } catch (err: any) {
      console.warn("Error in admin user creation:", err);
      setNewUserMsg({ type: 'error', text: `Erro: ${err?.message || String(err)}` });
    }
  };

  // Truncate / Reset Database Feature
  const handleClearDatabase = async () => {
    if (!isAdmin) {
      alert("Apenas o usuário administrador 'sinron' tem permissão para realizar esta operação.");
      return;
    }

    setIsClearing(true);
    try {
      // Delete inventory documents
      try {
        const invCol = collection(db, 'inventory');
        const invSnap = await getDocs(invCol);
        for (const itemDoc of invSnap.docs) {
          await deleteDoc(doc(db, 'inventory', itemDoc.id));
        }
      } catch (err) {
        console.warn("Could not delete inventory from Firestore gracefully:", err);
      }

      // Delete ambulances documents
      try {
        const ambCol = collection(db, 'ambulances');
        const ambSnap = await getDocs(ambCol);
        for (const itemDoc of ambSnap.docs) {
          await deleteDoc(doc(db, 'ambulances', itemDoc.id));
        }
      } catch (err) {
        console.warn("Could not delete ambulances from Firestore gracefully:", err);
      }

      // Delete orders documents
      try {
        const ordCol = collection(db, 'orders');
        const ordSnap = await getDocs(ordCol);
        for (const itemDoc of ordSnap.docs) {
          await deleteDoc(doc(db, 'orders', itemDoc.id));
        }
      } catch (err) {
        console.warn("Could not delete orders from Firestore gracefully:", err);
      }

      // Ensure seeding won't execute on reload
      localStorage.setItem('pharmastock_dont_auto_seed', 'true');

      // Clear local states
      localStorage.setItem('pharmastock_inventory', JSON.stringify([]));
      localStorage.setItem('pharmastock_ambulances', JSON.stringify([]));
      localStorage.setItem('pharmastock_orders', JSON.stringify([]));

      // Clear design layouts
      setInventory([]);
      setAmbulances([]);
      setOrders([]);
      setAlerts([]);
      setSummary({
        totalItems: 0,
        expiringSoon: 0,
        lowStock: 0,
        donationsCount: 0
      });
      setReportData([]);
      setShowClearConfirm(false);

      alert("Sistema limpo com sucesso! Pronto para realizar novos lançamentos do zero.");
    } catch (err) {
      console.error("Erro ao limpar dados:", err);
      alert("Houve um erro ao processar a limpeza do banco de dados.");
    } finally {
      setIsClearing(false);
    }
  };

  // Restore Default Seeds (for convenience/testing)
  const handleRestoreDefaults = async () => {
    if (!isAdmin) {
      alert("Apenas o usuário administrador 'sinron' tem permissão para realizar esta operação.");
      return;
    }

    setIsClearing(true);
    try {
      // Try to clear Firestore so fresh seeding triggers on fetch
      try {
        const invCol = collection(db, 'inventory');
        const invSnap = await getDocs(invCol);
        for (const itemDoc of invSnap.docs) {
          await deleteDoc(doc(db, 'inventory', itemDoc.id));
        }
        const ambCol = collection(db, 'ambulances');
        const ambSnap = await getDocs(ambCol);
        for (const itemDoc of ambSnap.docs) {
          await deleteDoc(doc(db, 'ambulances', itemDoc.id));
        }
        const ordCol = collection(db, 'orders');
        const ordSnap = await getDocs(ordCol);
        for (const itemDoc of ordSnap.docs) {
          await deleteDoc(doc(db, 'orders', itemDoc.id));
        }
      } catch (err) {
        console.warn("Could not clear Firestore before restore:", err);
      }

      localStorage.removeItem('pharmastock_dont_auto_seed');
      localStorage.removeItem('pharmastock_inventory');
      localStorage.removeItem('pharmastock_ambulances');
      localStorage.removeItem('pharmastock_orders');

      setShowRestoreConfirm(false);
      await fetchData();
      alert("Dados de exemplo restaurados com sucesso!");
    } catch (err) {
      console.error(err);
    } finally {
      setIsClearing(false);
    }
  };

  const handleOpenModal = (type: 'inventory' | 'order' | 'ambulance', item: any = null) => {
    setModalType(type);
    setEditingItem(item);
    if (type === 'inventory') {
      setFormData(item || { name: '', batch: '', expiry_date: '', quantity: 0, min_stock: 5, is_donation: 0, category: 'Medicamento' });
    } else if (type === 'order') {
      setFormData({ type: 'Pedido', item_name: '', quantity: 1 });
    } else if (type === 'ambulance') {
      setFormData(item || { name: '', status: 'Equipada' });
    }
    setIsModalOpen(true);
  };

  const handleAddAmbulanceItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAmbulance) return;
    if (!ambItemName.trim()) {
      alert("Por favor, preencha o nome do insumo.");
      return;
    }

    const newItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: ambItemName.trim(),
      category: ambItemCategory,
      quantity: Number(ambItemQuantity) || 1,
      batch: ambItemBatch.trim() || 'N/A',
      expiry_date: ambItemExpiry || 'N/V'
    };

    const currentItems = selectedAmbulance.items || [];
    const updatedItems = [...currentItems, newItem];

    try {
      const ambDoc = doc(db, 'ambulances', selectedAmbulance.id);
      await updateDoc(ambDoc, {
        items: updatedItems
      });
    } catch (err) {
      console.warn("Could not save to Firebase (local/fallback active):", err);
    }

    const updatedAmbulances = ambulances.map((a: any) => 
      a.id === selectedAmbulance.id ? { ...a, items: updatedItems } : a
    );
    setAmbulances(updatedAmbulances);
    setSelectedAmbulance({ ...selectedAmbulance, items: updatedItems });

    // Reset inputs
    setAmbItemName('');
    setAmbItemBatch('');
    setAmbItemExpiry('');
    setAmbItemQuantity(1);
  };

  const handleUpdateAmbulanceItemQty = async (itemId: string, increment: number) => {
    if (!selectedAmbulance) return;
    const currentItems = selectedAmbulance.items || [];
    const updatedItems = currentItems.map((item: any) => {
      if (item.id === itemId) {
        const newQty = Math.max(1, item.quantity + increment);
        return { ...item, quantity: newQty };
      }
      return item;
    });

    try {
      const ambDoc = doc(db, 'ambulances', selectedAmbulance.id);
      await updateDoc(ambDoc, {
        items: updatedItems
      });
    } catch (err) {
      console.warn("Could not save layout updates to Firebase:", err);
    }

    const updatedAmbulances = ambulances.map((a: any) => 
      a.id === selectedAmbulance.id ? { ...a, items: updatedItems } : a
    );
    setAmbulances(updatedAmbulances);
    setSelectedAmbulance({ ...selectedAmbulance, items: updatedItems });
  };

  const handleDeleteAmbulanceItem = async (itemId: string, ambId?: string) => {
    const targetAmbId = ambId || (selectedAmbulance ? selectedAmbulance.id : null);
    if (!targetAmbId) return;

    const targetAmb = ambulances.find((a: any) => a.id === targetAmbId);
    if (!targetAmb) return;

    if (!window.confirm(`Deseja realmente remover este item da viatura "${targetAmb.name}"?`)) return;
    const currentItems = targetAmb.items || [];
    const updatedItems = currentItems.filter((item: any) => item.id !== itemId);

    try {
      const ambDoc = doc(db, 'ambulances', targetAmbId);
      await updateDoc(ambDoc, {
        items: updatedItems
      });
    } catch (err) {
      console.warn("Could not delete from Firebase:", err);
    }

    const updatedAmbulances = ambulances.map((a: any) => 
      a.id === targetAmbId ? { ...a, items: updatedItems } : a
    );
    
    // Sync local storage
    localStorage.setItem('pharmastock_ambulances', JSON.stringify(updatedAmbulances));

    setAmbulances(updatedAmbulances);
    if (selectedAmbulance && selectedAmbulance.id === targetAmbId) {
      setSelectedAmbulance({ ...selectedAmbulance, items: updatedItems });
    }
    alert("Item removido da viatura com sucesso!");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalType === 'inventory') {
        if (editingItem) {
          try {
            const itemDoc = doc(db, 'inventory', editingItem.id);
            await updateDoc(itemDoc, {
              name: formData.name,
              batch: formData.batch,
              expiry_date: formData.expiry_date,
              quantity: Number(formData.quantity),
              min_stock: Number(formData.min_stock),
              is_donation: Number(formData.is_donation),
              category: formData.category
            });
          } catch (err) {
            console.warn("Could not write to Firestore (editing locally):", err);
          }

          // Sync local storage
          const localInv = localStorage.getItem('pharmastock_inventory');
          if (localInv) {
            let items = JSON.parse(localInv);
            items = items.map((item: any) => item.id === editingItem.id ? {
              ...item,
              name: formData.name,
              batch: formData.batch,
              expiry_date: formData.expiry_date,
              quantity: Number(formData.quantity),
              min_stock: Number(formData.min_stock),
              is_donation: Number(formData.is_donation),
              category: formData.category
            } : item);
            localStorage.setItem('pharmastock_inventory', JSON.stringify(items));
          }
        } else {
          const newId = 'inv_' + Math.random().toString(36).substring(2, 11);
          const newItemData = {
            name: formData.name,
            batch: formData.batch,
            expiry_date: formData.expiry_date,
            quantity: Number(formData.quantity),
            min_stock: Number(formData.min_stock),
            is_donation: Number(formData.is_donation),
            category: formData.category || 'Medicamento'
          };

          try {
            const itemCol = collection(db, 'inventory');
            await addDoc(itemCol, newItemData);
          } catch (err) {
            console.warn("Could not write to Firestore (saving locally):", err);
          }

          // Sync local storage
          const localInv = localStorage.getItem('pharmastock_inventory');
          const items = localInv ? JSON.parse(localInv) : [];
          items.push({ id: newId, ...newItemData });
          localStorage.setItem('pharmastock_inventory', JSON.stringify(items));
        }
      } else if (modalType === 'order') {
        const newId = 'ord_' + Math.random().toString(36).substring(2, 11);
        const newOrderData = {
          type: formData.type || 'Pedido',
          item_name: formData.item_name,
          quantity: Number(formData.quantity) || 1,
          status: 'Pendente',
          created_at: new Date().toISOString()
        };

        try {
          const orderCol = collection(db, 'orders');
          await addDoc(orderCol, newOrderData);
        } catch (err) {
          console.warn("Could not write to Firestore (saving order locally):", err);
        }

        // Sync local storage
        const localOrd = localStorage.getItem('pharmastock_orders');
        const orders = localOrd ? JSON.parse(localOrd) : [];
        orders.push({ id: newId, ...newOrderData });
        localStorage.setItem('pharmastock_orders', JSON.stringify(orders));
      } else if (modalType === 'ambulance') {
        if (editingItem) {
          try {
            const ambDoc = doc(db, 'ambulances', editingItem.id);
            await updateDoc(ambDoc, {
              status: formData.status
            });
          } catch (err) {
            console.warn("Could not write to Firestore (updating ambulance status locally):", err);
          }

          // Sync local storage
          const localAmb = localStorage.getItem('pharmastock_ambulances');
          if (localAmb) {
            let ambs = JSON.parse(localAmb);
            ambs = ambs.map((a: any) => a.id === editingItem.id ? { ...a, status: formData.status } : a);
            localStorage.setItem('pharmastock_ambulances', JSON.stringify(ambs));
          }
        } else {
          const newId = 'amb_' + Math.random().toString(36).substring(2, 11);
          const newAmbData = {
            name: formData.name,
            status: formData.status || 'Equipada',
            items: []
          };

          try {
            const ambCol = collection(db, 'ambulances');
            await addDoc(ambCol, newAmbData);
          } catch (err) {
            console.warn("Could not write to Firestore (saving ambulance locally):", err);
          }

          // Sync local storage
          const localAmb = localStorage.getItem('pharmastock_ambulances');
          const ambs = localAmb ? JSON.parse(localAmb) : [];
          ambs.push({ id: newId, ...newAmbData });
          localStorage.setItem('pharmastock_ambulances', JSON.stringify(ambs));
        }
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error("Error saving:", err);
    }
  };

  const handleDelete = async (id: string, isCentral?: boolean, ambulanceId?: string, itemIdInAmbulance?: string) => {
    if (!id) return;
    
    if (ambulanceId && itemIdInAmbulance) {
      // It's from an ambulance, delete it from there
      await handleDeleteAmbulanceItem(itemIdInAmbulance, ambulanceId);
      return;
    }

    // Alerta de confirmação solicitado pelo usuário
    const confirmou = window.confirm("⚠️ Tem certeza que deseja excluir permanentemente este insumo do estoque integrado?");
    if (!confirmou) {
      return;
    }

    try {
      // Bloquear sementes/auto-seeding futuros se deletarmos manualmente
      localStorage.setItem('pharmastock_dont_auto_seed', 'true');

      // Tenta deletar do Firestore
      const isMockId = (id.length <= 4 && id.startsWith('s')) || id.startsWith('inv_');
      if (!isMockId) {
        try {
          const itemDoc = doc(db, 'inventory', id);
          await deleteDoc(itemDoc);
        } catch (err) {
          console.warn("Could not delete from Firestore (deleting locally):", err);
        }
      }

      // Sincronizar com local storage
      const localInv = localStorage.getItem('pharmastock_inventory');
      if (localInv) {
        try {
          let items = JSON.parse(localInv);
          items = items.filter((item: any) => item.id !== id);
          localStorage.setItem('pharmastock_inventory', JSON.stringify(items));
        } catch (e) {
          console.error("Error parsing local inventory:", e);
        }
      }

      // Atualizar estado de tela imediatamente para feedback instantâneo
      setInventory(prev => prev.filter(item => item.id !== id));

      await fetchData();
      alert("Insumo excluído com sucesso do estoque!");
    } catch (err) {
      console.error("Error deleting:", err);
      alert("Erro ao excluir o insumo do estoque. Por favor, tente novamente.");
    }
  };

  const handleCompleteOrder = async (id: string) => {
    try {
      let matchedOrder: any = null;

      // Find the order to retrieve details (type, item_name, quantity)
      const localOrd = localStorage.getItem('pharmastock_orders');
      if (localOrd) {
        try {
          const orders = JSON.parse(localOrd);
          matchedOrder = orders.find((o: any) => o.id === id);
        } catch (e) {
          console.error("Error parsing local orders for completing:", e);
        }
      }

      if (matchedOrder) {
        // Adjust the inventory stock
        const localInv = localStorage.getItem('pharmastock_inventory');
        let items = localInv ? JSON.parse(localInv) : [];
        let matchedItem = items.find((item: any) => item.name.toLowerCase() === matchedOrder.item_name.toLowerCase());

        if (matchedItem) {
          const change = matchedOrder.type === 'Pedido' ? -Number(matchedOrder.quantity) : Number(matchedOrder.quantity);
          const oldQty = Number(matchedItem.quantity) || 0;
          matchedItem.quantity = Math.max(0, oldQty + change);

          // Update in Firestore
          const isMockItem = (matchedItem.id.length <= 4 && matchedItem.id.startsWith('s')) || matchedItem.id.startsWith('inv_');
          if (!isMockItem) {
            try {
              const itemDoc = doc(db, 'inventory', matchedItem.id);
              await updateDoc(itemDoc, { quantity: matchedItem.quantity });
            } catch (err) {
              console.warn("Could not sync complete-order quantity updates to Firestore:", err);
            }
          }
        } else {
          // If it's a Return (Devolução) and doesn't exist, we can register/create it in inventory
          if (matchedOrder.type === 'Devolução') {
            const newInvId = 'inv_' + Math.random().toString(36).substring(2, 11);
            const newItemData = {
              name: matchedOrder.item_name,
              batch: 'DEV-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
              expiry_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months from now
              quantity: Number(matchedOrder.quantity) || 0,
              min_stock: 5,
              is_donation: 0,
              category: 'Medicamento'
            };

            try {
              const itemCol = collection(db, 'inventory');
              await addDoc(itemCol, newItemData);
            } catch (err) {
              console.warn("Could not save new inventory item from devolution:", err);
            }

            items.push({ id: newInvId, ...newItemData });
          }
        }

        localStorage.setItem('pharmastock_inventory', JSON.stringify(items));
      }

      // Mark order as completed in Firestore
      try {
        const orderDoc = doc(db, 'orders', id);
        await updateDoc(orderDoc, {
          status: 'Concluído'
        });
      } catch (err) {
        console.warn("Could not complete order in Firestore (completing locally):", err);
      }

      // Sync local storage for orders
      if (localOrd) {
        try {
          let orders = JSON.parse(localOrd);
          orders = orders.map((o: any) => o.id === id ? { ...o, status: 'Concluído' } : o);
          localStorage.setItem('pharmastock_orders', JSON.stringify(orders));
        } catch (e) {
          console.error("Error parsing local orders for sync:", e);
        }
      }

      alert(`Movimentação de "${matchedOrder ? matchedOrder.item_name : ''}" concluída! Estoque integrado atualizado com sucesso.`);
      await fetchData();
    } catch (err) {
      console.error("Error completing order:", err);
    }
  };

  const generatePDF = (type: 'inventory' | 'orders') => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();
    
    if (type === 'inventory') {
      doc.setFontSize(18);
      doc.text('Relatório de Estoque - PharmaStock', 14, 22);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${timestamp}`, 14, 30);
      
      const tableColumn = ["ID", "Nome", "Categoria", "Lote", "Validade", "Status de Vencimento", "Qtd", "Mínimo", "Doação"];
      const tableRows = inventory.map(item => {
        const expiry = getExpiryStatus(item.expiry_date);
        let statusText = 'Sem validade';
        if (expiry.daysLeft !== null) {
          if (expiry.daysLeft < 0) {
            statusText = `VENCIDO (há ${Math.abs(expiry.daysLeft)} dias)`;
          } else {
            statusText = `Vence em ${expiry.daysLeft} dias`;
          }
        }
        return [
          item.id ? item.id.substring(0, 6).toUpperCase() : 'N/A',
          item.name,
          item.category,
          item.batch,
          item.expiry_date || 'N/A',
          statusText,
          item.quantity,
          item.min_stock,
          item.is_donation ? 'Sim' : 'Não'
        ];
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: '#10b981' },
        didParseCell: function(data) {
          if (data.section === 'body') {
            const item = inventory[data.row.index];
            if (item) {
              const expiry = getExpiryStatus(item.expiry_date);
              if (expiry.daysLeft !== null) {
                if (expiry.daysLeft < 0) {
                  // Vencido: vermelho
                  if (data.column.index === 4 || data.column.index === 5) {
                    data.cell.styles.textColor = [220, 38, 38];
                    data.cell.styles.fontStyle = 'bold';
                  }
                } else if (expiry.daysLeft <= 60) {
                  // Entre 30 e 60 dias: amarelo/laranja
                  if (data.column.index === 4 || data.column.index === 5) {
                    data.cell.styles.textColor = [217, 119, 6];
                    data.cell.styles.fontStyle = 'bold';
                  }
                }
              }
            }
          }
        }
      });
      
      doc.save(`estoque_pharmastock_${new Date().getTime()}.pdf`);
    } else {
      doc.setFontSize(18);
      doc.text('Relatório de Movimentações - PharmaStock', 14, 22);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${timestamp}`, 14, 30);
      
      const tableColumn = ["ID", "Tipo", "Item", "Quantidade", "Status", "Data"];
      const tableRows = orders.map(order => [
        order.id ? order.id.substring(0, 6).toUpperCase() : 'N/A',
        order.type,
        order.item_name,
        order.quantity,
        order.status,
        new Date(order.created_at).toLocaleDateString()
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: '#3b82f6' }
      });
      
      doc.save(`movimentacoes_pharmastock_${new Date().getTime()}.pdf`);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Painel Central', icon: LayoutDashboard },
    { id: 'inventory', label: 'Estoque Integrado', icon: Package },
    { id: 'donations', label: 'Doações Recebidas', icon: HeartHandshake },
    { id: 'ambulances', label: 'Frota/Ambulâncias', icon: Ambulance },
    { id: 'orders', label: 'Pedidos & Devoluções', icon: ClipboardList },
    { id: 'reports', label: 'Análises & Relatórios', icon: BarChart3 },
    ...(isAdmin ? [{ id: 'settings', label: 'Configurações', icon: Settings }] : []),
  ];

  const filteredInventory = React.useMemo(() => {
    const list: any[] = [];
    
    // 1. Central Stock Items
    inventory.forEach(item => {
      list.push({
        ...item,
        location: 'Estoque Central',
        isCentral: true
      });
    });

    // 2. Ambulance Items
    ambulances.forEach(amb => {
      const items = amb.items || [];
      items.forEach((item: any) => {
        list.push({
          id: `${amb.id}_${item.id}`,
          name: item.name,
          category: item.category,
          batch: item.batch,
          expiry_date: item.expiry_date,
          quantity: item.quantity,
          min_stock: 0,
          is_donation: 0,
          location: `${amb.name}`,
          isCentral: false,
          ambulanceId: amb.id,
          itemIdInAmbulance: item.id
        });
      });
    });

    return list.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.batch && item.batch.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventory, ambulances, searchTerm]);

  // Authentication Interface
  if (authLoading) {
    const themeColors = getColorClasses(systemSettings.primaryColor);
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#060913] text-white">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className={`border-t-2 rounded-full w-12 h-12 mb-4`}
          style={{ borderTopColor: systemSettings.primaryColor === 'emerald' ? '#10b981' : systemSettings.primaryColor === 'blue' ? '#3b82f6' : systemSettings.primaryColor === 'indigo' ? '#6366f1' : systemSettings.primaryColor === 'violet' ? '#8b5cf6' : '#f43f5e' }}
        />
        <p className={`font-mono text-sm tracking-widest ${themeColors.text}`}>CARREGANDO CONTROLE...</p>
      </div>
    );
  }

  const themeColors = getColorClasses(systemSettings.primaryColor);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#060913] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Glowing Background Orbs */}
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full filter blur-3xl pointer-events-none ${themeColors.glow}`} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full filter blur-3xl pointer-events-none" />

        <div className="w-full max-w-md z-10">
          <div className="flex flex-col items-center mb-8">
            <div className={`p-4 rounded-2xl border shadow-lg shadow-black/20 mb-3 ${themeColors.bg} ${themeColors.border}`}>
              {systemSettings.logoType === 'url' && systemSettings.logoValue ? (
                <img src={systemSettings.logoValue} alt="Logo" className="w-9 h-9 object-contain" referrerPolicy="no-referrer" />
              ) : (
                <LogoIcon iconName={systemSettings.logoValue} size={36} className={themeColors.text} />
              )}
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{systemSettings.systemName}</h1>
            <p className="text-slate-400 text-sm mt-1">Gestão Inteligente de Insumos da Saúde</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl">
            <div className="flex border-b border-slate-800 mb-6">
              <button 
                onClick={() => { setIsRegistering(false); setAuthError(''); }}
                className={`flex-1 pb-3 text-sm font-semibold transition-colors ${!isRegistering ? `${themeColors.text} border-b-2` : 'text-slate-400 hover:text-slate-200'}`}
                style={!isRegistering ? { borderBottomColor: systemSettings.primaryColor === 'emerald' ? '#10b981' : systemSettings.primaryColor === 'blue' ? '#3b82f6' : systemSettings.primaryColor === 'indigo' ? '#6366f1' : systemSettings.primaryColor === 'violet' ? '#8b5cf6' : '#f43f5e' } : {}}
              >
                Entrar
              </button>
              <button 
                onClick={() => { setIsRegistering(true); setAuthError(''); }}
                className={`flex-1 pb-3 text-sm font-semibold transition-colors ${isRegistering ? `${themeColors.text} border-b-2` : 'text-slate-400 hover:text-slate-200'}`}
                style={isRegistering ? { borderBottomColor: systemSettings.primaryColor === 'emerald' ? '#10b981' : systemSettings.primaryColor === 'blue' ? '#3b82f6' : systemSettings.primaryColor === 'indigo' ? '#6366f1' : systemSettings.primaryColor === 'violet' ? '#8b5cf6' : '#f43f5e' } : {}}
              >
                Criar Conta
              </button>
            </div>

            <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Usuário ou E-mail</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: admin ou seu_email@servico.com"
                  className={`w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:ring-2 outline-none text-white text-sm transition-all ${themeColors.focusRing}`}
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Senha de Acesso</label>
                <input 
                  type="password" 
                  required
                  placeholder="******"
                  className={`w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:ring-2 outline-none text-white text-sm transition-all ${themeColors.focusRing}`}
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                />
              </div>

              {authError && (
                <div className="p-3 bg-red-950/30 border border-red-900/40 text-red-400 text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button 
                type="submit"
                className={`w-full py-3 text-white rounded-xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${themeColors.primaryBg}`}
              >
                <Key size={16} />
                <span>{isRegistering ? 'Criar Nova Conta' : 'Conectar com Segurança'}</span>
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-800 text-center text-[11px] text-slate-500 space-y-1 font-mono">
              <p>{systemSettings.systemName} Enterprise • Acesso Criptografado</p>
              <p className="text-slate-600">Direitos reservados - Antonio Sinron Neri</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user && isPendingAuthorization) {
    return (
      <div className="min-h-screen bg-[#060913] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Glowing Background Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/5 rounded-full filter blur-3xl pointer-events-none" />

        <div className="w-full max-w-md z-10 text-center">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-amber-500/10 p-5 rounded-2xl border border-amber-500/20 shadow-lg mb-4 text-amber-400">
              <ShieldAlert size={48} className="animate-pulse" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Acesso Pendente de Autorização</h1>
            <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
              Olá, <span className="text-amber-400 font-bold font-mono">{user.email}</span>! Sua conta foi criada com sucesso, mas está aguardando liberação do administrador.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl space-y-5">
            <p className="text-xs text-slate-300 leading-relaxed text-left">
              O administrador do sistema (<span className="text-emerald-400 font-bold">Antonio Sinron Neri</span>) precisa autorizar seu e-mail no painel de controle antes que você possa acessar o painel do sistema.
            </p>

            <button 
              onClick={handleLogout}
              className="w-full py-3.5 bg-red-950/40 hover:bg-red-900/40 text-red-400 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border border-red-900/30"
            >
              <LogOut size={16} />
              <span>Sair do Sistema</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#060813] text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-68 bg-[#090d1a] border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6">
          <div className={`flex items-center gap-3 font-bold text-xl ${themeColors.text}`}>
            <div className={`p-2.5 rounded-xl shadow-md border ${themeColors.bg} ${themeColors.border}`}>
              {systemSettings.logoType === 'url' && systemSettings.logoValue ? (
                <img src={systemSettings.logoValue} alt="Logo" className="w-[22px] h-[22px] object-contain" referrerPolicy="no-referrer" />
              ) : (
                <LogoIcon iconName={systemSettings.logoValue} size={22} className={themeColors.text} />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="leading-none text-white font-extrabold tracking-tight truncate">{systemSettings.systemName}</span>
              <span className={`text-[10px] font-mono mt-0.5 uppercase tracking-widest ${themeColors.text}`}>Painel Pro</span>
            </div>
          </div>
        </div>

        {/* User Badge */}
        <div className="px-6 py-3 border-y border-slate-800 bg-slate-950/30 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm uppercase bg-slate-800 ${themeColors.text}`}>
            {user.email ? (user.email.includes('@') ? user.email.split('@')[0][0] : user.email[0]) : 'U'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-slate-400 font-mono truncate">
              {user.email && user.email.includes('@') ? user.email.split('@')[0] : user.email}
            </span>
            <span className={`text-[9px] font-bold tracking-wider uppercase ${themeColors.text}`}>
              {isAdmin ? 'Administrador' : 'Operador'}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                ? `${themeColors.accentBg} font-semibold shadow-inner` 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <item.icon size={18} />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/20">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-red-950/20 hover:bg-red-900/30 text-red-400 rounded-xl border border-red-900/30 transition-all font-semibold"
          >
            <LogOut size={16} />
            <span className="text-sm">Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        {/* Glow overlay */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full filter blur-3xl pointer-events-none" />

        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-slate-800 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                {menuItems.find(i => i.id === activeTab)?.label}
              </h1>
              {activeTab === 'dashboard' && (
                <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 text-[10px] rounded-full font-mono font-bold tracking-wider uppercase animate-pulse">
                  <Activity size={10} /> Sistema Online
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-1.5">
              {activeTab === 'dashboard' ? 'Insumos médicos, alertas de validade e controle de viaturas em tempo real.' : `Consulta e organização de ${menuItems.find(i => i.id === activeTab)?.label.toLowerCase()}.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {activeTab !== 'cleaner' && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Pesquisar em tempo real..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}
            {activeTab !== 'dashboard' && activeTab !== 'reports' && activeTab !== 'cleaner' && (
              <button 
                onClick={() => {
                  if (activeTab === 'orders') handleOpenModal('order');
                  else if (activeTab === 'ambulances') handleOpenModal('ambulance');
                  else handleOpenModal('inventory');
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 border border-emerald-500/20 text-sm"
              >
                <Plus size={16} />
                <span>{activeTab === 'orders' ? 'Registrar Pedido' : activeTab === 'ambulances' ? 'Nova Ambulância' : 'Incluir Insumo'}</span>
              </button>
            )}
          </div>
        </header>

        {/* Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              >
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {editingItem ? 'Configurar' : 'Cadastrar'} {modalType === 'inventory' ? 'Item no Estoque' : modalType === 'order' ? 'Pedido/Devolução' : 'Ambulância'}
                  </h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-lg border border-slate-700">
                    <Plus size={18} className="rotate-45" />
                  </button>
                </div>
                <form onSubmit={handleSave} className="p-6 space-y-4">
                  {modalType === 'inventory' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Nome do Medicamento / Material</label>
                        <input 
                          required
                          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-white text-sm"
                          placeholder="Ex: Paracetamol 750mg"
                          value={formData.name || ''} 
                          onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Lote</label>
                          <input 
                            required
                            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-white text-sm font-mono"
                            placeholder="Ex: B2289"
                            value={formData.batch || ''} 
                            onChange={e => setFormData({...formData, batch: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Categoria</label>
                          <select 
                            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-white text-sm"
                            value={formData.category || 'Medicamento'} 
                            onChange={e => setFormData({...formData, category: e.target.value})}
                          >
                            <option>Medicamento</option>
                            <option>Antibiótico</option>
                            <option>Analgésico</option>
                            <option>Material</option>
                            <option>Equipamento</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Quantidade</label>
                          <input 
                            type="number" required
                            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-white text-sm"
                            value={formData.quantity || 0} 
                            onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Estoque Mínimo</label>
                          <input 
                            type="number" required
                            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-white text-sm"
                            value={formData.min_stock || 5} 
                            onChange={e => setFormData({...formData, min_stock: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Data de Vencimento</label>
                        <input 
                          type="date" required
                          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-white text-sm font-mono"
                          value={formData.expiry_date || ''} 
                          onChange={e => setFormData({...formData, expiry_date: e.target.value})}
                        />
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <input 
                          type="checkbox" 
                          id="is_donation"
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 focus:ring-opacity-25 border-slate-800 bg-slate-900"
                          checked={formData.is_donation === 1}
                          onChange={e => setFormData({...formData, is_donation: e.target.checked ? 1 : 0})}
                        />
                        <label htmlFor="is_donation" className="text-sm font-medium text-slate-300">Este material é de Doação?</label>
                      </div>
                    </>
                  )}

                  {modalType === 'order' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Tipo de Movimentação</label>
                        <select 
                          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-white text-sm"
                          value={formData.type || 'Pedido'} 
                          onChange={e => setFormData({...formData, type: e.target.value})}
                        >
                          <option>Pedido</option>
                          <option>Devolução</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Nome do Insumo solicitado</label>
                        <input 
                          required
                          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-white text-sm"
                          placeholder="Ex: Gaze Estéril, Seringa 10ml, etc..."
                          value={formData.item_name || ''} 
                          onChange={e => setFormData({...formData, item_name: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Quantidade Demandada</label>
                        <input 
                          type="number" required min="1"
                          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-white text-sm"
                          value={formData.quantity || 1} 
                          onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})}
                        />
                      </div>
                    </>
                  )}

                  {modalType === 'ambulance' && (
                    <>
                      <div>
                        {editingItem ? (
                          <p className="text-sm text-slate-400 mb-4">Unidade em alteração: <strong className="text-emerald-400">{formData.name}</strong></p>
                        ) : (
                          <div className="mb-4">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Identificação / Nome da Ambulância</label>
                            <input 
                              required
                              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-white text-sm"
                              placeholder="Ex: UTM-04 Suporte Avançado"
                              value={formData.name || ''} 
                              onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                          </div>
                        )}
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Classificação do Status</label>
                        <select 
                          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-white text-sm"
                          value={formData.status || 'Equipada'} 
                          onChange={e => setFormData({...formData, status: e.target.value})}
                        >
                          <option>Equipada</option>
                          <option>Reposição Necessária</option>
                          <option>Em Manutenção</option>
                          <option>Fora de Serviço</option>
                        </select>
                      </div>

                      {editingItem && (
                        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 mt-4">
                          <p className="text-sm text-slate-300 mb-3 flex items-center gap-2"><Info size={16} className="text-blue-400" /> Falta algum insumo nesta unidade?</p>
                          <button 
                            type="button"
                            onClick={() => {
                              setIsModalOpen(false);
                              setTimeout(() => handleOpenModal('order'), 100);
                            }}
                            className="w-full py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl text-xs font-bold border border-blue-500/20 transition-all flex items-center justify-center gap-2"
                          >
                            <ClipboardList size={14} />
                            Despachar Pedido de Reposição
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  <div className="pt-4 flex gap-3 border-t border-slate-800/60 mt-6 bg-slate-950/20 p-2 rounded-xl">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-4 py-2.5 border border-slate-800 text-slate-400 rounded-xl font-bold text-sm hover:text-white hover:bg-slate-800 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 transition-all shadow-lg"
                    >
                      SALVAR
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'dashboard' && (
              <div className="space-y-8 pb-12">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard title="Insumos em Estoque" value={summary?.totalItems || 0} icon={Package} color="blue" />
                  <StatCard title="Em Alerta (60/30 Dias)" value={summary?.expiringSoon || 0} icon={AlertTriangle} color="orange" alert />
                  <StatCard title="Estoque Crítico (< Mínimo)" value={summary?.lowStock || 0} icon={TrendingDown} color="red" alert />
                  <StatCard title="Doações Recebidas" value={summary?.donationsCount || 0} icon={HeartHandshake} color="emerald" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-slate-905 bg-slate-900/40 rounded-2xl border border-slate-800 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                        <AlertTriangle size={20} className="text-amber-500" /> Alertas Críticos de Validade & Estoque
                      </h2>
                      <span className="text-xs text-slate-400 font-mono">Foco Operacional</span>
                    </div>

                    <div className="space-y-4">
                      {alerts.length > 0 ? alerts.map((alert) => {
                        const expiry = getExpiryStatus(alert.expiry_date);
                        const isLow = alert.quantity < alert.min_stock;
                        return (
                          <div key={alert.id} className="flex items-center justify-between p-4 bg-slate-950/40 rounded-xl border border-slate-800/80 hover:border-slate-700/80 transition-all">
                            <div className="flex items-center gap-4">
                              <div className={`p-2.5 rounded-xl border ${
                                isLow 
                                  ? 'bg-red-950/20 text-red-400 border-red-900/30' 
                                  : expiry.isCritical 
                                    ? 'bg-red-950/40 text-red-400 border-red-800/40 animate-pulse' 
                                    : 'bg-amber-950/20 text-amber-400 border-amber-900/30'
                              }`}>
                                {isLow ? <TrendingDown size={18} /> : <AlertTriangle size={18} />}
                              </div>
                              <div>
                                <p className={`font-bold tracking-tight text-white`}>
                                  {alert.name} <span className="text-xs font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded ml-2">Lote: {alert.batch}</span>
                                </p>
                                <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                                  {isLow && (
                                    <span className="font-semibold text-red-400 bg-red-950/10 px-2 py-0.5 rounded">
                                      Quantidade Baixa: {alert.quantity} (Fator Mínimo: {alert.min_stock})
                                    </span>
                                  )}
                                  {!isLow && expiry.isClose && (
                                    <span className={`font-bold px-2 py-0.5 rounded ${expiry.isCritical ? 'text-red-400 bg-red-950/10' : 'text-amber-400 bg-amber-950/10'}`}>
                                      {expiry.label} • Limiar de Expiração ({alert.expiry_date})
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                setActiveTab('inventory');
                                setSearchTerm(alert.name);
                              }}
                              className="bg-slate-900 text-emerald-400 hover:text-emerald-300 font-bold hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 text-xs"
                            >
                              Ver Detalhes <ChevronRight size={14} />
                            </button>
                          </div>
                        );
                      }) : (
                        <div className="p-12 text-center bg-slate-950/10 border border-dashed border-slate-800 rounded-xl">
                          <p className="text-slate-500 text-sm italic">Excelente! Nenhum alerta crítico detectado no momento.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-6 shadow-sm">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                      <Ambulance size={20} className="text-blue-400" /> Frota & Equipes
                    </h2>
                    <div className="space-y-4">
                      {ambulances.map((amb) => {
                        const isUnderRep = amb.status.includes('Reposição');
                        return (
                          <div key={amb.id} className="p-4 border border-slate-800 bg-slate-950/20 rounded-xl hover:border-slate-700/60 transition-all">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2.5">
                                <Ambulance size={18} className="text-slate-400" />
                                <span className="font-bold text-white text-sm">{amb.name}</span>
                              </div>
                              <button 
                                onClick={() => handleOpenModal('ambulance', amb)}
                                className="text-slate-500 hover:text-emerald-400 text-xs"
                              >
                                Alterar
                              </button>
                            </div>
                            <div className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full inline-block ${
                              isUnderRep 
                                ? 'bg-red-950/30 text-red-400 border border-red-900/20' 
                                : 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/20'
                            }`}>
                              {amb.status}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'inventory' && (
              <div className="bg-slate-900/40 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden pb-12">
                <div className="p-6 bg-slate-950/20 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">Relação Total de Insumos</h2>
                    <p className="text-xs text-slate-400 mt-1">Clique nas engrenagens para atualizar dados ou dar saídas.</p>
                  </div>
                  <div className="text-xs font-mono px-3 py-1.5 bg-slate-900 text-slate-400 border border-slate-800 rounded-lg">
                    Total: {filteredInventory.length} itens localizados
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/40 border-b border-slate-800">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Categoria</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Localização</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Lote</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Vencimento</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Qtd</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredInventory.length > 0 ? filteredInventory.map((item) => {
                        const expiry = getExpiryStatus(item.expiry_date);
                        return (
                          <tr key={item.id} className={`hover:bg-slate-900/20 transition-colors ${expiry.isClose ? 'bg-red-950/5' : ''}`}>
                            <td className="px-6 py-4.5">
                              <div className={`font-semibold text-sm ${
                                expiry.isCritical 
                                  ? 'text-red-400' 
                                  : expiry.isClose 
                                    ? 'text-amber-400' 
                                    : 'text-white'
                              }`}>
                                {item.name}
                              </div>
                              {item.is_donation === 1 && (
                                <span className="inline-block mt-1 text-[8px] bg-emerald-900/30 text-emerald-400 border border-emerald-800/40 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">Doação</span>
                              )}
                            </td>
                            <td className="px-6 py-4.5 text-slate-300 text-sm">{item.category}</td>
                            <td className="px-6 py-4.5 text-sm">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                item.isCentral 
                                  ? 'bg-slate-950/40 text-slate-400 border-slate-800' 
                                  : 'bg-emerald-950/20 text-emerald-400 border-emerald-900/20 shadow-sm'
                              }`}>
                                {item.isCentral ? <Layers size={10} className="text-slate-500" /> : <Ambulance size={10} className="text-emerald-400" />}
                                {item.location}
                              </span>
                            </td>
                            <td className="px-6 py-4.5 text-slate-400 text-sm font-mono">{item.batch || 'N/A'}</td>
                            <td className="px-6 py-4.5 text-sm font-medium">
                              {expiry.isClose ? (
                                <div className="flex flex-col">
                                  <span className={expiry.isCritical ? 'text-red-400 font-extrabold' : 'text-amber-400 font-bold'}>
                                    {item.expiry_date}
                                  </span>
                                  <span className={`text-[9px] uppercase font-bold tracking-tight mt-0.5 ${expiry.isCritical ? 'text-red-400' : 'text-amber-400'}`}>
                                    {expiry.isCritical ? '⚠️ Crítico!' : '⏱️ Atenção'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400">{item.expiry_date || 'N/A'}</span>
                              )}
                            </td>
                            <td className="px-6 py-4.5 text-right font-mono font-bold text-sm text-white">{item.quantity}</td>
                            <td className="px-6 py-4.5">
                              <div className="flex items-center justify-center gap-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.quantity < item.min_stock ? 'bg-red-950/40 text-red-400 border border-red-900/30' : 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30'
                                }`}>
                                  {item.quantity < item.min_stock ? 'Estoque Baixo' : 'Normal'}
                                </span>
                                {expiry.isClose && (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    expiry.isCritical ? 'bg-red-950/50 text-red-300 border border-red-900/40' : 'bg-amber-950/30 text-amber-300 border border-amber-900/40'
                                  }`}>
                                    {expiry.isCritical ? '≤ 30 Dias' : '≤ 60 Dias'}
                                  </span>
                                )}
                                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 shadow-sm ml-2">
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (!item.isCentral && item.ambulanceId) {
                                        const amb = ambulances.find((a: any) => a.id === item.ambulanceId);
                                        if (amb) {
                                          setSelectedAmbulance(amb);
                                          setActiveTab('ambulances');
                                        }
                                      } else {
                                        handleOpenModal('inventory', item);
                                      }
                                    }}
                                    className="p-1 px-1.5 text-slate-400 hover:text-blue-400 transition-colors rounded hover:bg-slate-900"
                                    title={item.isCentral ? "Editar Dados" : "Ir para gerenciamento da Viatura"}
                                  >
                                    {item.isCentral ? <Settings size={14} /> : <Ambulance size={14} />}
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDelete(item.id, item.isCentral, item.ambulanceId, item.itemIdInAmbulance);
                                    }}
                                    className="p-1 px-1.5 text-slate-400 hover:text-red-500 transition-colors rounded hover:bg-slate-900"
                                    title="Excluir do Banco de Dados"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-slate-500 italic text-sm">Nenhum registro encontrado.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'donations' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                {inventory.filter(i => i.is_donation === 1).length > 0 ? (
                  inventory.filter(i => i.is_donation === 1).map(item => {
                    const expiry = getExpiryStatus(item.expiry_date);
                    return (
                      <div key={item.id} className={`bg-slate-900/40 p-6 rounded-2xl border transition-all ${
                        expiry.isClose ? 'border-red-900/40 bg-red-950/5' : 'border-slate-800'
                      }`}>
                        <div className="flex justify-between items-start mb-4">
                          <div className={`p-3 rounded-xl ${expiry.isClose ? 'bg-red-950/40 text-red-400' : 'bg-emerald-950/40 text-emerald-400'}`}>
                            <HeartHandshake size={22} />
                          </div>
                          {expiry.isClose ? (
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                              expiry.isCritical ? 'bg-red-900/40 text-red-300 animate-pulse' : 'bg-amber-900/30 text-amber-300'
                            }`}>
                              {expiry.isCritical ? '⚠️ Crítico' : '⏱️ Atenção'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/20 px-2.5 py-0.5 rounded-full border border-emerald-800/30 uppercase">Rastreável</span>
                          )}
                        </div>
                        <h3 className={`text-lg font-bold mb-1 ${
                          expiry.isCritical ? 'text-red-400' : expiry.isClose ? 'text-amber-400' : 'text-white'
                        }`}>{item.name}</h3>
                        <p className="text-xs text-slate-400 mt-2 font-mono">
                          Lote: <span className="text-slate-300 font-semibold">{item.batch}</span> | Validade:{' '} 
                          <span className={expiry.isClose ? 'font-bold' : 'text-slate-300'}>{item.expiry_date}</span>
                        </p>
                        <div className="flex justify-between items-center pt-4 border-t border-slate-800 mt-5">
                          <span className="text-xs text-slate-400">Total Armazenado</span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleOpenModal('inventory', item)}
                              className="text-xs text-emerald-400 font-bold hover:underline bg-slate-950 px-2 py-1 rounded border border-slate-800"
                            >
                              Saída/Editar
                            </button>
                            <span className={`text-lg font-mono font-bold ${expiry.isCritical ? 'text-red-400' : expiry.isClose ? 'text-amber-400' : 'text-emerald-400'}`}>{item.quantity}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-1 md:col-span-3 p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/10">
                    <p className="text-slate-500 text-sm">Nenhum insumo classificado como "Doação" localizado.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ambulances' && (
              <div className="pb-12">
                {selectedAmbulance ? (
                  <div className="space-y-6">
                    {/* Header with Back Button */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setSelectedAmbulance(null)}
                          className="bg-slate-950 hover:bg-slate-800 border border-slate-800 px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-2"
                        >
                          ← Voltar para Frota
                        </button>
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h2 className="text-xl font-bold text-white leading-tight">{selectedAmbulance.name}</h2>
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                              selectedAmbulance.status?.includes('Reposição') ? 'bg-red-950/40 text-red-400 border border-red-900/20' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/20'
                            }`}>
                              {selectedAmbulance.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">Gerenciamento isolado de medicamentos, materiais e equipamentos da unidade.</p>
                        </div>
                      </div>
                      <div className="text-xs font-mono px-3 py-1.5 bg-slate-950 text-slate-400 border border-slate-800 rounded-xl">
                        {(selectedAmbulance.items || []).length} Insumos Registrados
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Left: Register form for vehicle items */}
                      <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2 mb-2">
                          <Plus size={16} /> Cadastrar Insumo na Viatura
                        </h3>
                        
                        <form onSubmit={handleAddAmbulanceItem} className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Nome de Insumo / Equipamento</label>
                            <div className="relative">
                              <input
                                required
                                type="text"
                                placeholder="Ex: Seringa Descartável, Adrenalina, Desfibrilador, etc"
                                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-white text-sm"
                                value={ambItemName}
                                onChange={e => {
                                  setAmbItemName(e.target.value);
                                  setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                              />
                              {showSuggestions && ambItemName.trim().length >= 1 && (
                                <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl shadow-2xl divide-y divide-slate-800/60 custom-scrollbar">
                                  {(() => {
                                    const matches = inventory.filter(item =>
                                      item.name.toLowerCase().includes(ambItemName.toLowerCase())
                                    );
                                    if (matches.length === 0) {
                                      return (
                                        <div className="px-4 py-3 text-xs text-slate-500 italic">
                                          Nenhum insumo correspondente no estoque geral.
                                        </div>
                                      );
                                    }
                                    return matches.map(item => (
                                      <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                          setAmbItemName(item.name);
                                          setAmbItemBatch(item.batch || 'N/A');
                                          setAmbItemExpiry(item.expiry_date || '');
                                          if (item.category && ['Medicamento', 'Material', 'Equipamento'].includes(item.category)) {
                                            setAmbItemCategory(item.category as any);
                                          }
                                          setShowSuggestions(false);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-850 transition-colors flex flex-col gap-1"
                                      >
                                        <div className="flex justify-between items-center w-full">
                                          <span className="text-sm font-bold text-white">{item.name}</span>
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800 font-semibold">{item.category}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                          <span>Lote: <strong className="text-emerald-400 font-mono font-medium">{item.batch || 'N/A'}</strong></span>
                                          <span>•</span>
                                          <span>Validade: <strong className="text-emerald-400 font-mono font-medium">{item.expiry_date ? new Date(item.expiry_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</strong></span>
                                        </div>
                                      </button>
                                    ));
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Categoria</label>
                              <select
                                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-white text-sm"
                                value={ambItemCategory}
                                onChange={e => setAmbItemCategory(e.target.value as any)}
                              >
                                <option value="Medicamento">Medicamento</option>
                                <option value="Material">Material</option>
                                <option value="Equipamento">Equipamento</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Quantidade</label>
                              <input
                                required
                                type="number"
                                min="1"
                                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-white text-sm"
                                value={ambItemQuantity}
                                onChange={e => setAmbItemQuantity(parseInt(e.target.value) || 1)}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Lote</label>
                              <input
                                type="text"
                                placeholder="Padrão: N/A"
                                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-white text-sm font-mono"
                                value={ambItemBatch}
                                onChange={e => setAmbItemBatch(e.target.value)}
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Validade</label>
                              <input
                                type="date"
                                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-white text-sm font-mono"
                                value={ambItemExpiry}
                                onChange={e => setAmbItemExpiry(e.target.value)}
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2.5 mt-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/10"
                          >
                            SALVAR
                          </button>
                        </form>
                      </div>

                      {/* Right: Items registered count / list */}
                      <div className="lg:col-span-2 bg-slate-900/40 rounded-2xl border border-slate-800 flex flex-col overflow-hidden">
                        <div className="p-5 bg-slate-950/20 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">Insumos Registrados</h4>
                          
                          {/* Filter Tabs */}
                          <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                            {(['Todos', 'Medicamento', 'Material', 'Equipamento'] as const).map(f => (
                              <button
                                key={f}
                                onClick={() => setAmbItemFilter(f)}
                                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                                  ambItemFilter === f
                                    ? 'bg-emerald-600 font-bold text-white shadow'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                {f}s
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-950/40 text-slate-400 border-b border-slate-800 text-[10px] tracking-wider uppercase font-semibold">
                              <tr>
                                <th className="px-5 py-3">Insumo</th>
                                <th className="px-5 py-3">Categoria</th>
                                <th className="px-5 py-3 font-mono">Lote</th>
                                <th className="px-5 py-3 font-mono">Validade</th>
                                <th className="px-5 py-3 text-right">Qtd</th>
                                <th className="px-5 py-3 text-center">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {((selectedAmbulance.items || []) as any[])
                                .filter(item => ambItemFilter === 'Todos' || item.category === ambItemFilter)
                                .length > 0 ? (
                                  ((selectedAmbulance.items || []) as any[])
                                    .filter(item => ambItemFilter === 'Todos' || item.category === ambItemFilter)
                                    .map(item => (
                                      <tr key={item.id} className="hover:bg-slate-950/20 transition-all">
                                        <td className="px-5 py-3.5 font-bold text-white">{item.name}</td>
                                        <td className="px-5 py-3.5">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            item.category === 'Medicamento' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/20' :
                                            item.category === 'Material' ? 'bg-blue-950/40 text-blue-400 border border-blue-900/20' :
                                            'bg-purple-950/40 text-purple-400 border border-purple-900/20'
                                          }`}>
                                            {item.category}
                                          </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-400 font-mono">{item.batch || 'N/A'}</td>
                                        <td className="px-5 py-3.5 font-mono text-slate-400">
                                          {item.expiry_date && item.expiry_date !== 'N/V' ? (
                                            <span>{item.expiry_date}</span>
                                          ) : (
                                            'N/A'
                                          )}
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-mono font-bold text-white text-sm">{item.quantity}</td>
                                        <td className="px-5 py-3.5">
                                          <div className="flex items-center justify-center gap-2">
                                            <button
                                              onClick={() => handleUpdateAmbulanceItemQty(item.id, -1)}
                                              className="bg-slate-950 hover:bg-slate-800 border border-slate-850 p-1 px-2.5 rounded font-bold text-slate-300 hover:text-white"
                                              title="Subtrair 1"
                                              disabled={item.quantity <= 1}
                                            >
                                              -
                                            </button>
                                            <button
                                              onClick={() => handleUpdateAmbulanceItemQty(item.id, 1)}
                                              className="bg-slate-950 hover:bg-slate-800 border border-slate-850 p-1 px-2.5 rounded font-bold text-slate-300 hover:text-white"
                                              title="Adicionar 1"
                                            >
                                              +
                                            </button>
                                            <button
                                              onClick={() => handleDeleteAmbulanceItem(item.id)}
                                              className="text-slate-500 hover:text-red-500 p-1 ml-1"
                                              title="Deletar Item"
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))
                                ) : (
                                  <tr>
                                    <td colSpan={6} className="text-center py-10 text-slate-500 italic">Nenhum item localizado para esse filtro neste veículo.</td>
                                  </tr>
                                )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                    {ambulances.map(amb => {
                      const isUnderRep = amb.status.includes('Reposição');
                      return (
                        <div key={amb.id} className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-6">
                              <div className="bg-blue-500/10 text-blue-400 border border-blue-500/20 p-3 rounded-xl">
                                <Ambulance size={22} />
                              </div>
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                                !isUnderRep ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/40 text-red-400'
                              }`}>
                                {amb.status}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">{amb.name}</h3>
                            <div className="space-y-4 mt-4 pt-4 border-t border-slate-800/60">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">Status Operacional</span>
                                <span className={isUnderRep ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                                  {isUnderRep ? 'Reposição Requerida' : 'Prontidão'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs font-mono bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                                <span className="text-slate-500">Insumos Registrados</span>
                                <span className="text-emerald-400 font-bold">{(amb.items || []).length} itens</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2 mt-6">
                            <button 
                              onClick={() => handleOpenModal('ambulance', amb)}
                              className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white rounded-xl font-bold border border-slate-850 text-xs transition-all"
                            >
                              Gerenciar Status da Unidade
                            </button>
                            
                            <button
                              onClick={() => {
                                setSelectedAmbulance(amb);
                                setAmbItemName('');
                                setAmbItemCategory('Medicamento');
                                setAmbItemQuantity(1);
                                setAmbItemBatch('');
                                setAmbItemExpiry('');
                              }}
                              className="w-full py-2.5 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/15 text-emerald-400 hover:text-emerald-300 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                            >
                              <Layers size={13} />
                              <span>Estoque da Viatura ({(amb.items || []).length})</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-6 pb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
                    <div className="bg-blue-500/10 text-blue-400 border border-blue-500/20 p-4 rounded-xl">
                      <ArrowUpRight size={28} />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pedidos no Sistema</h3>
                      <p className="text-3xl font-bold font-mono text-blue-400 mt-1">
                        {orders.filter(o => o.type === 'Pedido').length}
                      </p>
                    </div>
                  </div>
                  <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
                    <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 p-4 rounded-xl">
                      <ArrowDownLeft size={28} />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Devoluções Computadas</h3>
                      <p className="text-3xl font-bold font-mono text-amber-400 mt-1">
                        {orders.filter(o => o.type === 'Devolução').length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                  <div className="p-6 bg-slate-950/20 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="font-bold text-white text-md">Movimentações de Reposição Recorrentes</h2>
                    <span className="text-xs text-slate-400 font-mono">Registro Histórico</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/40 border-b border-slate-800">
                          <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">Tipo</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">Insumo</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest text-right">Qtd</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">Data</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {orders.length > 0 ? orders.map(order => (
                          <tr key={order.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="px-6 py-4">
                              <span className={`flex items-center gap-1.5 font-bold text-sm ${order.type === 'Pedido' ? 'text-blue-400' : 'text-amber-400'}`}>
                                {order.type === 'Pedido' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                {order.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-white">{order.item_name}</td>
                            <td className="px-6 py-4 text-right font-mono font-bold text-white">{order.quantity}</td>
                            <td className="px-6 py-4 text-slate-400 text-sm font-mono">{new Date(order.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-center">
                              {order.status === 'Pendente' ? (
                                <button 
                                  onClick={() => handleCompleteOrder(order.id)}
                                  className="px-3 py-1 bg-blue-500/10 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 text-[10px] font-bold uppercase rounded-lg transition-all"
                                >
                                  Concluir Saída
                                </button>
                              ) : (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-950/30 text-emerald-400 border border-emerald-900/20">
                                  {order.status}
                                </span>
                              )}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-slate-500 italic text-sm">Nenhum pedido de fluxo criado.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="space-y-8 pb-12">
                <div className="flex gap-4 border-b border-slate-800 mb-6">
                  <button 
                    onClick={() => setReportTab('geral')}
                    className={`pb-4 px-3 font-semibold text-sm transition-all relative ${reportTab === 'geral' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Resumo Gráfico
                    {reportTab === 'geral' && <motion.div layoutId="activeReportTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
                  </button>
                  <button 
                    onClick={() => setReportTab('estoque')}
                    className={`pb-4 px-3 font-semibold text-sm transition-all relative ${reportTab === 'estoque' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Estoque e Validades PDF
                    {reportTab === 'estoque' && <motion.div layoutId="activeReportTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
                  </button>
                  <button 
                    onClick={() => setReportTab('movimentacao')}
                    className={`pb-4 px-3 font-semibold text-sm transition-all relative ${reportTab === 'movimentacao' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Fluxo de Movimentação PDF
                    {reportTab === 'movimentacao' && <motion.div layoutId="activeReportTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
                  </button>
                </div>

                {reportTab === 'geral' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
                      <h3 className="text-md font-bold text-white mb-6 flex items-center gap-2">
                        <Layers size={18} className="text-emerald-400" /> Distribuição Geral por Medicamentos
                      </h3>
                      <div className="h-[280px]">
                        {reportData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={reportData}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {reportData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#090D1A', borderColor: '#1E293B', color: '#fff' }} />
                              <Legend wrapperStyle={{ color: '#fff', fontSize: '11px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">Sem dados.</div>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
                      <h3 className="text-md font-bold text-white mb-6 flex items-center gap-2">
                        <BarChart3 size={18} className="text-blue-400" /> Movimentação Estimulada de Amostra
                      </h3>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            { name: 'Seg', pedidos: 8, devolucoes: 2 },
                            { name: 'Ter', pedidos: 5, devolucoes: 1 },
                            { name: 'Qua', pedidos: 15, devolucoes: 4 },
                            { name: 'Qui', pedidos: 12, devolucoes: 3 },
                            { name: 'Sex', pedidos: 20, devolucoes: 5 },
                            { name: 'Sab', pedidos: 6, devolucoes: 0 },
                            { name: 'Dom', pedidos: 3, devolucoes: 1 },
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                            <Tooltip contentStyle={{ backgroundColor: '#090D1A', borderColor: '#1E293B' }} />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Bar dataKey="pedidos" name="Pedidos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="devolucoes" name="Devoluções" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {reportTab === 'estoque' && (
                  <div className="bg-slate-900/40 p-8 rounded-2xl border border-slate-800">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-white">Relatório Completo de Estoque e Alertas</h3>
                        <p className="text-xs text-slate-400 mt-1">Exportação direta no formato para auditorias e fiscais.</p>
                      </div>
                      <button 
                        onClick={() => generatePDF('inventory')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md"
                      >
                        Compilar PDF
                      </button>
                    </div>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {inventory.map(item => {
                        const expiry = getExpiryStatus(item.expiry_date);
                        return (
                          <div key={item.id} className={`flex items-center justify-between p-4 rounded-xl border ${expiry.isClose ? 'bg-red-950/15 border-red-900/40' : 'bg-slate-950/20 border-slate-800'}`}>
                            <div>
                              <p className={`font-bold text-sm ${expiry.isCritical ? 'text-red-400' : expiry.isClose ? 'text-amber-400' : 'text-slate-100'}`}>
                                {item.name}
                              </p>
                              <p className="text-xs mt-1 text-slate-400">
                                Validade original:{' '}
                                <span className={expiry.isClose ? (expiry.isCritical ? 'font-bold text-red-400' : 'font-semibold text-amber-400') : 'text-slate-350'}>
                                  {item.expiry_date || 'Não Identificada'} {expiry.isClose && `(${expiry.label})`}
                                </span>
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm text-white">{item.quantity} unidades</p>
                              <div className="flex flex-col items-end gap-1 mt-1">
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${item.quantity < item.min_stock ? 'bg-red-950/40 text-red-400' : 'bg-emerald-950/20 text-emerald-400'}`}>
                                  {item.quantity < item.min_stock ? 'Abaixo do Mínimo' : 'Nível Adequado'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {reportTab === 'movimentacao' && (
                  <div className="bg-slate-900/40 p-8 rounded-2xl border border-slate-800">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-white">Fluxo de Entradas, Pedidos e Devoluções</h3>
                        <p className="text-xs text-slate-400 mt-1">Exportação e logs automatizados para estoque.</p>
                      </div>
                      <button 
                        onClick={() => generatePDF('orders')}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md"
                      >
                        Compilar PDF
                      </button>
                    </div>
                    <div className="space-y-4">
                      {orders.map(order => (
                        <div key={order.id} className="flex items-center justify-between p-4 bg-slate-950/30 rounded-xl border border-slate-800">
                          <div>
                            <p className="font-bold text-sm text-white">{order.item_name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">Operado em: {new Date(order.created_at).toLocaleDateString()}</p>
                          </div>
                          <span className={`text-xs font-bold ${order.type === 'Pedido' ? 'text-blue-400' : 'text-amber-400'}`}>{order.type} • {order.quantity} un</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Comprehensive System Settings Tab */}
            {activeTab === 'settings' && (
              isAdmin ? (
                <div className="space-y-8 pb-12">
                  {/* Settings Navigation Sub-Tabs */}
                  <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-px mb-6">
                    <button 
                      onClick={() => setSettingsActiveSubTab('branding')}
                      className={`pb-4 px-3 font-semibold text-sm transition-all relative flex items-center gap-2 ${settingsActiveSubTab === 'branding' ? `${themeColors.text}` : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      <Palette size={16} />
                      <span>Identidade Visual</span>
                      {settingsActiveSubTab === 'branding' && (
                        <motion.div 
                          layoutId="activeSettingsSubTab" 
                          className="absolute bottom-0 left-0 right-0 h-0.5" 
                          style={{ backgroundColor: systemSettings.primaryColor === 'emerald' ? '#10b981' : systemSettings.primaryColor === 'blue' ? '#3b82f6' : systemSettings.primaryColor === 'indigo' ? '#6366f1' : systemSettings.primaryColor === 'violet' ? '#8b5cf6' : '#f43f5e' }}
                        />
                      )}
                    </button>
                    <button 
                      onClick={() => setSettingsActiveSubTab('users')}
                      className={`pb-4 px-3 font-semibold text-sm transition-all relative flex items-center gap-2 ${settingsActiveSubTab === 'users' ? `${themeColors.text}` : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      <Users size={16} />
                      <span>Autorizar Usuários</span>
                      {settingsActiveSubTab === 'users' && (
                        <motion.div 
                          layoutId="activeSettingsSubTab" 
                          className="absolute bottom-0 left-0 right-0 h-0.5" 
                          style={{ backgroundColor: systemSettings.primaryColor === 'emerald' ? '#10b981' : systemSettings.primaryColor === 'blue' ? '#3b82f6' : systemSettings.primaryColor === 'indigo' ? '#6366f1' : systemSettings.primaryColor === 'violet' ? '#8b5cf6' : '#f43f5e' }}
                        />
                      )}
                    </button>
                    <button 
                      onClick={() => setSettingsActiveSubTab('createUser')}
                      className={`pb-4 px-3 font-semibold text-sm transition-all relative flex items-center gap-2 ${settingsActiveSubTab === 'createUser' ? `${themeColors.text}` : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      <UserPlus size={16} />
                      <span>Cadastrar Usuário</span>
                      {settingsActiveSubTab === 'createUser' && (
                        <motion.div 
                          layoutId="activeSettingsSubTab" 
                          className="absolute bottom-0 left-0 right-0 h-0.5" 
                          style={{ backgroundColor: systemSettings.primaryColor === 'emerald' ? '#10b981' : systemSettings.primaryColor === 'blue' ? '#3b82f6' : systemSettings.primaryColor === 'indigo' ? '#6366f1' : systemSettings.primaryColor === 'violet' ? '#8b5cf6' : '#f43f5e' }}
                        />
                      )}
                    </button>
                    <button 
                      onClick={() => setSettingsActiveSubTab('maintenance')}
                      className={`pb-4 px-3 font-semibold text-sm transition-all relative flex items-center gap-2 ${settingsActiveSubTab === 'maintenance' ? `${themeColors.text}` : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      <Database size={16} />
                      <span>Manutenção</span>
                      {settingsActiveSubTab === 'maintenance' && (
                        <motion.div 
                          layoutId="activeSettingsSubTab" 
                          className="absolute bottom-0 left-0 right-0 h-0.5" 
                          style={{ backgroundColor: systemSettings.primaryColor === 'emerald' ? '#10b981' : systemSettings.primaryColor === 'blue' ? '#3b82f6' : systemSettings.primaryColor === 'indigo' ? '#6366f1' : systemSettings.primaryColor === 'violet' ? '#8b5cf6' : '#f43f5e' }}
                        />
                      )}
                    </button>
                  </div>

                  {/* Sub-Tab 1: Visual Identity & Branding Settings */}
                  {settingsActiveSubTab === 'branding' && (
                    <div className="max-w-2xl bg-slate-900/40 border border-slate-800 p-8 rounded-2xl shadow-xl">
                      <h3 className="text-lg font-bold text-white mb-2">Identidade Visual & Customização</h3>
                      <p className="text-xs text-slate-400 mb-6">Personalize os elementos visuais, logo e o nome que aparece nas páginas do site.</p>

                      <form onSubmit={handleSaveSystemSettings} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Nome do Sistema</label>
                            <input 
                              type="text" 
                              required
                              placeholder="Ex: PharmaStock"
                              className={`w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl outline-none text-white text-sm transition-all ${themeColors.focusRing}`}
                              value={systemSettings.systemName}
                              onChange={e => setSystemSettings({ ...systemSettings, systemName: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Cor Temática Principal</label>
                            <select 
                              className={`w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl outline-none text-white text-sm transition-all ${themeColors.focusRing}`}
                              value={systemSettings.primaryColor}
                              onChange={e => setSystemSettings({ ...systemSettings, primaryColor: e.target.value as any })}
                            >
                              <option value="emerald">Verde Esmeralda (Padrão)</option>
                              <option value="blue">Azul Clínico</option>
                              <option value="indigo">Índigo Corporativo</option>
                              <option value="violet">Roxo Violeta</option>
                              <option value="rose">Rosa Saúde</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-800 pt-5">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Tipo de Logotipo</label>
                            <select 
                              className={`w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl outline-none text-white text-sm transition-all ${themeColors.focusRing}`}
                              value={systemSettings.logoType}
                              onChange={e => setSystemSettings({ ...systemSettings, logoType: e.target.value as any, logoValue: e.target.value === 'icon' ? 'Pill' : '' })}
                            >
                              <option value="icon">Ícone de Sistema</option>
                              <option value="url">Link Externo (URL de Imagem)</option>
                            </select>
                          </div>
                          <div>
                            {systemSettings.logoType === 'icon' ? (
                              <>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Escolher Ícone da Logo</label>
                                <select 
                                  className={`w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl outline-none text-white text-sm transition-all ${themeColors.focusRing}`}
                                  value={systemSettings.logoValue}
                                  onChange={e => setSystemSettings({ ...systemSettings, logoValue: e.target.value })}
                                >
                                  <option value="Pill">Pílula / Medicamentos</option>
                                  <option value="Package">Caixa / Insumos</option>
                                  <option value="Activity">Gráfico de Pulso</option>
                                  <option value="Heart">Coração / Doações</option>
                                  <option value="Shield">Escudo / Proteção</option>
                                  <option value="Stethoscope">Estetoscópio</option>
                                  <option value="Cross">Cruz de Emergência</option>
                                </select>
                              </>
                            ) : (
                              <>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">URL da Imagem da Logo</label>
                                <input 
                                  type="url" 
                                  required
                                  placeholder="https://exemplo.com/logo.png"
                                  className={`w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl outline-none text-white text-sm transition-all ${themeColors.focusRing}`}
                                  value={systemSettings.logoValue}
                                  onChange={e => setSystemSettings({ ...systemSettings, logoValue: e.target.value })}
                                />
                              </>
                            )}
                          </div>
                        </div>

                        {settingsMsg && (
                          <div className={`p-3 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2`}>
                            <CheckCircle size={14} className="shrink-0" />
                            <span>{settingsMsg}</span>
                          </div>
                        )}

                        <div className="pt-4 border-t border-slate-800 flex justify-end">
                          <button
                            type="submit"
                            disabled={isSavingSettings}
                            className={`px-6 py-3 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 ${themeColors.primaryBg}`}
                          >
                            <Save size={14} />
                            <span>{isSavingSettings ? 'Salvando Alterações...' : 'Salvar Configurações'}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Sub-Tab 2: User Authorization Management */}
                  {settingsActiveSubTab === 'users' && (
                    <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl shadow-xl">
                      <div className="mb-6">
                        <h3 className="text-lg font-bold text-white">Autorizar & Gerenciar Usuários</h3>
                        <p className="text-xs text-slate-400 mt-1">Gerencie quem possui permissão de login e atribua funções de Administrador ou Operador.</p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                              <th className="py-3 px-4">E-mail de Acesso</th>
                              <th className="py-3 px-4">Nível de Acesso</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4 text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 text-sm">
                            {appUsers.map((appUser) => {
                              const isSelf = appUser.email === user.email;
                              const isDefaultAdmin = appUser.email === 'sinron@pharmastock.com' || appUser.email === 'sinron';
                              return (
                                <tr key={appUser.id || appUser.email} className="hover:bg-slate-950/20 transition-all">
                                  <td className="py-3.5 px-4 font-medium text-slate-100 font-mono">
                                    {appUser.email}
                                    {isSelf && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">Você</span>}
                                    {isDefaultAdmin && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-red-950/30 text-red-400 border border-red-900/20 font-normal">Dono</span>}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <button
                                      disabled={isDefaultAdmin || isSelf}
                                      onClick={() => handleToggleUserRole(appUser)}
                                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                                        appUser.role === 'Administrador' 
                                          ? 'bg-purple-950/30 text-purple-400 border border-purple-900/30' 
                                          : 'bg-slate-950/40 text-slate-300 border border-slate-800'
                                      } ${!(isDefaultAdmin || isSelf) && 'hover:bg-opacity-80 active:scale-95'}`}
                                    >
                                      {appUser.role === 'Administrador' ? <ShieldAlert size={12} /> : <Shield size={12} />}
                                      <span>{appUser.role || 'Operador'}</span>
                                    </button>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <button
                                      disabled={isDefaultAdmin || isSelf}
                                      onClick={() => handleToggleAuthorizeUser(appUser)}
                                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                        appUser.status === 'Autorizado'
                                          ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/30'
                                          : 'bg-amber-950/30 text-amber-400 border border-amber-900/30'
                                      } ${!(isDefaultAdmin || isSelf) && 'hover:bg-opacity-80 active:scale-95'}`}
                                    >
                                      {appUser.status || 'Autorizado'}
                                    </button>
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <button
                                      type="button"
                                      disabled={isDefaultAdmin || isSelf}
                                      onClick={() => handleDeleteAppUser(appUser)}
                                      className={`p-1.5 rounded-lg border border-red-900/20 text-red-400 bg-red-950/10 hover:bg-red-900/20 transition-all ${
                                        (isDefaultAdmin || isSelf) ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
                                      }`}
                                      title={isDefaultAdmin ? "Administrador primário não pode ser deletado." : "Excluir Usuário"}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Sub-Tab 3: Add / Create Users Form */}
                  {settingsActiveSubTab === 'createUser' && (
                    <div className="max-w-xl bg-slate-900/40 border border-slate-800 p-8 rounded-2xl shadow-xl">
                      <h3 className="text-lg font-bold text-white mb-1">Cadastrar Novo Usuário</h3>
                      <p className="text-xs text-slate-400 mb-6">Cadastre novos operadores ou administradores de maneira centralizada.</p>

                      <form onSubmit={handleAdminCreateUser} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Usuário ou E-mail</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ex: operador1 ou email@servico.com"
                            className={`w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl outline-none text-white text-sm transition-all ${themeColors.focusRing}`}
                            value={newUserEmail}
                            onChange={e => setNewUserEmail(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Senha Provisória (Mínimo 6 dígitos)</label>
                          <input 
                            type="password" 
                            required
                            minLength={6}
                            placeholder="******"
                            className={`w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl outline-none text-white text-sm transition-all ${themeColors.focusRing}`}
                            value={newUserPassword}
                            onChange={e => setNewUserPassword(e.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Nível Administrativo</label>
                            <select 
                              className={`w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl outline-none text-white text-sm transition-all ${themeColors.focusRing}`}
                              value={newUserRole}
                              onChange={e => setNewUserRole(e.target.value as any)}
                            >
                              <option value="Operador">Operador (Estoque normal)</option>
                              <option value="Administrador">Administrador (Total)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Status de Entrada</label>
                            <select 
                              className={`w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl outline-none text-white text-sm transition-all ${themeColors.focusRing}`}
                              value={newUserStatus}
                              onChange={e => setNewUserStatus(e.target.value as any)}
                            >
                              <option value="Autorizado">Autorizado (Acesso imediato)</option>
                              <option value="Pendente">Pendente (Requer aprovação posterior)</option>
                            </select>
                          </div>
                        </div>

                        {newUserMsg.text && (
                          <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                            newUserMsg.type === 'success' 
                              ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400' 
                              : 'bg-red-950/20 border-red-900/30 text-red-400'
                          }`}>
                            {newUserMsg.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                            <span>{newUserMsg.text}</span>
                          </div>
                        )}

                        <div className="pt-4 border-t border-slate-800 flex justify-end">
                          <button
                            type="submit"
                            className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${themeColors.primaryBg}`}
                          >
                            <UserPlus size={14} />
                            <span>Cadastrar Usuário</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Sub-Tab 4: Database Maintenance original options */}
                  {settingsActiveSubTab === 'maintenance' && (
                    <div className="max-w-xl space-y-8">
                      <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
                        <div className="flex items-center gap-3 text-red-400">
                          <Trash2 size={26} />
                          <h2 className="text-xl font-extrabold text-white">Manutenção do Banco de Dados</h2>
                        </div>
                        
                        <p className="text-sm text-slate-400 leading-relaxed">
                          Esta tela permite que você realize operações administrativas no banco de dados do PharmaStock. Você pode zerar todos os dados para começar um inventário corporativo real, ou restaurar os dados fictícios padrão para demonstrações.
                        </p>

                        <div className="p-4 bg-red-950/20 rounded-xl border border-red-900/30 space-y-4">
                          <div>
                            <h3 className="text-sm font-bold text-red-400 flex items-center gap-1.5">
                              <Trash2 size={16} /> Opção: Limpar Sistema (Lançamentos Novos)
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                              Isso removerá instantaneamente todos os insumos cadastrados, ambulâncias e pedidos de forma definitiva do Firestore. O recurso de carregamento automático de demonstração será desativado para deixar o sistema vazio e pronto para uso real.
                            </p>
                          </div>

                          {showClearConfirm ? (
                            <div className="p-4 bg-red-950/80 border border-red-800 rounded-xl space-y-3">
                              <p className="text-xs font-bold text-red-200">
                                ⚠️ TEM CERTEZA ABSOLUTA? Esta operação removerá definitivamente todos os dados do banco de dados e localstorage. Isto é irreversível.
                              </p>
                              <div className="flex flex-wrap gap-2 pt-1">
                                <button
                                  type="button"
                                  disabled={isClearing}
                                  onClick={handleClearDatabase}
                                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all"
                                >
                                  {isClearing ? 'Efetuando Limpeza...' : 'Sim, Apagar Tudo'}
                                </button>
                                <button
                                  type="button"
                                  disabled={isClearing}
                                  onClick={() => setShowClearConfirm(false)}
                                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setShowClearConfirm(true); setShowRestoreConfirm(false); }}
                              className="w-full sm:w-auto px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-red-500/20"
                            >
                              Zerar e Iniciar Novo Estoque
                            </button>
                          )}
                        </div>

                        <div className="p-4 bg-emerald-950/20 rounded-xl border border-emerald-900/30 space-y-4 mt-6">
                          <div>
                            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                              <RefreshCw size={16} /> Opção: Restaurar Amostras de Teste
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                              Utilize para popular o sistema novamente com itens representativos (Amoxicilina, Dipirona, Soro Fisiológico) para fins de teste ou demonstração visual das funcionalidades. Heurísticas de controle serão reativadas.
                            </p>
                          </div>

                          {showRestoreConfirm ? (
                            <div className="p-4 bg-emerald-950/80 border border-emerald-850 rounded-xl space-y-3">
                              <p className="text-xs font-bold text-emerald-200">
                                Aviso: Isso substituirá os registros atuais para carregar as amostras padrão de fábrica. Continuar?
                              </p>
                              <div className="flex flex-wrap gap-2 pt-1">
                                <button
                                  type="button"
                                  disabled={isClearing}
                                  onClick={handleRestoreDefaults}
                                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all"
                                >
                                  {isClearing ? 'Restaurando...' : 'Sim, Restaurar'}
                                </button>
                                <button
                                  type="button"
                                  disabled={isClearing}
                                  onClick={() => setShowRestoreConfirm(false)}
                                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setShowRestoreConfirm(true); setShowClearConfirm(false); }}
                              className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-emerald-700/20"
                            >
                              Restaurar Dados de Amostra
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-xl mx-auto pb-12 text-center p-8 bg-slate-900/40 border border-slate-800 rounded-2xl shadow-xl space-y-4">
                  <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <Lock size={32} />
                  </div>
                  <h2 className="text-xl font-extrabold text-white">Acesso Restrito</h2>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                    Esta seção possui ferramentas sensitivas de manutenção do banco de dados e está disponível exclusivamente para o administrador do sistema (<span className="text-emerald-400 font-bold font-mono">sinron</span>). Novos usuários não possuem privilégios de acesso.
                  </p>
                </div>
              )
            )}
          </motion.div>
        </AnimatePresence>

        {/* Rodapé Corporativo com os Direitos Reservados */}
        <footer className="mt-16 pt-6 border-t border-slate-800/60 pb-2 text-center text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10 font-mono">
          <span>PharmaStock Enterprise • v1.2.0</span>
          <span>Direitos reservados - Antonio Sinron Neri</span>
        </footer>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, alert }: any) {
  const colors: any = {
    blue: 'bg-blue-500/10 text-blue-400 border border-blue-500/25',
    orange: 'bg-orange-500/10 text-orange-400 border border-orange-500/25',
    red: 'bg-red-500/10 text-red-400 border border-red-500/25 shadow-lg shadow-red-500/2',
    emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
  };

  return (
    <motion.div 
      whileHover={{ y: -3 }}
      className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-md relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          <Icon size={22} />
        </div>
        {alert && (
          <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        )}
      </div>
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{title}</p>
      <h3 className="text-3xl font-extrabold text-white mt-1.5 font-mono">{value}</h3>
    </motion.div>
  );
}
