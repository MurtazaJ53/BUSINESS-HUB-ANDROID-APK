import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { useUpdateCheck } from './hooks/useUpdateCheck';
import UpdateBanner from './components/UpdateBanner';
import { useAuthStore } from './lib/useAuthStore';
import { useBusinessStore } from './lib/useBusinessStore';
import AuthPage from './pages/Auth';
import { Sparkles, ShieldAlert } from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { usePushNotifications } from './hooks/usePushNotifications';

// Lazy load components outside the component to prevent re-creation
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const Inventory = React.lazy(() => import('@/pages/Inventory'));
const POS = React.lazy(() => import('@/pages/POS'));
const Customers = React.lazy(() => import('@/pages/Customers'));
const History = React.lazy(() => import('@/pages/History'));
const Expenses = React.lazy(() => import('@/pages/Expenses'));
const StockAlerts = React.lazy(() => import('@/pages/StockAlerts'));
const Analytics = React.lazy(() => import('@/pages/Analytics'));
const Team = React.lazy(() => import('@/pages/Team'));
const Settings = React.lazy(() => import('@/pages/Settings'));
const MigrationTool = React.lazy(() => import('@/pages/MigrationTool'));

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, shopId, role, loading } = useAuthStore();
  const { initStore, dbReady, dbError } = useBusinessStore();
  const { updateAvailable } = useUpdateCheck();
  const [showUpdate, setShowUpdate] = React.useState(true);

  usePushNotifications(shopId);

  useEffect(() => {
    const { initialize, cleanup } = useAuthStore.getState();
    initialize();
    return () => cleanup();
  }, []);

  useEffect(() => {
    let lastTime = 0;
    const backListener = CapacitorApp.addListener('backButton', () => {
      // 1. If we are on POS/Inventory and have a popup, closing should be handled by that component via Escape/State
      // 2. Standard navigation
      if (window.history.length > 1) {
        navigate(-1);
      } else if (location.pathname === '/' || location.pathname === '/dashboard') {
        const currentTime = new Date().getTime();
        if (currentTime - lastTime < 2000) {
          CapacitorApp.exitApp();
        } else {
          lastTime = currentTime;
          // You could show a toast here "Press again to exit"
        }
      } else {
        navigate('/dashboard');
      }
    });
    return () => {
      backListener.then((l: any) => l.remove());
    };
  }, [location, navigate]);

  useEffect(() => {
    if (shopId && role) {
      const unsub = initStore(shopId, role);
      return () => unsub();
    }
  }, [shopId, role, initStore]);

  // Handle DB Boot Failure
  if (dbError) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="h-20 w-20 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 mx-auto shadow-2xl">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-white uppercase tracking-tighter">Database Boot Error</h1>
            <p className="text-sm text-zinc-500 font-medium leading-relaxed">{dbError}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all"
          >
            Attempt System Recovery
          </button>
        </div>
      </div>
    );
  }

  if (loading || (shopId && !dbReady)) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary animate-spin" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
            {!dbReady && shopId ? 'Booting Secure Vault...' : 'Initializing Hub...'}
          </p>
        </div>
      </div>
    );
  }

  // If not logged in OR logged in but no shop assigned yet
  if (!user || !shopId) {
    return <AuthPage />;
  }

  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary animate-spin" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Loading UI...</p>
        </div>
      </div>
    }>
      {updateAvailable && showUpdate && typeof window !== 'undefined' && 
       ((window as any).Capacitor?.getPlatform() === 'android' || (window as any).Capacitor?.getPlatform() === 'ios') && (
        <UpdateBanner 
          metadata={updateAvailable} 
          onClose={() => setShowUpdate(false)} 
        />
      )}
      <AppLayout />
    </React.Suspense>
  );
}
