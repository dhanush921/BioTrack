import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './components/Toast';

// Layouts & Components (always needed, keep eager)
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { ShieldAlert } from 'lucide-react';

// Lazy-load heavy components (split into separate JS chunks)
const QRScanner = lazy(() => import('./components/QRScanner').then(m => ({ default: m.QRScanner })));
const ThemeSelectorModal = lazy(() => import('./components/ThemeSelectorModal').then(m => ({ default: m.ThemeSelectorModal })));

// Lazy-load all pages (each becomes its own JS chunk loaded on demand)
const Login = lazy(() => import('./pages/Auth/Login').then(m => ({ default: m.Login })));
const AdminLogin = lazy(() => import('./pages/Auth/AdminLogin').then(m => ({ default: m.AdminLogin })));
const Signup = lazy(() => import('./pages/Auth/Signup').then(m => ({ default: m.Signup })));
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const EquipmentList = lazy(() => import('./pages/Equipment/EquipmentList').then(m => ({ default: m.EquipmentList })));
const MaintenanceList = lazy(() => import('./pages/Maintenance/MaintenanceList').then(m => ({ default: m.MaintenanceList })));
const BreakdownList = lazy(() => import('./pages/Breakdowns/BreakdownList').then(m => ({ default: m.BreakdownList })));
const CalibrationList = lazy(() => import('./pages/Calibration/CalibrationList').then(m => ({ default: m.CalibrationList })));
const PartsInventory = lazy(() => import('./pages/Inventory/PartsInventory').then(m => ({ default: m.PartsInventory })));
const AIInsights = lazy(() => import('./pages/AIInsights').then(m => ({ default: m.AIInsights })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const AdminPanel = lazy(() => import('./pages/AdminPanel').then(m => ({ default: m.AdminPanel })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const ContractsList = lazy(() => import('./pages/Contracts/ContractsList').then(m => ({ default: m.ContractsList })));
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const CalendarView = lazy(() => import('./pages/CalendarView').then(m => ({ default: m.CalendarView })));

// Minimal loading fallback
const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center bg-slate-950 min-h-[50vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-slate-400 text-sm">Loading...</span>
    </div>
  </div>
);

// Route guards
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Initializing BioTrack node...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [appTheme, setAppTheme] = useState<'dark' | 'light'>('dark');

  // Handle live QR scans
  const handleQRScanSuccess = (text: string) => {
    setScannerOpen(false);
    toast.success(`QR tag identified: ${text}`);

    // Parse id (e.g. biotrack://equipment/EQ-001)
    if (text.startsWith('biotrack://equipment/')) {
      const id = text.split('/').pop();
      if (id) {
        // Redirect client to equipment lists with specific search parameter
        window.location.href = `/equipment?search=${id}`;
      }
    } else {
      toast.warning('Invalid BioTrack tag format.');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      {/* Ask user theme preference on first launch */}
      <Suspense fallback={null}>
        <ThemeSelectorModal onSelectTheme={(t) => setAppTheme(t)} />
      </Suspense>

      {scannerOpen && (
        <Suspense fallback={null}>
          <QRScanner 
            onScanSuccess={handleQRScanSuccess} 
            onClose={() => setScannerOpen(false)} 
          />
        </Suspense>
      )}

      {user ? (
        user.approved === false ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-950 text-white min-h-screen">
            <div className="relative w-full max-w-md border border-white/10 rounded-3xl bg-slate-900 shadow-2xl p-8 text-center space-y-6 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl" />

              <div className="flex justify-center">
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-full animate-pulse">
                  <ShieldAlert className="w-10 h-10" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold tracking-tight">Access Pending Approval</h2>
                <p className="text-sm text-slate-400">
                  Welcome to BioTrack, <span className="font-semibold text-white">{user.name}</span>!
                </p>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed text-center">
                Your account is currently waiting for system administrator verification. A request has been sent to <span className="font-mono text-cyan-400 text-xs">chippadadhanush274@gmail.com</span>.
              </p>

              <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 text-xs space-y-1 text-left">
                <span className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">Registered Account</span>
                <span className="text-slate-300 font-semibold block">{user.email}</span>
                <span className="text-slate-400 block mt-1">Role Assigned: {user.role}</span>
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  onClick={() => {
                    localStorage.removeItem('biotrack_token');
                    window.location.reload();
                  }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-white/5 transition-all"
                >
                  Logout / Back to Sign In
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Main Navigation Sidebar */}
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
            
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header Navbar */}
              <Navbar 
                onMenuClick={() => setSidebarOpen(true)} 
                onOpenScanner={() => setScannerOpen(true)}
              />
              
              {/* Content Pages */}
              <main className="flex-grow overflow-y-auto">
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/equipment" element={<EquipmentList />} />
                    <Route path="/maintenance" element={<MaintenanceList />} />
                    <Route path="/breakdowns" element={<BreakdownList />} />
                    <Route path="/calibration" element={<CalibrationList />} />
                    <Route path="/inventory" element={<PartsInventory />} />
                    <Route path="/insights" element={<AIInsights />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/contracts" element={<ContractsList />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/calendar" element={<CalendarView />} />
                    
                    {/* Admin center */}
                    <Route 
                      path="/admin" 
                      element={
                        <ProtectedRoute allowedRoles={['Administrator']}>
                          <AdminPanel />
                        </ProtectedRoute>
                      } 
                    />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </main>
            </div>
          </div>
        )
      ) : (
        /* Auth Screen views */
        <div className="flex-1">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/admin-login" element={<AdminLogin />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};
