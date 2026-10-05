import { useEffect, useState, useCallback } from 'react';
import {
  Package2, Building2, MessageCircle, Layers, CheckCircle2, XCircle,
  Trash2, Edit3, Loader2, X, Plane, Stethoscope, GraduationCap,
  Clock, User, Search, TrendingUp, DollarSign, Filter, Eye, Phone,
  Plus, Inbox, Trash2 as TrashIcon, FileCheck, ShieldCheck, ExternalLink,
  RefreshCw, CalendarClock, Timer, Zap, Database, Activity, Globe, Power,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Agency, Package, PackageWithAgency, PackageCategory, PackageStatus, Inquiry, TripRequest, TripRequestStatus } from '@/lib/types';
import { CATEGORY_LABELS, STATUS_LABELS, formatPrice, GCC_CITIES, GCC_COUNTRIES, TRIP_REQUEST_STATUS_LABELS, formatExpiryMonth, getDaysUntilExpiry, COUNTRY_CURRENCY_MAP } from '@/lib/types';
import { useCurrency } from '@/contexts/CurrencyContext';
import { seedDefaultFeedSources, runFeedImport, runAllActiveFeeds, performLiveSync, type FeedSource, type FeedImport } from '@/lib/feedAggregator';

type Tab = 'overview' | 'packages' | 'agencies' | 'inquiries' | 'requests' | 'sync' | 'feeds';

export function AdminDashboard() {
  const { currency } = useCurrency();
  const [tab, setTab] = useState<Tab>('overview');
  const [packages, setPackages] = useState<PackageWithAgency[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [inquiries, setInquiries] = useState<(Inquiry & { package?: Package; agency?: Agency })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPkg, setEditingPkg] = useState<Package | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pkgSearch, setPkgSearch] = useState('');
  const [pkgStatusFilter, setPkgStatusFilter] = useState<PackageStatus | 'all'>('all');
  const [pkgCategoryFilter, setPkgCategoryFilter] = useState<PackageCategory | 'all'>('all');
  const [agencySearch, setAgencySearch] = useState('');
  const [inqSearch, setInqSearch] = useState('');
  const [tripRequests, setTripRequests] = useState<TripRequest[]>([]);
  const [reqSearch, setReqSearch] = useState('');
  const [reqStatusFilter, setReqStatusFilter] = useState<TripRequestStatus | 'all'>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [expiringSoonCount, setExpiringSoonCount] = useState(0);

  const fetchData = useCallback(async () => {
    const [pkgResult, agencyResult, inquiryResult, reqResult] = await Promise.all([
      supabase.from('packages').select('*, agency:agencies(*)').order('created_at', { ascending: false }),
      supabase.from('agencies').select('*').order('created_at', { ascending: false }),
      supabase.from('inquiries').select('*, package:packages(*), agency:agencies(*)').order('created_at', { ascending: false }).limit(100),
      supabase.from('trip_requests').select('*').order('created_at', { ascending: false }),
    ]);
    setPackages((pkgResult.data ?? []) as PackageWithAgency[]);
    setAgencies((agencyResult.data ?? []) as Agency[]);
    setInquiries((inquiryResult.data ?? []) as (Inquiry & { package?: Package; agency?: Agency })[]);
    setTripRequests((reqResult.data ?? []) as TripRequest[]);

    // Count offers expiring within 7 days
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 86400000);
    setExpiringSoonCount(
      (pkgResult.data ?? []).filter((p: { expires_at: string | null; status: string }) =>
        p.expires_at && new Date(p.expires_at) >= now && new Date(p.expires_at) <= sevenDays && p.status === 'approved'
      ).length
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function updatePackageStatus(id: string, status: PackageStatus) {
    const { error } = await supabase.from('packages').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { alert('حدث خطأ: ' + error.message); return; }
    fetchData();
  }

  async function toggleAgencyApproval(agency: Agency) {
    const { error } = await supabase.from('agencies').update({ approved: !agency.approved }).eq('id', agency.id);
    if (error) { alert('حدث خطأ: ' + error.message); return; }
    fetchData();
  }

  async function deletePackage(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذه الباقة نهائياً؟')) return;
    const { error } = await supabase.from('packages').delete().eq('id', id);
    if (error) { alert('حدث خطأ: ' + error.message); return; }
    fetchData();
  }

  async function deleteAgency(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذه الوكالة؟ سيتم حذف جميع باقاتها.')) return;
    const { error } = await supabase.from('agencies').delete().eq('id', id);
    if (error) { alert('حدث خطأ: ' + error.message); return; }
    fetchData();
  }

  const stats = {
    totalPackages: packages.length,
    approvedPackages: packages.filter((p) => p.status === 'approved').length,
    pendingPackages: packages.filter((p) => p.status === 'pending').length,
    rejectedPackages: packages.filter((p) => p.status === 'rejected').length,
    expiredPackages: packages.filter((p) => p.status === 'expired').length,
    totalAgencies: agencies.length,
    approvedAgencies: agencies.filter((a) => a.approved).length,
    pendingAgencies: agencies.filter((a) => !a.approved).length,
    totalInquiries: inquiries.length,
    totalRequests: tripRequests.length,
    openRequests: tripRequests.filter((r) => r.status === 'open').length,
    leisure: packages.filter((p) => p.category === 'leisure').length,
    medical: packages.filter((p) => p.category === 'medical').length,
    study: packages.filter((p) => p.category === 'study').length,
    totalRevenue: packages.filter((p) => p.status === 'approved').reduce((sum, p) => sum + p.price_sar, 0),
    avgPrice: packages.length > 0 ? Math.round(packages.reduce((sum, p) => sum + p.price_sar, 0) / packages.length) : 0,
  };

  const filteredPackages = packages.filter((pkg) => {
    if (pkgStatusFilter !== 'all' && pkg.status !== pkgStatusFilter) return false;
    if (pkgCategoryFilter !== 'all' && pkg.category !== pkgCategoryFilter) return false;
    if (pkgSearch) {
      const q = pkgSearch.toLowerCase();
      if (!pkg.title.toLowerCase().includes(q) &&
          !pkg.destination.toLowerCase().includes(q) &&
          !pkg.agency?.name.toLowerCase().includes(q) &&
          !pkg.departure_city.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredAgencies = agencies.filter((a) => {
    if (!agencySearch) return true;
    const q = agencySearch.toLowerCase();
    return a.name.toLowerCase().includes(q) ||
           a.contact_name.toLowerCase().includes(q) ||
           a.city.toLowerCase().includes(q) ||
           a.email.toLowerCase().includes(q);
  });

  const filteredInquiries = inquiries.filter((inq) => {
    if (!inqSearch) return true;
    const q = inqSearch.toLowerCase();
    return inq.customer_name.toLowerCase().includes(q) ||
           inq.customer_phone.includes(q) ||
           inq.agency?.name.toLowerCase().includes(q) ||
           inq.package?.title.toLowerCase().includes(q);
  });

  const filteredRequests = tripRequests.filter((req) => {
    if (reqStatusFilter !== 'all' && req.status !== reqStatusFilter) return false;
    if (reqSearch) {
      const q = reqSearch.toLowerCase();
      return req.customer_name.toLowerCase().includes(q) ||
             req.destination.toLowerCase().includes(q) ||
             req.departure_city.toLowerCase().includes(q) ||
             req.customer_phone.includes(q);
    }
    return true;
  });

  async function deleteRequest(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    const { error } = await supabase.from('trip_requests').delete().eq('id', id);
    if (error) { alert('حدث خطأ: ' + error.message); return; }
    fetchData();
  }

  async function updateRequestStatus(id: string, status: TripRequestStatus) {
    const { error } = await supabase.from('trip_requests').update({ status }).eq('id', id);
    if (error) { alert('حدث خطأ: ' + error.message); return; }
    fetchData();
  }

  const agencyPackageCounts = agencies.map((a) => ({
    ...a,
    pkgCount: packages.filter((p) => p.agency_id === a.id).length,
    approvedCount: packages.filter((p) => p.agency_id === a.id && p.status === 'approved').length,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-navy-900">لوحة تحكم الإدارة</h1>
        <p className="mt-1 text-sm text-navy-400">التحكم الكامل في الباقات والوكالات والاستفسارات</p>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto scrollbar-hide">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} icon={Layers} label="نظرة عامة" />
        <TabButton active={tab === 'packages'} onClick={() => setTab('packages')} icon={Package2} label={`الباقات (${stats.totalPackages})`} />
        <TabButton active={tab === 'agencies'} onClick={() => setTab('agencies')} icon={Building2} label={`الوكالات (${stats.totalAgencies})`} />
        <TabButton active={tab === 'inquiries'} onClick={() => setTab('inquiries')} icon={MessageCircle} label={`الاستفسارات (${stats.totalInquiries})`} />
        <TabButton active={tab === 'requests'} onClick={() => setTab('requests')} icon={Inbox} label={`طلبات مخصصة (${stats.totalRequests})`} />
        <TabButton active={tab === 'sync'} onClick={() => setTab('sync')} icon={Zap} label="مزامنة حية" />
        <TabButton active={tab === 'feeds'} onClick={() => setTab('feeds')} icon={Database} label="مصادر التغذية" />
      </div>

      {tab === 'overview' && (
        <div className="animate-fade-in space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="إجمالي الباقات" value={stats.totalPackages} icon={Package2} color="navy" />
            <StatCard label="وكالات معتمدة" value={stats.approvedAgencies} icon={Building2} color="emerald" />
            <StatCard label="إجمالي الاستفسارات" value={stats.totalInquiries} icon={MessageCircle} color="sky" />
            <StatCard label="طلبات مخصصة" value={stats.totalRequests} icon={Inbox} color="red" />
            <StatCard label="عروض تنتهي قريباً" value={expiringSoonCount} icon={Timer} color="amber" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <RevenueCard
              label="إجمالي قيمة الباقات المعتمدة"
              value={formatPrice(stats.totalRevenue, currency)}
              icon={DollarSign}
            />
            <RevenueCard
              label="متوسط سعر الباقة"
              value={formatPrice(stats.avgPrice, currency)}
              icon={TrendingUp}
            />
            <RevenueCard
              label="متوسط الباقات لكل وكالة"
              value={agencies.length > 0 ? (stats.totalPackages / agencies.length).toFixed(1) : '0'}
              icon={Package2}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-bold text-navy-800">توزيع التصنيفات</h3>
              <div className="space-y-3">
                <CategoryBar label="سياحة وترفيه" count={stats.leisure} total={stats.totalPackages} color="bg-sky-500" icon={Plane} />
                <CategoryBar label="سياحة علاجية" count={stats.medical} total={stats.totalPackages} color="bg-emerald-500" icon={Stethoscope} />
                <CategoryBar label="دراسة بالخارج" count={stats.study} total={stats.totalPackages} color="bg-amber-500" icon={GraduationCap} />
              </div>
            </div>

            <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-bold text-navy-800">حالة الباقات</h3>
              <div className="space-y-3">
                <StatusRow label="معتمدة" count={stats.approvedPackages} color="text-emerald-600" icon={CheckCircle2} />
                <StatusRow label="بانتظار الموافقة" count={stats.pendingPackages} color="text-amber-600" icon={Clock} />
                <StatusRow label="مرفوضة" count={stats.rejectedPackages} color="text-red-600" icon={XCircle} />
                <StatusRow label="منتهية" count={stats.expiredPackages} color="text-navy-500" icon={Clock} />
              </div>
            </div>

            <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-bold text-navy-800">أحدث الاستفسارات</h3>
              <div className="space-y-3">
                {inquiries.slice(0, 5).map((inq) => (
                  <div key={inq.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-navy-800">{inq.customer_name}</div>
                      <div className="truncate text-xs text-navy-400">{inq.package?.title ?? '—'}</div>
                    </div>
                    <span className="shrink-0 text-xs text-navy-300">
                      {new Date(inq.created_at).toLocaleDateString('ar')}
                    </span>
                  </div>
                ))}
                {inquiries.length === 0 && <p className="text-sm text-navy-400">لا توجد استفسارات</p>}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-bold text-navy-800">أداء الوكالات</h3>
            <div className="space-y-2">
              {agencyPackageCounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl bg-navy-50/50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
                      <Building2 className="h-5 w-5 text-navy-600" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-navy-800">{a.name}</div>
                      <div className="text-xs text-navy-400">{a.city}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-navy-900">{a.pkgCount}</div>
                      <div className="text-xs text-navy-400">باقة</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-emerald-600">{a.approvedCount}</div>
                      <div className="text-xs text-navy-400">معتمدة</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      a.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {a.approved ? 'معتمد' : 'معلق'}
                    </span>
                  </div>
                </div>
              ))}
              {agencies.length === 0 && <p className="text-sm text-navy-400">لا توجد وكالات</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'packages' && (
        <div className="animate-fade-in space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy-800">إدارة الباقات</h2>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" />
              إضافة باقة جديدة
            </button>
          </div>
          <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                <input
                  value={pkgSearch}
                  onChange={(e) => setPkgSearch(e.target.value)}
                  placeholder="ابحث بالعنوان، الوجهة، الوكالة..."
                  className="w-full rounded-xl border border-navy-200 py-2.5 pr-10 pl-4 text-sm outline-none focus:border-sky-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={pkgStatusFilter}
                  onChange={(e) => setPkgStatusFilter(e.target.value as PackageStatus | 'all')}
                  className="rounded-xl border border-navy-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
                >
                  <option value="all">كل الحالات</option>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <select
                  value={pkgCategoryFilter}
                  onChange={(e) => setPkgCategoryFilter(e.target.value as PackageCategory | 'all')}
                  className="rounded-xl border border-navy-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
                >
                  <option value="all">كل التصنيفات</option>
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-2 text-xs text-navy-400">
              عرض {filteredPackages.length} من {packages.length} باقة
            </div>
          </div>

          {filteredPackages.length === 0 ? (
            <EmptyState icon={Package2} text="لا توجد باقات مطابقة" />
          ) : (
            <div className="space-y-3">
              {filteredPackages.map((pkg) => (
                <div key={pkg.id} className="rounded-xl border border-navy-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-50">
                      {pkg.category === 'leisure' && <Plane className="h-6 w-6 text-sky-600" />}
                      {pkg.category === 'medical' && <Stethoscope className="h-6 w-6 text-emerald-600" />}
                      {pkg.category === 'study' && <GraduationCap className="h-6 w-6 text-amber-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold text-navy-900">{pkg.title}</h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-navy-400">
                        <span className="font-semibold text-sky-600">{CATEGORY_LABELS[pkg.category]}</span>
                        <span>•</span>
                        <span>{pkg.destination}, {pkg.destination_country}</span>
                        <span>•</span>
                        <span>من {pkg.departure_city}</span>
                        <span>•</span>
                        <span>{pkg.agency?.name ?? '—'}</span>
                        <span>•</span>
                        <span className="font-bold text-navy-600">{formatPrice(pkg.price_sar, currency)}</span>
                        {pkg.expires_at && (
                          <span>•</span>
                        )}
                        {pkg.expires_at && (() => {
                          const daysLeft = getDaysUntilExpiry(pkg.expires_at);
                          if (daysLeft === null) return null;
                          if (daysLeft < 0) return <span className="font-bold text-red-500">منتهي</span>;
                          if (daysLeft <= 7) return <span className="font-bold text-amber-600">ينتهي خلال {daysLeft} يوم</span>;
                          return <span className="text-navy-400">صالح حتى: {formatExpiryMonth(pkg.expires_at)}</span>;
                        })()}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusColors[pkg.status]}`}>
                      {STATUS_LABELS[pkg.status]}
                    </span>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      {pkg.status !== 'approved' && (
                        <button onClick={() => updatePackageStatus(pkg.id, 'approved')} className="flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 transition-colors hover:bg-emerald-100">
                          <CheckCircle2 className="h-3.5 w-3.5" /> اعتماد
                        </button>
                      )}
                      {pkg.status !== 'rejected' && (
                        <button onClick={() => updatePackageStatus(pkg.id, 'rejected')} className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100">
                          <XCircle className="h-3.5 w-3.5" /> رفض
                        </button>
                      )}
                      <button onClick={() => { setEditingPkg(pkg); setShowEditForm(true); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-500 transition-colors hover:bg-sky-50 hover:text-sky-600">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button onClick={() => deletePackage(pkg.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-500 transition-colors hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'agencies' && (
        <div className="animate-fade-in space-y-4">
          <div className="rounded-xl bg-gradient-to-r from-navy-900 to-sky-700 p-4 text-white">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-sky-300" />
              <span className="font-bold">مراجعة واعتماد الوكالات</span>
            </div>
            <p className="mt-1 text-xs text-navy-200">راجع البيانات القانونية والضريبية للوكالات قبل الاعتماد. تحقق من رقم السجل التجاري والشهادة الضريبية.</p>
          </div>

          <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
              <input
                value={agencySearch}
                onChange={(e) => setAgencySearch(e.target.value)}
                placeholder="ابحث باسم الوكالة، المسؤول، المدينة، الرقم التجاري..."
                className="w-full rounded-xl border border-navy-200 py-2.5 pr-10 pl-4 text-sm outline-none focus:border-sky-500"
              />
            </div>
            <div className="mt-2 text-xs text-navy-400">
              عرض {filteredAgencies.length} من {agencies.length} وكالة
            </div>
          </div>

          {filteredAgencies.length === 0 ? (
            <EmptyState icon={Building2} text="لا توجد وكالات مطابقة" />
          ) : (
            <div className="space-y-3">
              {filteredAgencies.map((a) => {
                const aPkgs = packages.filter((p) => p.agency_id === a.id);
                const aApproved = aPkgs.filter((p) => p.status === 'approved').length;
                const aPending = aPkgs.filter((p) => p.status === 'pending').length;
                return (
                  <div key={a.id} className="rounded-xl border border-navy-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50">
                            <Building2 className="h-6 w-6 text-navy-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-navy-900">{a.name}</h3>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-navy-400">
                              <span className="flex items-center gap-1"><User className="h-3 w-3" /> {a.contact_name}</span>
                              <span>•</span>
                              <span>{a.country} — {a.city}</span>
                              <span>•</span>
                              <span dir="ltr" className="flex items-center gap-1"><Phone className="h-3 w-3" /> {a.whatsapp_number}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${a.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {a.approved ? 'معتمد' : 'معلق'}
                        </span>
                      </div>

                      {/* Tax & compliance info */}
                      <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-3">
                        <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-amber-800">
                          <FileCheck className="h-3.5 w-3.5" />
                          البيانات القانونية والضريبية
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                          <div>
                            <span className="text-xs text-navy-400">رقم السجل التجاري: </span>
                            <span className="font-bold text-navy-800" dir="ltr">{a.commercial_reg_number || '—'}</span>
                          </div>
                          <div>
                            <span className="text-xs text-navy-400">الرقم الضريبي (VAT): </span>
                            <span className="font-bold text-navy-800" dir="ltr">{a.tax_cert_number || '—'}</span>
                          </div>
                        </div>
                        {a.tax_cert_url && (
                          <a href={a.tax_cert_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700">
                            <ExternalLink className="h-3 w-3" />
                            عرض الشهادة الضريبية
                          </a>
                        )}
                        {a.description && <p className="mt-2 text-xs text-navy-500">{a.description}</p>}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex gap-2 text-xs">
                          <span className="rounded-lg bg-navy-50 px-2.5 py-1 font-bold text-navy-600">{aPkgs.length} باقة</span>
                          <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-bold text-emerald-600">{aApproved} معتمدة</span>
                          {aPending > 0 && <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-bold text-amber-600">{aPending} بانتظار</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleAgencyApproval(a)} className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${a.approved ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
                            {a.approved ? 'تعليق الاعتماد' : 'اعتماد الوكالة'}
                          </button>
                          <button onClick={() => deleteAgency(a.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-500 transition-colors hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'inquiries' && (
        <div className="animate-fade-in space-y-4">
          <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
              <input
                value={inqSearch}
                onChange={(e) => setInqSearch(e.target.value)}
                placeholder="ابحث باسم العميل، الهاتف، الوكالة، الباقة..."
                className="w-full rounded-xl border border-navy-200 py-2.5 pr-10 pl-4 text-sm outline-none focus:border-sky-500"
              />
            </div>
            <div className="mt-2 text-xs text-navy-400">
              عرض {filteredInquiries.length} من {inquiries.length} استفسار
            </div>
          </div>

          {filteredInquiries.length === 0 ? (
            <EmptyState icon={MessageCircle} text="لا توجد استفسارات مطابقة" />
          ) : (
            <div className="space-y-3">
              {filteredInquiries.map((inq) => (
                <div key={inq.id} className="rounded-xl border border-navy-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50">
                      <User className="h-5 w-5 text-sky-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-navy-900">{inq.customer_name}</h3>
                        <span className="text-xs text-navy-400">{new Date(inq.created_at).toLocaleDateString('ar')}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-navy-400">
                        <span dir="ltr" className="flex items-center gap-1"><Phone className="h-3 w-3" /> {inq.customer_phone}</span>
                        <span>•</span>
                        <span>{inq.agency?.name ?? '—'}</span>
                        <span>•</span>
                        <span>{inq.package?.title ?? '—'}</span>
                      </div>
                      {inq.message && <p className="mt-2 rounded-lg bg-navy-50 p-2.5 text-sm text-navy-600">{inq.message}</p>}
                    </div>
                    <a
                      href={`https://wa.me/${inq.customer_phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-emerald-600 transition-colors hover:bg-emerald-50"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div className="animate-fade-in space-y-4">
          <div className="rounded-xl bg-gradient-to-r from-navy-900 to-sky-700 p-4 text-white">
            <div className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-sky-300" />
              <span className="font-bold">طلبات الرحلات المخصصة</span>
            </div>
            <p className="mt-1 text-xs text-navy-200">جميع الطلبات المخصصة المرسلة من العملاء. يمكنكم الإشراف والحذف وتغيير الحالة.</p>
          </div>

          <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                <input value={reqSearch} onChange={(e) => setReqSearch(e.target.value)} placeholder="ابحث بالاسم، الهاتف، الوجهة..." className="w-full rounded-xl border border-navy-200 py-2.5 pr-10 pl-4 text-sm outline-none focus:border-sky-500" />
              </div>
              <select value={reqStatusFilter} onChange={(e) => setReqStatusFilter(e.target.value as TripRequestStatus | 'all')} className="rounded-xl border border-navy-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500">
                <option value="all">كل الحالات</option>
                <option value="open">مفتوح</option>
                <option value="responded">تم الرد</option>
                <option value="closed">مغلق</option>
              </select>
            </div>
            <div className="mt-2 text-xs text-navy-400">عرض {filteredRequests.length} من {tripRequests.length} طلب</div>
          </div>

          {filteredRequests.length === 0 ? (
            <EmptyState icon={Inbox} text="لا توجد طلبات مخصصة مطابقة" />
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req) => (
                <div key={req.id} className="rounded-xl border border-navy-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50">
                          {req.category === 'leisure' && <Plane className="h-5 w-5 text-sky-600" />}
                          {req.category === 'medical' && <Stethoscope className="h-5 w-5 text-emerald-600" />}
                          {req.category === 'study' && <GraduationCap className="h-5 w-5 text-amber-600" />}
                        </div>
                        <div>
                          <h3 className="font-bold text-navy-900">{req.customer_name}</h3>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-navy-400">
                            <span className="font-semibold text-sky-600">{CATEGORY_LABELS[req.category]}</span>
                            <span>•</span>
                            <span dir="ltr" className="flex items-center gap-1"><Phone className="h-3 w-3" /> {req.customer_phone}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                        req.status === 'open' ? 'bg-emerald-100 text-emerald-700' : req.status === 'responded' ? 'bg-sky-100 text-sky-700' : 'bg-navy-100 text-navy-500'
                      }`}>{TRIP_REQUEST_STATUS_LABELS[req.status]}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      {req.destination && (
                        <div className="rounded-lg bg-navy-50 px-3 py-2">
                          <div className="text-xs text-navy-400">الوجهة</div>
                          <div className="font-bold text-navy-800">{req.destination}</div>
                        </div>
                      )}
                      <div className="rounded-lg bg-navy-50 px-3 py-2">
                        <div className="text-xs text-navy-400">الانطلاق</div>
                        <div className="font-bold text-navy-800">{req.departure_city}</div>
                      </div>
                      <div className="rounded-lg bg-navy-50 px-3 py-2">
                        <div className="text-xs text-navy-400">المسافرون</div>
                        <div className="font-bold text-navy-800">{req.travelers}</div>
                      </div>
                      <div className="rounded-lg bg-navy-50 px-3 py-2">
                        <div className="text-xs text-navy-400">الميزانية</div>
                        <div className="font-bold text-navy-800">{formatPrice(req.budget_sar, currency)}</div>
                      </div>
                    </div>

                    {req.notes && <p className="rounded-lg bg-amber-50 border border-amber-100 p-2.5 text-sm text-navy-600">{req.notes}</p>}

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-navy-50 pt-3">
                      <span className="text-xs text-navy-400">{new Date(req.created_at).toLocaleDateString('ar')}</span>
                      <div className="flex gap-2">
                        {req.status !== 'closed' && (
                          <button onClick={() => updateRequestStatus(req.id, 'closed')} className="rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-bold text-navy-500 transition-colors hover:bg-navy-100">إغلاق</button>
                        )}
                        {req.status === 'closed' && (
                          <button onClick={() => updateRequestStatus(req.id, 'open')} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 transition-colors hover:bg-emerald-100">إعادة فتح</button>
                        )}
                        <button onClick={() => deleteRequest(req.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-500 transition-colors hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'sync' && (
        <div className="animate-fade-in space-y-6">
          <div className="rounded-2xl bg-gradient-to-r from-navy-900 to-sky-700 p-6 text-white">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-sky-300" />
              <div>
                <h2 className="text-xl font-extrabold">محرّك المزامنة الحية وإدارة انتهاء العروض</h2>
                <p className="mt-1 text-sm text-navy-200">تحكم في دورة حياة العروض: انتهاء تلقائي، مزامنة حية، وتحديث جماعي لتواريخ الانتهاء</p>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="عروض نشطة" value={stats.approvedPackages} icon={CheckCircle2} color="emerald" />
            <StatCard label="عروض منتهية" value={stats.expiredPackages} icon={XCircle} color="navy" />
            <StatCard label="تنتهي خلال 7 أيام" value={expiringSoonCount} icon={Timer} color="amber" />
            <StatCard label="إجمالي العروض" value={stats.totalPackages} icon={Package2} color="sky" />
          </div>

          {/* Auto-expire action */}
          <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
            <h3 className="mb-2 flex items-center gap-2 font-bold text-navy-800">
              <RefreshCw className="h-5 w-5 text-sky-600" />
              مزامنة وتحديث العروض
            </h3>
            <p className="mb-4 text-sm text-navy-500">
              يقوم النظام تلقائياً بإنهاء العروض المنتهية وإخفائها عن المتجر. اضغط هنا لتنفيذ المزامنة يدوياً وتحديث القائمة فوراً.
            </p>
            <button
              onClick={async () => {
                setSyncing(true);
                setSyncResult(null);
                const { data, error } = await supabase.rpc('auto_expire_packages');
                if (error) {
                  setSyncResult('حدث خطأ: ' + error.message);
                } else {
                  const expiredCount = (data as unknown as { expired_count: number }[])?.[0]?.expired_count ?? 0;
                  setSyncResult(`تمت المزامنة بنجاح. العروض المنتهية إجمالاً: ${expiredCount}`);
                  fetchData();
                }
                setSyncing(false);
              }}
              disabled={syncing}
              className="flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-3 font-bold text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
            >
              {syncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
              {syncing ? 'جارٍ المزامنة...' : 'مزامنة وتحديث الآن'}
            </button>
            {syncResult && (
              <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm font-semibold text-emerald-700">
                {syncResult}
              </div>
            )}
          </div>

          {/* Batch extend expiry */}
          <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
            <h3 className="mb-2 flex items-center gap-2 font-bold text-navy-800">
              <CalendarClock className="h-5 w-5 text-amber-600" />
              تمديد جماعي لتواريخ الانتهاء
            </h3>
            <p className="mb-4 text-sm text-navy-500">
              قم بتمديد تواريخ انتهاء جميع العروض المعتمدة لفترة محددة دفعة واحدة.
            </p>
            <BatchExpiryExtend onDone={fetchData} />
          </div>

          {/* Expiring soon list */}
          <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-navy-800">
              <Timer className="h-5 w-5 text-amber-600" />
              عروض تنتهي قريباً (خلال 7 أيام)
            </h3>
            <div className="space-y-2">
              {packages.filter((p) => {
                if (!p.expires_at || p.status !== 'approved') return false;
                const daysLeft = Math.ceil((new Date(p.expires_at).getTime() - Date.now()) / 86400000);
                return daysLeft >= 0 && daysLeft <= 7;
              }).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl bg-amber-50/50 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-navy-800">{p.title}</div>
                    <div className="text-xs text-navy-400">{p.agency?.name} • {p.destination}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs font-bold text-amber-600">
                      {(() => {
                        const d = Math.ceil((new Date(p.expires_at!).getTime() - Date.now()) / 86400000);
                        return d === 0 ? 'ينتهي اليوم!' : `${d} يوم`;
                      })()}
                    </span>
                    <button
                      onClick={async () => {
                        const newDate = new Date(Date.now() + 90 * 86400000).toISOString();
                        await supabase.from('packages').update({ expires_at: newDate, status: 'approved' }).eq('id', p.id);
                        fetchData();
                      }}
                      className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 transition-colors hover:bg-emerald-100"
                    >
                      تمديد 90 يوم
                    </button>
                  </div>
                </div>
              ))}
              {packages.filter((p) => {
                if (!p.expires_at || p.status !== 'approved') return false;
                const daysLeft = Math.ceil((new Date(p.expires_at).getTime() - Date.now()) / 86400000);
                return daysLeft >= 0 && daysLeft <= 7;
              }).length === 0 && <p className="text-sm text-navy-400">لا توجد عروض تنتهي قريباً</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'feeds' && (
        <FeedManagerPanel onRefresh={fetchData} />
      )}

      {showCreateForm && (
        <AdminCreateForm
          agencies={agencies}
          onClose={() => setShowCreateForm(false)}
          onSaved={() => { setShowCreateForm(false); fetchData(); }}
        />
      )}

      {showEditForm && editingPkg && (
        <AdminEditForm
          pkg={editingPkg}
          onClose={() => { setShowEditForm(false); setEditingPkg(null); }}
          onSaved={() => { setShowEditForm(false); setEditingPkg(null); fetchData(); }}
        />
      )}
    </div>
  );
}

const statusColors: Record<PackageStatus, string> = {
  approved: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-navy-100 text-navy-500',
};

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Package2; label: string }) {
  return (
    <button onClick={onClick} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${active ? 'bg-navy-900 text-white shadow-md' : 'bg-white text-navy-600 border border-navy-100 hover:bg-navy-50'}`}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Package2; color: 'navy' | 'emerald' | 'amber' | 'sky' | 'red' }) {
  const colors = { navy: 'bg-navy-50 text-navy-600', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', sky: 'bg-sky-50 text-sky-600', red: 'bg-red-50 text-red-600' };
  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}><Icon className="h-5 w-5" /></div>
      <div className="text-2xl font-extrabold text-navy-900">{value}</div>
      <div className="text-xs font-semibold text-navy-400">{label}</div>
    </div>
  );
}

function RevenueCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof DollarSign }) {
  return (
    <div className="rounded-2xl border border-navy-100 bg-gradient-to-br from-navy-900 to-navy-700 p-5 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><Icon className="h-5 w-5 text-sky-300" /></div>
      <div className="text-xl font-extrabold text-white">{value}</div>
      <div className="text-xs font-semibold text-navy-200">{label}</div>
    </div>
  );
}

function CategoryBar({ label, count, total, color, icon: Icon }: { label: string; count: number; total: number; color: string; icon: typeof Plane }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-semibold text-navy-700"><Icon className="h-4 w-4" />{label}</span>
        <span className="font-bold text-navy-900">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-navy-100">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusRow({ label, count, color, icon: Icon }: { label: string; count: number; color: string; icon: typeof CheckCircle2 }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 font-semibold text-navy-700"><Icon className={`h-4 w-4 ${color}`} />{label}</span>
      <span className="font-bold text-navy-900">{count}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Package2; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-navy-200 bg-white p-12 text-center">
      <Icon className="mx-auto mb-3 h-12 w-12 text-navy-300" />
      <p className="text-sm text-navy-400">{text}</p>
    </div>
  );
}

function AdminEditForm({ pkg, onClose, onSaved }: { pkg: Package; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: pkg.title, description: pkg.description, category: pkg.category,
    destination: pkg.destination, destination_country: pkg.destination_country,
    departure_city: pkg.departure_city, duration_days: pkg.duration_days,
    hotel_stars: pkg.hotel_stars, flight_included: pkg.flight_included,
    flight_details: pkg.flight_details, price_sar: pkg.price_sar,
    status: pkg.status, terms: pkg.terms, image_url: pkg.image_url,
    expires_at: pkg.expires_at ? pkg.expires_at.slice(0, 10) : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error } = await supabase.from('packages').update({
      title: form.title, description: form.description,
      category: form.category as PackageCategory, destination: form.destination,
      destination_country: form.destination_country, departure_city: form.departure_city,
      duration_days: Number(form.duration_days),
      hotel_stars: form.hotel_stars ? Number(form.hotel_stars) : null,
      flight_included: form.flight_included, flight_details: form.flight_details,
      price_sar: Number(form.price_sar), status: form.status as PackageStatus,
      terms: form.terms, image_url: form.image_url,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', pkg.id);
    if (error) { setError(error.message); setSaving(false); return; }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-navy-100 bg-white p-5">
          <h2 className="text-lg font-extrabold text-navy-900">تعديل الباقة</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-50"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>}
          <AdminField label="عنوان الباقة"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={adminInput} /></AdminField>
          <AdminField label="الوصف"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={adminInput} rows={3} /></AdminField>
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="الحالة">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PackageStatus })} className={adminInput}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </AdminField>
            <AdminField label="التصنيف">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as PackageCategory })} className={adminInput}>
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </AdminField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="الوجهة"><input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className={adminInput} /></AdminField>
            <AdminField label="الدولة"><input value={form.destination_country} onChange={(e) => setForm({ ...form, destination_country: e.target.value })} className={adminInput} /></AdminField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="مدينة الانطلاق">
              <select value={form.departure_city} onChange={(e) => setForm({ ...form, departure_city: e.target.value })} className={adminInput}>
                {GCC_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </AdminField>
            <AdminField label="المدة (أيام)"><input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} className={adminInput} /></AdminField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="نجوم الفندق">
              <select value={String(form.hotel_stars ?? '')} onChange={(e) => setForm({ ...form, hotel_stars: e.target.value ? Number(e.target.value) : null })} className={adminInput}>
                <option value="">بدون</option>
                {[1,2,3,4,5].map((s) => <option key={s} value={s}>{s} نجوم</option>)}
              </select>
            </AdminField>
            <AdminField label="السعر (ر.س)"><input type="number" value={form.price_sar} onChange={(e) => setForm({ ...form, price_sar: Number(e.target.value) })} className={adminInput} /></AdminField>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="admin_flight" checked={form.flight_included} onChange={(e) => setForm({ ...form, flight_included: e.target.checked })} className="h-4 w-4 rounded border-navy-300 text-sky-600 focus:ring-sky-500" />
            <label htmlFor="admin_flight" className="text-sm font-semibold text-navy-700">تشمل تذاكر طيران</label>
          </div>
          {form.flight_included && <AdminField label="تفاصيل الطيران"><input value={form.flight_details} onChange={(e) => setForm({ ...form, flight_details: e.target.value })} className={adminInput} /></AdminField>}
          <AdminField label="تاريخ انتهاء العرض (صالح حتى)"><input type="date" required value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className={adminInput} dir="ltr" /><p className="mt-1 text-xs text-navy-400">سيتم إخفاء العرض تلقائياً بعد هذا التاريخ</p></AdminField>
          <AdminField label="رابط صورة"><input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className={adminInput} dir="ltr" /></AdminField>
          <AdminField label="الشروط"><textarea value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} className={adminInput} rows={2} /></AdminField>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-sky-600 px-6 py-3 font-bold text-white transition-colors hover:bg-sky-700 disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'حفظ'}</button>
            <button type="button" onClick={onClose} className="rounded-xl border border-navy-200 px-6 py-3 font-bold text-navy-600 hover:bg-navy-50">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BatchExpiryExtend({ onDone }: { onDone: () => void }) {
  const [days, setDays] = useState(90);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleExtend() {
    setApplying(true);
    setResult(null);
    const newDate = new Date(Date.now() + days * 86400000).toISOString();
    const { data, error } = await supabase
      .from('packages')
      .update({ expires_at: newDate, status: 'approved' })
      .in('status', ['approved', 'expired'])
      .select('id');
    if (error) {
      setResult('حدث خطأ: ' + error.message);
    } else {
      setResult(`تم تمديد ${(data as { id: string }[])?.length ?? 0} عرض لمدة ${days} يوم`);
      onDone();
    }
    setApplying(false);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-bold text-navy-500">عدد أيام التمديد</label>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={adminInput}>
            <option value={30}>30 يوم</option>
            <option value={60}>60 يوم</option>
            <option value={90}>90 يوم</option>
            <option value={180}>180 يوم</option>
            <option value={365}>سنة كاملة</option>
          </select>
        </div>
        <button
          onClick={handleExtend}
          disabled={applying}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
        >
          {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
          {applying ? 'جارٍ التطبيق...' : 'تمديد جميع العروض'}
        </button>
      </div>
      {result && (
        <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm font-semibold text-emerald-700">
          {result}
        </div>
      )}
    </div>
  );
}

const adminInput = 'w-full rounded-xl border border-navy-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-500';

function AdminField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-xs font-bold text-navy-500">{label}</label>{children}</div>;
}

function AdminCreateForm({ agencies, onClose, onSaved }: { agencies: Agency[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<{
    agency_id: string; title: string; description: string; category: PackageCategory;
    destination: string; destination_country: string; departure_city: string;
    duration_days: number; hotel_stars: number | null; flight_included: boolean;
    flight_details: string; inclusions: string; terms: string; price_sar: number;
    image_url: string; status: PackageStatus; expires_at: string;
  }>({
    agency_id: agencies[0]?.id ?? '', title: '', description: '', category: 'leisure',
    destination: '', destination_country: '', departure_city: 'الرياض',
    duration_days: 7, hotel_stars: 3, flight_included: true,
    flight_details: '', inclusions: '', terms: '', price_sar: 1000,
    image_url: '', status: 'approved',
    expires_at: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.agency_id) { setError('يجب اختيار وكالة'); return; }
    setSaving(true);
    setError(null);
    const { error } = await supabase.from('packages').insert({
      agency_id: form.agency_id, title: form.title, description: form.description,
      category: form.category, destination: form.destination,
      destination_country: form.destination_country, departure_city: form.departure_city,
      duration_days: Number(form.duration_days),
      hotel_stars: form.hotel_stars ? Number(form.hotel_stars) : null,
      flight_included: form.flight_included, flight_details: form.flight_details,
      inclusions: form.inclusions.split(/[،,]/).map((s) => s.trim()).filter(Boolean),
      terms: form.terms, price_sar: Number(form.price_sar), image_url: form.image_url,
      status: form.status,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    });
    if (error) { setError(error.message); setSaving(false); return; }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-navy-100 bg-white p-5">
          <h2 className="text-lg font-extrabold text-navy-900">إضافة باقة جديدة</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-50"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>}
          {agencies.length === 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
              لا توجد وكالات. يجب إنشاء وكالة أولاً قبل إضافة الباقات.
            </div>
          )}
          <AdminField label="الوكالة" >
            <select value={form.agency_id} onChange={(e) => setForm({ ...form, agency_id: e.target.value })} className={adminInput} disabled={agencies.length === 0}>
              <option value="">— اختر الوكالة —</option>
              {agencies.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.city})</option>)}
            </select>
          </AdminField>
          <AdminField label="عنوان الباقة"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={adminInput} placeholder="مثال: جولة باكو السياحية" /></AdminField>
          <AdminField label="الوصف"><textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={adminInput} rows={3} placeholder="وصف موجز للباقة" /></AdminField>
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="الحالة">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PackageStatus })} className={adminInput}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </AdminField>
            <AdminField label="التصنيف">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as PackageCategory })} className={adminInput}>
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </AdminField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="الوجهة"><input required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className={adminInput} placeholder="باكو" /></AdminField>
            <AdminField label="الدولة"><input required value={form.destination_country} onChange={(e) => setForm({ ...form, destination_country: e.target.value })} className={adminInput} placeholder="أذربيجان" /></AdminField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="مدينة الانطلاق">
              <select value={form.departure_city} onChange={(e) => setForm({ ...form, departure_city: e.target.value })} className={adminInput}>
                {GCC_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </AdminField>
            <AdminField label="المدة (أيام)"><input type="number" required min={1} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} className={adminInput} /></AdminField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="نجوم الفندق">
              <select value={String(form.hotel_stars ?? '')} onChange={(e) => setForm({ ...form, hotel_stars: e.target.value ? Number(e.target.value) : null })} className={adminInput}>
                <option value="">بدون</option>
                {[1,2,3,4,5].map((s) => <option key={s} value={s}>{s} نجوم</option>)}
              </select>
            </AdminField>
            <AdminField label="السعر (ر.س)"><input type="number" required min={0} value={form.price_sar} onChange={(e) => setForm({ ...form, price_sar: Number(e.target.value) })} className={adminInput} /></AdminField>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="create_flight" checked={form.flight_included} onChange={(e) => setForm({ ...form, flight_included: e.target.checked })} className="h-4 w-4 rounded border-navy-300 text-sky-600 focus:ring-sky-500" />
            <label htmlFor="create_flight" className="text-sm font-semibold text-navy-700">تشمل تذاكر طيران</label>
          </div>
          {form.flight_included && <AdminField label="تفاصيل الطيران"><input value={form.flight_details} onChange={(e) => setForm({ ...form, flight_details: e.target.value })} className={adminInput} placeholder="مثال: طيران اقتصادي - ذهاب وعودة" /></AdminField>}
          <AdminField label="تاريخ انتهاء العرض (صالح حتى)"><input type="date" required value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className={adminInput} dir="ltr" /><p className="mt-1 text-xs text-navy-400">سيتم إخفاء العرض تلقائياً بعد هذا التاريخ</p></AdminField>
          <AdminField label="المشمولات (افصل بينها بفاصلة)"><input value={form.inclusions} onChange={(e) => setForm({ ...form, inclusions: e.target.value })} className={adminInput} placeholder="الفندق، التذاكر، النقل" /></AdminField>
          <AdminField label="رابط صورة (Unsplash)"><input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className={adminInput} placeholder="https://images.unsplash.com/..." dir="ltr" /></AdminField>
          <AdminField label="الشروط"><textarea value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} className={adminInput} rows={2} /></AdminField>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving || !form.agency_id} className="flex-1 rounded-xl bg-sky-600 px-6 py-3 font-bold text-white transition-colors hover:bg-sky-700 disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'إضافة الباقة'}</button>
            <button type="button" onClick={onClose} className="rounded-xl border border-navy-200 px-6 py-3 font-bold text-navy-600 hover:bg-navy-50">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FeedManagerPanel({ onRefresh }: { onRefresh: () => void }) {
  const [sources, setSources] = useState<FeedSource[]>([]);
  const [imports, setImports] = useState<FeedImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningSource, setRunningSource] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [globalSync, setGlobalSync] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [showAddSource, setShowAddSource] = useState(false);

  async function fetchFeedData() {
    const [srcRes, impRes] = await Promise.all([
      supabase.from('feed_sources').select('*').order('created_at', { ascending: true }),
      supabase.from('feed_imports').select('*').order('started_at', { ascending: false }).limit(20),
    ]);
    setSources((srcRes.data ?? []) as FeedSource[]);
    setImports((impRes.data ?? []) as FeedImport[]);
    setLoading(false);
  }

  useEffect(() => { fetchFeedData(); }, []);

  async function handleRunSource(source: FeedSource) {
    setRunningSource(source.id);
    setLastResult(null);
    try {
      const result = await runFeedImport(source);
      setLastResult(`${source.name}: ${result.imported} جديد، ${result.updated} محدّث، ${result.skipped} متخطّى`);
      await fetchFeedData();
      onRefresh();
    } catch (err) {
      setLastResult(`خطأ في ${source.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
    setRunningSource(null);
  }

  async function handleRunAll() {
    setRunningAll(true);
    setLastResult(null);
    try {
      const result = await runAllActiveFeeds();
      setLastResult(`تم تشغيل ${result.sourcesRun} مصدر: ${result.totalImported} جديد، ${result.totalUpdated} محدّث${result.errors.length > 0 ? `، ${result.errors.length} أخطاء` : ''}`);
      await fetchFeedData();
      onRefresh();
    } catch (err) {
      setLastResult(`خطأ: ${err instanceof Error ? err.message : String(err)}`);
    }
    setRunningAll(false);
  }

  async function handleGlobalSync() {
    setGlobalSync(true);
    setLastResult(null);
    try {
      const result = await performLiveSync();
      setLastResult(`مزامنة شاملة: ${result.expired} عرض منتهي، ${result.imported} جديد، ${result.updated} محدّث${result.errors.length > 0 ? `، ${result.errors.length} أخطاء` : ''}`);
      await fetchFeedData();
      onRefresh();
    } catch (err) {
      setLastResult(`خطأ: ${err instanceof Error ? err.message : String(err)}`);
    }
    setGlobalSync(false);
  }

  async function toggleSource(source: FeedSource) {
    await supabase.from('feed_sources').update({ active: !source.active, updated_at: new Date().toISOString() }).eq('id', source.id);
    fetchFeedData();
  }

  async function deleteSource(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا المصدر؟')) return;
    await supabase.from('feed_sources').delete().eq('id', id);
    fetchFeedData();
  }

  async function seedDefaults() {
    await seedDefaultFeedSources();
    fetchFeedData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-navy-900 to-sky-700 p-6 text-white">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-sky-300" />
          <div>
            <h2 className="text-xl font-extrabold">محرّك تجميع البيانات والتغذية الحية</h2>
            <p className="mt-1 text-sm text-navy-200">إدارة مصادر التغذية الآلية، تشغيل المزامنة الحية، ومراقبة سجل الاستيراد في الوقت الفعلي</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleGlobalSync}
          disabled={globalSync}
          className="flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-bold text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
        >
          {globalSync ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
          {globalSync ? 'جارٍ المزامنة...' : 'مزامنة شاملة (إنهاء + استيراد)'}
        </button>
        <button
          onClick={handleRunAll}
          disabled={runningAll}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {runningAll ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
          {runningAll ? 'جارٍ التشغيل...' : 'تشغيل جميع المصادر'}
        </button>
        <button
          onClick={() => setShowAddSource(true)}
          className="flex items-center gap-2 rounded-xl border border-navy-200 bg-white px-5 py-3 font-bold text-navy-700 transition-colors hover:bg-navy-50"
        >
          <Plus className="h-5 w-5" />
          إضافة مصدر جديد
        </button>
        {sources.length === 0 && (
          <button
            onClick={seedDefaults}
            className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 font-bold text-amber-700 transition-colors hover:bg-amber-100"
          >
            <Globe className="h-5 w-5" />
            تهيئة المصادر الافتراضية
          </button>
        )}
      </div>

      {lastResult && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm font-semibold text-emerald-700">
          {lastResult}
        </div>
      )}

      <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-navy-800">
          <Activity className="h-5 w-5 text-sky-600" />
          مصادر التغذية ({sources.length})
        </h3>
        <div className="space-y-3">
          {sources.map((source) => {
            const currencyCode = COUNTRY_CURRENCY_MAP[source.country] ?? 'SAR';
            return (
              <div key={source.id} className="flex flex-col gap-3 rounded-xl border border-navy-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${source.active ? 'bg-emerald-50' : 'bg-navy-50'}`}>
                    <Globe className={`h-5 w-5 ${source.active ? 'text-emerald-600' : 'text-navy-400'}`} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-navy-900">{source.name}</div>
                    <div className="flex flex-wrap gap-x-2 text-xs text-navy-400">
                      <span>{source.country}</span>
                      <span>•</span>
                      <span>العملة: {currencyCode}</span>
                      <span>•</span>
                      <span>{source.source_type === 'simulated' ? 'محاكاة آلية' : source.source_type}</span>
                      <span>•</span>
                      <span>الانتهاء: {source.default_expiry_days} يوم</span>
                      {source.auto_approve && <><span>•</span><span className="font-bold text-emerald-600">اعتماد تلقائي</span></>}
                    </div>
                    {source.last_run_at && (
                      <div className="mt-0.5 text-xs text-navy-300">
                        آخر تشغيل: {new Date(source.last_run_at).toLocaleString('ar')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => toggleSource(source)}
                    className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${source.active ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {source.active ? 'إيقاف' : 'تفعيل'}
                  </button>
                  <button
                    onClick={() => handleRunSource(source)}
                    disabled={runningSource === source.id || !source.active}
                    className="flex items-center gap-1 rounded-lg bg-sky-50 px-3 py-2 text-xs font-bold text-sky-600 transition-colors hover:bg-sky-100 disabled:opacity-50"
                  >
                    {runningSource === source.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    تشغيل
                  </button>
                  <button
                    onClick={() => deleteSource(source.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {sources.length === 0 && (
            <div className="rounded-xl border border-dashed border-navy-200 p-8 text-center">
              <Database className="mx-auto mb-3 h-10 w-10 text-navy-300" />
              <p className="text-sm text-navy-400">لا توجد مصادر تغذية. اضغط "تهيئة المصادر الافتراضية" لإنشاء مصدر لكل دولة خليجية.</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-navy-800">
          <Activity className="h-5 w-5 text-amber-600" />
          سجل عمليات الاستيراد ({imports.length})
        </h3>
        <div className="space-y-2">
          {imports.map((imp) => (
            <div key={imp.id} className="flex items-center justify-between rounded-lg bg-navy-50/50 px-4 py-3 text-sm">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  imp.status === 'success' ? 'bg-emerald-100' :
                  imp.status === 'failed' ? 'bg-red-100' :
                  imp.status === 'partial' ? 'bg-amber-100' : 'bg-sky-100'
                }`}>
                  {imp.status === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
                   imp.status === 'failed' ? <XCircle className="h-4 w-4 text-red-600" /> :
                   imp.status === 'partial' ? <Clock className="h-4 w-4 text-amber-600" /> :
                   <Loader2 className="h-4 w-4 animate-spin text-sky-600" />}
                </div>
                <div>
                  <div className="font-bold text-navy-800">{imp.source_name}</div>
                  <div className="text-xs text-navy-400">
                    {imp.imported_count} جديد • {imp.updated_count} محدّث • {imp.skipped_count} متخطّى
                    {imp.error_message && <span className="text-red-500"> • {imp.error_message}</span>}
                  </div>
                </div>
              </div>
              <span className="shrink-0 text-xs text-navy-300">
                {new Date(imp.started_at).toLocaleString('ar')}
              </span>
            </div>
          ))}
          {imports.length === 0 && <p className="text-sm text-navy-400">لا توجد عمليات استيراد بعد</p>}
        </div>
      </div>

      {showAddSource && (
        <AddFeedSourceForm
          onClose={() => setShowAddSource(false)}
          onSaved={() => { setShowAddSource(false); fetchFeedData(); }}
        />
      )}
    </div>
  );
}

function AddFeedSourceForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: '',
    source_type: 'simulated' as FeedSource['source_type'],
    country: 'السعودية',
    url: '',
    auto_approve: true,
    active: true,
    default_expiry_days: 90,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('feed_sources').insert({
      name: form.name,
      source_type: form.source_type,
      country: form.country,
      url: form.url,
      auto_approve: form.auto_approve,
      active: form.active,
      default_expiry_days: form.default_expiry_days,
    });
    if (insertError) { setError(insertError.message); setSaving(false); return; }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-navy-100 bg-white p-5">
          <h2 className="text-lg font-extrabold text-navy-900">إضافة مصدر تغذية جديد</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-50"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>}
          <AdminField label="اسم المصدر"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={adminInput} placeholder="مثال: مصدر الكويت الآلي" /></AdminField>
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="الدولة">
              <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={adminInput}>
                {GCC_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </AdminField>
            <AdminField label="نوع المصدر">
              <select value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value as FeedSource['source_type'] })} className={adminInput}>
                <option value="simulated">محاكاة آلية</option>
                <option value="json_api">JSON API</option>
                <option value="csv_file">CSV</option>
                <option value="rss_feed">RSS Feed</option>
              </select>
            </AdminField>
          </div>
          <AdminField label="رابط المصدر (اختياري)"><input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className={adminInput} dir="ltr" placeholder="https://..." /></AdminField>
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="مدة الانتهاء (أيام)"><input type="number" min={1} value={form.default_expiry_days} onChange={(e) => setForm({ ...form, default_expiry_days: Number(e.target.value) })} className={adminInput} /></AdminField>
            <AdminField label="الاعتماد التلقائي">
              <select value={String(form.auto_approve)} onChange={(e) => setForm({ ...form, auto_approve: e.target.value === 'true' })} className={adminInput}>
                <option value="true">نعم — اعتماد تلقائي</option>
                <option value="false">لا — مراجعة يدوية</option>
              </select>
            </AdminField>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-sky-600 px-6 py-3 font-bold text-white transition-colors hover:bg-sky-700 disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'إضافة المصدر'}</button>
            <button type="button" onClick={onClose} className="rounded-xl border border-navy-200 px-6 py-3 font-bold text-navy-600 hover:bg-navy-50">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}
