import { useMemo, useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Plane, Stethoscope, GraduationCap, X, Loader2, Sparkles, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PackageWithAgency, PackageCategory } from '@/lib/types';
import { CATEGORY_LABELS, GCC_CITIES } from '@/lib/types';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { PackageCard } from '@/components/PackageCard';
import { PackageModal } from '@/components/PackageModal';
import { CustomRequestModal } from '@/components/CustomRequestModal';
import { seedDefaultFeedSources, performLiveSync } from '@/lib/feedAggregator';

const CATEGORIES: { value: PackageCategory; label: string; icon: typeof Plane }[] = [
  { value: 'leisure', label: CATEGORY_LABELS.leisure, icon: Plane },
  { value: 'medical', label: CATEGORY_LABELS.medical, icon: Stethoscope },
  { value: 'study', label: CATEGORY_LABELS.study, icon: GraduationCap },
];

interface MarketplaceProps {
  onLoginRequired: () => void;
}

export function Marketplace({ onLoginRequired }: MarketplaceProps) {
  const { currency } = useCurrency();
  const { profile } = useAuth();
  const isAuthenticated = !!profile;
  const [packages, setPackages] = useState<PackageWithAgency[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PackageWithAgency | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<PackageCategory | 'all'>('all');
  const [destination, setDestination] = useState('all');
  const [destinationCountry, setDestinationCountry] = useState('all');
  const [departureCity, setDepartureCity] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCustomRequest, setShowCustomRequest] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    async function fetchPackages() {
      // 1. Seed default feed sources on first load
      await seedDefaultFeedSources();
      // 2. Run live sync: auto-expire stale offers + aggregate new offers from all active feeds
      await performLiveSync().catch((e) => console.error('Live sync error:', e));
      // 3. Fetch live approved offers
      const { data, error } = await supabase
        .from('packages')
        .select('*, agency:agencies(*)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching packages:', error);
      } else {
        setPackages((data ?? []) as PackageWithAgency[]);
      }
      setLoading(false);
    }

    fetchPackages();
    // Poll every 60 seconds to keep offers in sync with live feed
    interval = setInterval(fetchPackages, 60000);
    return () => clearInterval(interval);
  }, []);

  const destinations = useMemo(() => {
    const set = new Set(packages.map((p) => p.destination));
    return Array.from(set).sort();
  }, [packages]);

  const destinationCountries = useMemo(() => {
    const set = new Set(packages.map((p) => p.destination_country).filter(Boolean));
    return Array.from(set).sort();
  }, [packages]);

  const filtered = useMemo(() => {
    const now = new Date();
    return packages.filter((pkg) => {
      // Client-side expiry guard: hide offers past their expiry date
      if (pkg.expires_at && new Date(pkg.expires_at) < now) return false;
      if (category !== 'all' && pkg.category !== category) return false;
      if (destination !== 'all' && pkg.destination !== destination) return false;
      if (destinationCountry !== 'all' && pkg.destination_country !== destinationCountry) return false;
      if (departureCity !== 'all' && pkg.departure_city !== departureCity) return false;
      if (search) {
        const q = search.toLowerCase();
        const matches =
          pkg.title.toLowerCase().includes(q) ||
          pkg.description.toLowerCase().includes(q) ||
          pkg.destination.toLowerCase().includes(q) ||
          pkg.destination_country.toLowerCase().includes(q) ||
          pkg.departure_city.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [packages, category, destination, destinationCountry, departureCity, search]);

  const activeFilterCount =
    (category !== 'all' ? 1 : 0) + (destination !== 'all' ? 1 : 0) + (destinationCountry !== 'all' ? 1 : 0) + (departureCity !== 'all' ? 1 : 0);

  function clearFilters() {
    setCategory('all');
    setDestination('all');
    setDestinationCountry('all');
    setDepartureCity('all');
    setSearch('');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-sky-400 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-sky-500 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-2xl shadow-lg ring-1 ring-white/20">
              <img src="/safrati-logo.svg" alt="سفرتي" className="h-full w-full" />
            </div>
            <h1 className="mb-3 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
              سفرتي — رحلتك القادمة تبدأ هنا
            </h1>
            <p className="mb-8 text-base text-navy-200 sm:text-lg">
              اكتشف أفضل باقات السياحة والسياحة العلاجية والدراسة بالخارج من جميع أنحاء الخليج
            </p>

            <div className="mx-auto max-w-2xl">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-navy-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث عن وجهة، دولة، مدينة، أو نوع الباقة..."
                  className="w-full rounded-2xl border-0 bg-white py-4 pr-12 pl-4 text-sm shadow-2xl shadow-navy-900/30 outline-none ring-2 ring-transparent transition-all focus:ring-sky-400"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setShowCustomRequest(true)}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-sky-400 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/30 transition-all hover:scale-105 hover:shadow-sky-500/50"
              >
                <Sparkles className="h-4 w-4" />
                أنشئ طلب رحلة مخصصة
              </button>
              {!isAuthenticated && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-navy-200">
                  <Lock className="h-3.5 w-3.5" />
                  التسجيل مطلوب
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(category === cat.value ? 'all' : cat.value)}
                  className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all ${
                    category === cat.value
                      ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                      : 'bg-white/10 text-white backdrop-blur-md hover:bg-white/20'
                  }`}
                >
                  <cat.icon className="h-4 w-4" />
                  {cat.label}
                </button>
              ))}
            </div>

            {destinationCountries.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {destinationCountries.slice(0, 10).map((country) => (
                  <button
                    key={country}
                    onClick={() => setDestinationCountry(destinationCountry === country ? 'all' : country)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                      destinationCountry === country
                        ? 'bg-sky-400 text-white shadow-md'
                        : 'bg-white/5 text-navy-200 backdrop-blur-md hover:bg-white/15'
                    }`}
                  >
                    {country}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-700 transition-colors hover:border-sky-400 hover:bg-sky-50"
            >
              <SlidersHorizontal className="h-4 w-4" />
              فلترة
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-xs text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm font-semibold text-navy-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
                مسح الفلاتر
              </button>
            )}
          </div>
          <span className="text-sm font-semibold text-navy-500">
            {filtered.length} باقة
          </span>
        </div>

        {showFilters && (
          <div className="mb-6 animate-slide-up rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-navy-500">الدولة</label>
                <select
                  value={destinationCountry}
                  onChange={(e) => setDestinationCountry(e.target.value)}
                  className="w-full rounded-xl border border-navy-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-500"
                >
                  <option value="all">جميع الدول</option>
                  {destinationCountries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-navy-500">الوجهة</label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full rounded-xl border border-navy-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-500"
                >
                  <option value="all">جميع الوجهات</option>
                  {destinations.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-navy-500">مدينة الانطلاق</label>
                <select
                  value={departureCity}
                  onChange={(e) => setDepartureCity(e.target.value)}
                  className="w-full rounded-xl border border-navy-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-500"
                >
                  <option value="all">جميع المدن</option>
                  {GCC_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-navy-500">التصنيف</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PackageCategory | 'all')}
                  className="w-full rounded-xl border border-navy-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-500"
                >
                  <option value="all">جميع التصنيفات</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            <p className="mt-3 text-sm text-navy-400">جارٍ تحميل الباقات...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-100">
              <Search className="h-8 w-8 text-navy-400" />
            </div>
            <h3 className="mb-1 text-lg font-bold text-navy-700">لا توجد باقات مطابقة</h3>
            <p className="text-sm text-navy-400">جرّب تعديل الفلاتر أو البحث بكلمات أخرى</p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-4 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky-600"
              >
                مسح الفلاتر
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} onClick={() => setSelected(pkg)} isAuthenticated={isAuthenticated} />
            ))}
          </div>
        )}
      </div>

      <PackageModal pkg={selected} onClose={() => setSelected(null)} isAuthenticated={isAuthenticated} onLoginRequired={onLoginRequired} />
      <CustomRequestModal open={showCustomRequest} onClose={() => setShowCustomRequest(false)} isAuthenticated={isAuthenticated} onLoginRequired={onLoginRequired} />

      <footer className="border-t border-navy-100 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-3 h-10 w-10 overflow-hidden rounded-xl shadow-md ring-1 ring-navy-900/10">
            <img src="/safrati-logo.svg" alt="سفرتي" className="h-full w-full" />
          </div>
          <p className="text-sm font-bold text-navy-700">سفرتي © 2026</p>
          <p className="mt-1 text-sm text-navy-400">
          </p>
          <p className="mt-1 text-xs text-navy-300">
            الأسعار معروضة بعملة الوكالة الأصلية • التحويل تقريبي لأغراض العرض
          </p>
        </div>
      </footer>
    </div>
  );
}
