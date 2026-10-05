import { useState } from 'react';
import { Mail, Lock, User, Loader2, ArrowRight, Plane, Briefcase, ShieldCheck, Compass } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { ViewMode } from '@/components/Header';

type AuthMode = 'admin-login' | 'partner-login' | 'partner-signup' | 'traveler-login' | 'traveler-signup';

interface AuthPageProps {
  mode: AuthMode;
  onNavigate: (view: ViewMode) => void;
}

export function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = mode === 'admin-login';
  const isSignup = mode === 'partner-signup' || mode === 'traveler-signup';
  const isTraveler = mode === 'traveler-login' || mode === 'traveler-signup';
  const isPartner = mode === 'partner-login' || mode === 'partner-signup';

  const config = isAdmin
    ? { title: 'لوحة إدارة المنصة', subtitle: 'تسجيل دخول مالك المنصة', icon: ShieldCheck, accent: 'navy' }
    : isTraveler
    ? isSignup
      ? { title: 'إنشاء حساب مسافر', subtitle: 'سجّل كمسافر للوصول إلى تفاصيل التواصل وإنشاء طلبات مخصصة', icon: Compass, accent: 'sky' }
      : { title: 'تسجيل دخول المسافر', subtitle: 'سجّل دخولك للوصول إلى أرقام الوكالات وواتساب', icon: Compass, accent: 'sky' }
    : isSignup
    ? { title: 'إنشاء حساب شريك', subtitle: 'انضم إلى سفرتي كوكالة سياحة معتمدة', icon: Briefcase, accent: 'emerald' }
    : { title: 'بوابة الشركاء', subtitle: 'تسجيل دخول الوكالات والشركاء', icon: Briefcase, accent: 'emerald' };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isSignup) {
      const role = isTraveler ? 'traveler' : 'partner';
      const { error } = await signUp(email, password, fullName, role);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        onNavigate(isTraveler ? 'marketplace' : 'partner');
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        onNavigate(isAdmin ? 'admin' : isTraveler ? 'marketplace' : 'partner');
      }
    }
  }

  const accentBg = config.accent === 'navy' ? 'bg-navy-900' : config.accent === 'sky' ? 'bg-sky-600' : 'bg-emerald-600';

  return (
    <div className="flex items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 p-4" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      <div className="relative w-full max-w-md animate-slide-up py-8">
        <button
          onClick={() => onNavigate('marketplace')}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-navy-200 transition-colors hover:text-white"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للمتجر
        </button>

        <div className="rounded-2xl bg-white p-8 shadow-2xl shadow-navy-900/30">
          <div className="mb-6 text-center">
            <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ${accentBg} shadow-lg`}>
              <config.icon className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-xl font-extrabold text-navy-900">{config.title}</h1>
            <p className="mt-1 text-sm text-navy-400">{config.subtitle}</p>
          </div>

          {isAdmin && (
            <div className="mb-5 rounded-xl bg-sky-50 border border-sky-200 p-3 text-xs text-sky-700">
              سجّل الدخول بحساب مالك المنصة للوصول إلى لوحة التحكم.
            </div>
          )}

          {isTraveler && (
            <div className="mb-5 rounded-xl bg-sky-50 border border-sky-200 p-3 text-xs text-sky-700">
              {isSignup
                ? 'أنشئ حساب مسافر مجاناً للوصول إلى أرقام الواتساب المباشرة للوكالات وإرسال طلبات رحلات مخصصة.'
                : 'سجّل دخولك كمسافر للوصول إلى معلومات التواصل المباشر مع الوكالات.'}
            </div>
          )}

          {isPartner && isSignup && (
            <div className="mb-5 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
              يتطلب التسجيل كشريك تقديم رقم السجل التجاري والشهادة الضريبية. ستتم مراجعة طلبك من قبل إدارة المنصة.
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-navy-500">الاسم الكامل</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isTraveler ? 'اسمك الكامل' : 'اسمك أو اسم الوكالة'}
                    className="w-full rounded-xl border border-navy-200 py-2.5 pr-10 pl-4 text-sm outline-none transition-colors focus:border-sky-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-bold text-navy-500">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-navy-200 py-2.5 pr-10 pl-4 text-sm outline-none transition-colors focus:border-sky-500"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-navy-500">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-navy-200 py-2.5 pr-10 pl-4 text-sm outline-none transition-colors focus:border-sky-500"
                  dir="ltr"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold text-white transition-all hover:shadow-lg disabled:opacity-50 ${accentBg}`}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isSignup ? (
                'إنشاء الحساب'
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </form>

          {/* Switch between login/signup within same portal */}
          {!isAdmin && (
            <p className="mt-5 text-center text-sm text-navy-400">
              {isSignup ? (
                <>
                  لديك حساب؟{' '}
                  <button
                    onClick={() => onNavigate(isTraveler ? 'traveler-login' : 'partner-login')}
                    className="font-bold text-sky-600 hover:text-sky-700"
                  >
                    سجّل الدخول
                  </button>
                </>
              ) : (
                <>
                  ليس لديك حساب؟{' '}
                  <button
                    onClick={() => onNavigate(isTraveler ? 'traveler-signup' : 'partner-signup')}
                    className="font-bold text-sky-600 hover:text-sky-700"
                  >
                    أنشئ حساباً
                  </button>
                </>
              )}
            </p>
          )}

          {/* Cross-portal links */}
          <div className="mt-5 space-y-2 border-t border-navy-100 pt-4 text-center">
            {!isTraveler && (
              <button
                onClick={() => onNavigate('traveler-login')}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700"
              >
                <Compass className="ml-1 inline h-3.5 w-3.5" />
                دخول المسافر / إنشاء حساب مسافر
              </button>
            )}
            {!isPartner && !isAdmin && (
              <button
                onClick={() => onNavigate('partner-login')}
                className="block w-full text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                <Briefcase className="ml-1 inline h-3.5 w-3.5" />
                بوابة الشركاء / إنشاء حساب وكالة
              </button>
            )}
            {!isAdmin && (
              <button
                onClick={() => onNavigate('admin-login')}
                className="block w-full text-xs font-semibold text-navy-400 hover:text-sky-600"
              >
                <ShieldCheck className="ml-1 inline h-3.5 w-3.5" />
                دخول إدارة المنصة
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-navy-300">
          <Plane className="h-4 w-4" />
          سفرتي — منصة عروض السفر والسياحة والعلاج والدراسة
        </div>
      </div>
    </div>
  );
}
