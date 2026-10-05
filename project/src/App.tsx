import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { Header, type ViewMode } from '@/components/Header';
import { Marketplace } from '@/pages/Marketplace';
import { AuthPage } from '@/pages/AuthPage';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { PartnerDashboard } from '@/pages/PartnerDashboard';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';

function AppContent() {
  const { profile, loading } = useAuth();
  const [view, setView] = useState<ViewMode>('marketplace');

  useEffect(() => {
    if (loading) return;
    if (profile) {
      if (profile.role === 'admin' && view === 'admin-login') {
        setView('admin');
      } else if (profile.role === 'partner' && (view === 'partner-login' || view === 'partner-signup')) {
        setView('partner');
      } else if (profile.role === 'traveler' && (view === 'traveler-login' || view === 'traveler-signup')) {
        setView('marketplace');
      } else if (profile.role === 'admin' && view === 'partner') {
        setView('admin');
      } else if (profile.role === 'partner' && view === 'admin') {
        setView('partner');
      } else if (profile.role === 'traveler' && (view === 'admin' || view === 'partner')) {
        setView('marketplace');
      } else if (profile.role === 'partner' && (view === 'traveler-login' || view === 'traveler-signup')) {
        setView('partner');
      } else if (profile.role === 'admin' && (view === 'traveler-login' || view === 'traveler-signup')) {
        setView('admin');
      }
    } else {
      if (view === 'admin' || view === 'partner') {
        setView('marketplace');
      }
    }
  }, [profile, loading, view]);

  function handleNavigate(newView: ViewMode) {
    if (profile) {
      if (newView === 'admin-login' || newView === 'admin') {
        setView(profile.role === 'admin' ? 'admin' : 'admin-login');
        return;
      }
      if (newView === 'partner-login' || newView === 'partner' || newView === 'partner-signup') {
        setView(profile.role === 'partner' ? 'partner' : 'partner-login');
        return;
      }
      if (newView === 'traveler-login' || newView === 'traveler-signup') {
        setView(profile.role === 'traveler' ? 'marketplace' : 'traveler-login');
        return;
      }
    }
    setView(newView);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-800 to-sky-500 shadow-lg overflow-hidden">
            <img src="/safrati-logo.svg" alt="سفرتي" className="h-full w-full" />
          </div>
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-navy-200 border-t-sky-500" />
          <p className="text-sm font-semibold text-navy-400">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header view={view} onNavigate={handleNavigate} />
      {view === 'marketplace' && <Marketplace onLoginRequired={() => setView('traveler-login')} />}
      {view === 'admin-login' && <AuthPage mode="admin-login" onNavigate={handleNavigate} />}
      {view === 'partner-login' && <AuthPage mode="partner-login" onNavigate={handleNavigate} />}
      {view === 'partner-signup' && <AuthPage mode="partner-signup" onNavigate={handleNavigate} />}
      {view === 'traveler-login' && <AuthPage mode="traveler-login" onNavigate={handleNavigate} />}
      {view === 'traveler-signup' && <AuthPage mode="traveler-signup" onNavigate={handleNavigate} />}
      {view === 'admin' && profile?.role === 'admin' && <AdminDashboard />}
      {view === 'partner' && profile?.role === 'partner' && <PartnerDashboard />}
      {view === 'partner' && profile?.role === 'admin' && <AdminDashboard />}
      <PwaInstallPrompt />
    </div>
  );
}

export default function App() {
  return (
    <CurrencyProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </CurrencyProvider>
  );
}
