import { LayoutDashboard, Briefcase, LogOut, Store, ChevronDown, Plane, Compass } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { CurrencySelector } from '@/components/CurrencySelector';
import { useAuth } from '@/contexts/AuthContext';

export type ViewMode = 'marketplace' | 'admin-login' | 'admin' | 'partner-login' | 'partner-signup' | 'partner' | 'traveler-login' | 'traveler-signup';

interface HeaderProps {
  view: ViewMode;
  onNavigate: (view: ViewMode) => void;
}

export function Header({ view, onNavigate }: HeaderProps) {
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isMarketplace = view === 'marketplace';
  const isAdminView = view === 'admin';
  const isPartnerView = view === 'partner';
  const isAuthPage = view === 'admin-login' || view === 'partner-login' || view === 'partner-signup' || view === 'traveler-login' || view === 'traveler-signup';

  function handleRoleSwitch(target: ViewMode) {
    setMenuOpen(false);
    if (target === 'marketplace') {
      onNavigate('marketplace');
    } else if (target === 'admin' || target === 'admin-login') {
      onNavigate(profile?.role === 'admin' ? 'admin' : 'admin-login');
    } else if (target === 'partner' || target === 'partner-login') {
      onNavigate(profile?.role === 'partner' ? 'partner' : 'partner-login');
    } else if (target === 'traveler-login' || target === 'traveler-signup') {
      onNavigate(profile ? 'marketplace' : 'traveler-login');
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => onNavigate('marketplace')}
          className="flex items-center gap-2.5 transition-transform hover:scale-[1.02]"
        >
          <div className="h-11 w-11 overflow-hidden rounded-xl shadow-lg shadow-navy-900/20 ring-1 ring-navy-900/10">
            <img src="/safrati-logo.svg" alt="سفرتي" className="h-full w-full" />
          </div>
          <div className="text-right">
            <div className="text-lg font-extrabold text-navy-900">سفرتي</div>
            <div className="-mt-1 text-[10px] font-medium text-sky-600">SAFRATI</div>
          </div>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          {isMarketplace && <CurrencySelector />}

          {/* Role switcher - always visible */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all sm:px-4 ${
                isMarketplace
                  ? 'bg-sky-50 text-sky-700'
                  : isAdminView
                  ? 'bg-navy-900 text-white'
                  : isPartnerView
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'border border-navy-200 text-navy-700 hover:bg-navy-50'
              }`}
            >
              {isMarketplace && <><Store className="h-4 w-4" /><span className="hidden sm:inline">المتصفح</span></>}
              {isAdminView && <><LayoutDashboard className="h-4 w-4" /><span className="hidden sm:inline">لوحة الإدارة</span></>}
              {isPartnerView && <><Briefcase className="h-4 w-4" /><span className="hidden sm:inline">بوابة الشركات</span></>}
              {isAuthPage && <><Compass className="h-4 w-4" /><span className="hidden sm:inline">تبديل العرض</span></>}
              <ChevronDown className={`h-4 w-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-56 animate-scale-in overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-xl shadow-navy-900/10">
                <div className="border-b border-navy-50 px-4 py-2.5 text-xs font-bold text-navy-300">
                  تبديل العرض
                </div>
                <button
                  onClick={() => handleRoleSwitch('marketplace')}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-sky-50 ${
                    isMarketplace ? 'bg-sky-50 font-bold text-sky-700' : 'text-navy-700'
                  }`}
                >
                  <Store className="h-4 w-4" />
                  <div className="text-right">
                    <div>المتصفح (Customer)</div>
                    <div className="text-xs font-normal text-navy-400">تصفح الباقات والأسعار</div>
                  </div>
                </button>
                <button
                  onClick={() => handleRoleSwitch('traveler-login')}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-sky-50 ${
                    isMarketplace && profile?.role === 'traveler' ? 'bg-sky-50 font-bold text-sky-700' : 'text-navy-700'
                  }`}
                >
                  <Compass className="h-4 w-4" />
                  <div className="text-right">
                    <div>بوابة المسافر (Traveler)</div>
                    <div className="text-xs font-normal text-navy-400">
                      {profile?.role === 'traveler' ? 'متصل' : 'تسجيل دخول أو إنشاء حساب'}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => handleRoleSwitch('admin')}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-navy-50 ${
                    isAdminView ? 'bg-navy-50 font-bold text-navy-800' : 'text-navy-700'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <div className="text-right">
                    <div>لوحة الإدارة (Admin)</div>
                    <div className="text-xs font-normal text-navy-400">
                      {profile?.role === 'admin' ? 'متصل' : 'تسجيل دخول مطلوب'}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => handleRoleSwitch('partner')}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-emerald-50 ${
                    isPartnerView ? 'bg-emerald-50 font-bold text-emerald-700' : 'text-navy-700'
                  }`}
                >
                  <Briefcase className="h-4 w-4" />
                  <div className="text-right">
                    <div>بوابة الشركات (Partner)</div>
                    <div className="text-xs font-normal text-navy-400">
                      {profile?.role === 'partner' ? 'متصل' : 'تسجيل دخول أو إنشاء حساب'}
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* User info + logout when authenticated */}
          {profile && (isAdminView || isPartnerView || (isMarketplace && profile.role !== 'traveler')) && (
            <>
              <div className="hidden text-sm md:block">
                <span className="text-navy-400">مرحباً، </span>
                <span className="font-bold text-navy-800">{profile.full_name || profile.email}</span>
              </div>
              <button
                onClick={() => {
                  signOut();
                  onNavigate('marketplace');
                }}
                className="flex items-center gap-1.5 rounded-lg bg-navy-50 px-3 py-2 text-sm font-semibold text-navy-600 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
