import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Package2, Building2, Clock, CheckCircle2, XCircle, Trash2,
  Edit3, Loader2, X, Plane, Stethoscope, GraduationCap, Search, Filter,
  MessageCircle, User, Phone, Settings, TrendingUp, DollarSign, Eye,
  Layers, Star, MapPin, Inbox, Users, DollarSign as DollarIcon, FileCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Agency, Package, PackageCategory, PackageStatus, Inquiry, TripRequest, TripRequestStatus } from '@/lib/types';
import { CATEGORY_LABELS, STATUS_LABELS, GCC_CITIES, GCC_COUNTRIES, formatPrice, TRIP_REQUEST_STATUS_LABELS, formatExpiryMonth, getDaysUntilExpiry } from '@/lib/types';
import { useCurrency } from '@/contexts/CurrencyContext';

type Tab = 'overview' | 'packages' | 'inquiries' | 'requests' | 'settings';

export function PartnerDashboard() {
  const { profile, refreshProfile } = useAuth();
  const { currency } = useCurrency();
  const [tab, setTab] = useState<Tab>('overview');
  const [agency, setAgency] = useState<Agency | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [inquiries, setInquiries] = useState<(Inquiry & { package?: Package })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAgencyForm, setShowAgencyForm] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Package | null>(null);
  const [pkgSearch, setPkgSearch] = useState('');
  const [pkgStatusFilter, setPkgStatusFilter] = useState<PackageStatus | 'all'>('all');
  const [inqSearch, setInqSearch] = useState('');
  const [tripRequests, setTripRequests] = useState<TripRequest[]>([]);
  const [reqSearch, setReqSearch] = useState('');
  const [reqStatusFilter, setReqStatusFilter] = useState<TripRequestStatus | 'all'>('all');

  const fetchData = useCallback(async () => {
    if (!profile?.agency_id) { setLoading(false); return; }
    const [{ data: agencyData }, { data: pkgData }, { data: inqData }, { data: reqData }] = await Promise.all([
      supabase.from('agencies').select('*').eq('id', profile.agency_id).maybeSingle(),
      supabase.from('packages').select('*').eq('agency_id', profile.agency_id).order('created_at', { ascending: false }),
      supabase.from('inquiries').select('*, package:packages(*)').eq('agency_id', profile.agency_id).order('created_at', { ascending: false }),
      supabase.from('trip_requests').select('*').order('created_at', { ascending: false }),
    ]);
    setAgency(agencyData as Agency | null);
    setPackages((pkgData ?? []) as Package[]);
    setInquiries((inqData ?? []) as (Inquiry & { package?: Package })[]);
    setTripRequests((reqData ?? []) as TripRequest[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = {
    total: packages.length,
    approved: packages.filter((p) => p.status === 'approved').length,
    pending: packages.filter((p) => p.status === 'pending').length,
    rejected: packages.filter((p) => p.status === 'rejected').length,
    expired: packages.filter((p) => p.status === 'expired').length,
    totalInquiries: inquiries.length,
    openRequests: tripRequests.filter((r) => r.status === 'open').length,
    totalRequests: tripRequests.length,
    totalRevenue: packages.filter((p) => p.status === 'approved').reduce((sum, p) => sum + p.price_sar, 0),
    avgPrice: packages.length > 0 ? Math.round(packages.reduce((sum, p) => sum + p.price_sar, 0) / packages.length) : 0,
    leisure: packages.filter((p) => p.category === 'leisure').length,
    medical: packages.filter((p) => p.category === 'medical').length,
    study: packages.filter((p) => p.category === 'study').length,
  };

  const filteredPackages = packages.filter((pkg) => {
    if (pkgStatusFilter !== 'all' && pkg.status !== pkgStatusFilter) return false;
    if (pkgSearch) {
      const q = pkgSearch.toLowerCase();
      if (!pkg.title.toLowerCase().includes(q) && !pkg.destination.toLowerCase().includes(q) && !pkg.departure_city.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredInquiries = inquiries.filter((inq) => {
    if (!inqSearch) return true;
    const q = inqSearch.toLowerCase();
    return inq.customer_name.toLowerCase().includes(q) || inq.customer_phone.includes(q) || inq.package?.title.toLowerCase().includes(q);
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

  async function updateRequestStatus(id: string, status: TripRequestStatus) {
    const { error } = await supabase.from('trip_requests').update({ status }).eq('id', id);
    if (error) { alert('حدث خطأ: ' + error.message); return; }
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!profile?.agency_id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-navy-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100">
            <Building2 className="h-8 w-8 text-sky-600" />
          </div>
          <h2 className="mb-2 text-xl font-extrabold text-navy-900">أنشئ ملف وكالتك</h2>
          <p className="mb-6 text-sm text-navy-400">لإضافة الباقات والعرض، يجب أولاً إنشاء ملف وكالتك. سيتم مراجعته من قبل إدارة المنصة.</p>
          <button onClick={() => setShowAgencyForm(true)} className="rounded-xl bg-sky-600 px-6 py-3 font-bold text-white transition-colors hover:bg-sky-700">
            <Plus className="ml-2 inline h-5 w-5" />إنشاء ملف وكالة
          </button>
        </div>
        {showAgencyForm && <AgencyForm onClose={() => setShowAgencyForm(false)} onCreated={() => { setShowAgencyForm(false); refreshProfile(); fetchData(); }} />}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">لوحة تحكم الوكالة</h1>
          <p className="mt-1 text-sm text-navy-400">
            {agency?.name} — {agency?.city}
            {!agency?.approved && <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">بانتظار الموافقة</span>}
          </p>
        </div>
        <button onClick={() => { setEditingPkg(null); setShowForm(true); }} className="flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky-700">
          <Plus className="h-4 w-4" />إضافة باقة
        </button>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto scrollbar-hide">
        <PTab active={tab === 'overview'} onClick={() => setTab('overview')} icon={Layers} label="نظرة عامة" />
        <PTab active={tab === 'packages'} onClick={() => setTab('packages')} icon={Package2} label={`باقاتي (${stats.total})`} />
        <PTab active={tab === 'inquiries'} onClick={() => setTab('inquiries')} icon={MessageCircle} label={`استفسارات (${stats.totalInquiries})`} />
        <PTab active={tab === 'requests'} onClick={() => setTab('requests')} icon={Inbox} label={`طلبات مخصصة (${stats.openRequests})`} />
        <PTab active={tab === 'settings'} onClick={() => setTab('settings')} icon={Settings} label="إعدادات الوكالة" />
      </div>

      {tab === 'overview' && (
        <div className="animate-fade-in space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <PStatCard label="إجمالي الباقات" value={stats.total} icon={Package2} color="navy" />
            <PStatCard label="معتمدة" value={stats.approved} icon={CheckCircle2} color="emerald" />
            <PStatCard label="استفسارات" value={stats.totalInquiries} icon={MessageCircle} color="sky" />
            <PStatCard label="طلبات مفتوحة" value={stats.openRequests} icon={Inbox} color="red" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <PCard label="إجمالي قيمة الباقات المعتمدة" value={formatPrice(stats.totalRevenue, currency)} icon={DollarSign} />
            <PCard label="متوسط سعر الباقة" value={formatPrice(stats.avgPrice, currency)} icon={TrendingUp} />
            <PCard label="متوسط الاستفسارات لكل باقة" value={stats.total > 0 ? (stats.totalInquiries / stats.total).toFixed(1) : '0'} icon={MessageCircle} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-bold text-navy-800">توزيع التصنيفات</h3>
              <div className="space-y-3">
                <CatBar label="سياحة وترفيه" count={stats.leisure} total={stats.total} color="bg-sky-500" icon={Plane} />
                <CatBar label="سياحة علاجية" count={stats.medical} total={stats.total} color="bg-emerald-500" icon={Stethoscope} />
                <CatBar label="دراسة بالخارج" count={stats.study} total={stats.total} color="bg-amber-500" icon={GraduationCap} />
              </div>
            </div>
            <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-bold text-navy-800">حالة الباقات</h3>
              <div className="space-y-3">
                <PStatusRow label="معتمدة" count={stats.approved} color="text-emerald-600" icon={CheckCircle2} />
                <PStatusRow label="بانتظار الموافقة" count={stats.pending} color="text-amber-600" icon={Clock} />
                <PStatusRow label="مرفوضة" count={stats.rejected} color="text-red-600" icon={XCircle} />
                <PStatusRow label="منتهية" count={stats.expired} color="text-navy-500" icon={Clock} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-bold text-navy-800">أحدث طلبات الرحلات المخصصة</h3>
            <div className="space-y-3">
              {tripRequests.slice(0, 5).map((req) => (
                <div key={req.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-navy-800">{req.customer_name} — {req.destination || 'وجهة غير محددة'}</div>
                    <div className="truncate text-xs text-navy-400">{CATEGORY_LABELS[req.category]} • {req.travelers} مسافر</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                    req.status === 'open' ? 'bg-emerald-100 text-emerald-700' : req.status === 'responded' ? 'bg-sky-100 text-sky-700' : 'bg-navy-100 text-navy-500'
                  }`}>{TRIP_REQUEST_STATUS_LABELS[req.status]}</span>
                </div>
              ))}
              {tripRequests.length === 0 && <p className="text-sm text-navy-400">لا توجد طلبات مخصصة بعد</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'requests' && (
        <div className="animate-fade-in space-y-4">
          <div className="rounded-xl bg-gradient-to-r from-navy-900 to-sky-700 p-4 text-white">
            <div className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-sky-300" />
              <span className="font-bold">صندوق الطلبات المخصصة</span>
            </div>
            <p className="mt-1 text-xs text-navy-200">طلبات الرحلات المخصصة التي أرسلها العملاء. تواصل معهم مباشرة أو سجل عرضك.</p>
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
            <PEmptyState icon={Inbox} text="لا توجد طلبات مخصصة مطابقة" />
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

                    {req.notes && (
                      <p className="rounded-lg bg-amber-50 border border-amber-100 p-2.5 text-sm text-navy-600">{req.notes}</p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-navy-50 pt-3">
                      <span className="text-xs text-navy-400">{new Date(req.created_at).toLocaleDateString('ar')}</span>
                      <div className="flex gap-2">
                        <a href={`https://wa.me/${req.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`مرحباً ${req.customer_name}، بخصوص طلب رحلتك إلى ${req.destination || 'الوجهة المطلوبة'} عبر منصة سفرتي`)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-600">
                          <MessageCircle className="h-3.5 w-3.5" /> تواصل عبر واتساب
                        </a>
                        {req.status === 'open' && (
                          <button onClick={() => updateRequestStatus(req.id, 'responded')} className="flex items-center gap-1.5 rounded-lg bg-sky-50 px-4 py-2 text-xs font-bold text-sky-600 transition-colors hover:bg-sky-100">
                            <CheckCircle2 className="h-3.5 w-3.5" /> تم الرد
                          </button>
                        )}
                        {req.status !== 'closed' && (
                          <button onClick={() => updateRequestStatus(req.id, 'closed')} className="rounded-lg bg-navy-50 px-4 py-2 text-xs font-bold text-navy-500 transition-colors hover:bg-navy-100">
                            إغلاق
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'packages' && (
        <div className="animate-fade-in space-y-4">
          <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                <input value={pkgSearch} onChange={(e) => setPkgSearch(e.target.value)} placeholder="ابحث بالعنوان، الوجهة..." className="w-full rounded-xl border border-navy-200 py-2.5 pr-10 pl-4 text-sm outline-none focus:border-sky-500" />
              </div>
              <select value={pkgStatusFilter} onChange={(e) => setPkgStatusFilter(e.target.value as PackageStatus | 'all')} className="rounded-xl border border-navy-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500">
                <option value="all">كل الحالات</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="mt-2 text-xs text-navy-400">عرض {filteredPackages.length} من {packages.length} باقة</div>
          </div>

          {filteredPackages.length === 0 ? (
            <PEmptyState icon={Package2} text="لا توجد باقات مطابقة" />
          ) : (
            <div className="space-y-3">
              {filteredPackages.map((pkg) => (
                <PackageRow key={pkg.id} pkg={pkg} currency={currency} onEdit={() => { setEditingPkg(pkg); setShowForm(true); }} onDelete={async () => {
                  if (!confirm('هل أنت متأكد من حذف هذه الباقة؟')) return;
                  const { error } = await supabase.from('packages').delete().eq('id', pkg.id);
                  if (error) { alert('حدث خطأ أثناء الحذف'); return; }
                  fetchData();
                }} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'inquiries' && (
        <div className="animate-fade-in space-y-4">
          <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
              <input value={inqSearch} onChange={(e) => setInqSearch(e.target.value)} placeholder="ابحث باسم العميل، الهاتف، الباقة..." className="w-full rounded-xl border border-navy-200 py-2.5 pr-10 pl-4 text-sm outline-none focus:border-sky-500" />
            </div>
            <div className="mt-2 text-xs text-navy-400">عرض {filteredInquiries.length} من {inquiries.length} استفسار</div>
          </div>

          {filteredInquiries.length === 0 ? (
            <PEmptyState icon={MessageCircle} text="لا توجد استفسارات مطابقة" />
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
                        <span>{inq.package?.title ?? '—'}</span>
                      </div>
                      {inq.message && <p className="mt-2 rounded-lg bg-navy-50 p-2.5 text-sm text-navy-600">{inq.message}</p>}
                    </div>
                    <a href={`https://wa.me/${inq.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-emerald-600 transition-colors hover:bg-emerald-50">
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="animate-fade-in">
          <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50">
                <Building2 className="h-6 w-6 text-navy-600" />
              </div>
              <div>
                <h3 className="font-bold text-navy-900">{agency?.name}</h3>
                <span className={`text-xs font-bold ${agency?.approved ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {agency?.approved ? 'وكالة معتمدة' : 'بانتظار موافقة الإدارة'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow label="اسم المسؤول" value={agency?.contact_name} />
              <InfoRow label="الدولة" value={agency?.country} />
              <InfoRow label="المدينة" value={agency?.city} />
              <InfoRow label="البريد الإلكتروني" value={agency?.email} dir="ltr" />
              <InfoRow label="رقم واتساب" value={agency?.whatsapp_number} dir="ltr" />
              <InfoRow label="تاريخ التسجيل" value={agency ? new Date(agency.created_at).toLocaleDateString('ar') : ''} />
              <InfoRow label="رقم السجل التجاري" value={agency?.commercial_reg_number} dir="ltr" />
              <InfoRow label="الرقم الضريبي (VAT)" value={agency?.tax_cert_number} dir="ltr" />
              {agency?.tax_cert_url && <InfoRow label="رابط الشهادة الضريبية" value="متوفر" />}
              <InfoRow label="إجمالي الباقات" value={String(stats.total)} />
            </div>

            {agency?.description && (
              <div className="mt-4 rounded-xl bg-navy-50/50 p-4">
                <div className="mb-1 text-xs text-navy-400">نبذة عن الوكالة</div>
                <p className="text-sm text-navy-700">{agency.description}</p>
              </div>
            )}

            <button onClick={() => setShowAgencyForm(true)} className="mt-6 flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky-700">
              <Edit3 className="h-4 w-4" />تعديل بيانات الوكالة
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <PackageForm pkg={editingPkg} agencyId={profile.agency_id!} onClose={() => { setShowForm(false); setEditingPkg(null); }} onSaved={() => { setShowForm(false); setEditingPkg(null); fetchData(); }} />
      )}
      {showAgencyForm && agency && (
        <AgencyForm existing={agency} onClose={() => setShowAgencyForm(false)} onCreated={() => { setShowAgencyForm(false); fetchData(); }} />
      )}
    </div>
  );
}

function PTab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Package2; label: string }) {
  return (
    <button onClick={onClick} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${active ? 'bg-navy-900 text-white shadow-md' : 'bg-white text-navy-600 border border-navy-100 hover:bg-navy-50'}`}>
      <Icon className="h-4 w-4" />{label}
    </button>
  );
}

function PStatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Package2; color: 'navy' | 'emerald' | 'amber' | 'sky' | 'red' }) {
  const colors = { navy: 'bg-navy-50 text-navy-600', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', sky: 'bg-sky-50 text-sky-600', red: 'bg-red-50 text-red-600' };
  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}><Icon className="h-5 w-5" /></div>
      <div className="text-2xl font-extrabold text-navy-900">{value}</div>
      <div className="text-xs font-semibold text-navy-400">{label}</div>
    </div>
  );
}

function PCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof DollarSign }) {
  return (
    <div className="rounded-2xl border border-navy-100 bg-gradient-to-br from-navy-900 to-navy-700 p-5 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><Icon className="h-5 w-5 text-sky-300" /></div>
      <div className="text-xl font-extrabold text-white">{value}</div>
      <div className="text-xs font-semibold text-navy-200">{label}</div>
    </div>
  );
}

function CatBar({ label, count, total, color, icon: Icon }: { label: string; count: number; total: number; color: string; icon: typeof Plane }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-semibold text-navy-700"><Icon className="h-4 w-4" />{label}</span>
        <span className="font-bold text-navy-900">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-navy-100"><div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function PStatusRow({ label, count, color, icon: Icon }: { label: string; count: number; color: string; icon: typeof CheckCircle2 }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 font-semibold text-navy-700"><Icon className={`h-4 w-4 ${color}`} />{label}</span>
      <span className="font-bold text-navy-900">{count}</span>
    </div>
  );
}

function PEmptyState({ icon: Icon, text }: { icon: typeof Package2; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-navy-200 bg-white p-12 text-center">
      <Icon className="mx-auto mb-3 h-12 w-12 text-navy-300" />
      <p className="text-sm text-navy-400">{text}</p>
    </div>
  );
}

function InfoRow({ label, value, dir }: { label: string; value?: string; dir?: string }) {
  return (
    <div className="rounded-xl bg-navy-50/50 p-3">
      <div className="text-xs text-navy-400">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-navy-800" dir={dir}>{value ?? '—'}</div>
    </div>
  );
}

function PackageRow({ pkg, currency, onEdit, onDelete }: { pkg: Package; currency: import('@/lib/types').CurrencyCode; onEdit: () => void; onDelete: () => void }) {
  const statusColors: Record<PackageStatus, string> = {
    approved: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-700', expired: 'bg-navy-100 text-navy-500',
  };
  return (
    <div className="flex items-center gap-4 rounded-xl border border-navy-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-50">
        {pkg.category === 'leisure' && <Plane className="h-6 w-6 text-sky-600" />}
        {pkg.category === 'medical' && <Stethoscope className="h-6 w-6 text-emerald-600" />}
        {pkg.category === 'study' && <GraduationCap className="h-6 w-6 text-amber-600" />}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-bold text-navy-900">{pkg.title}</h3>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-navy-400">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{pkg.destination}</span>
          <span>•</span>
          <span>{pkg.duration_days} يوم</span>
          <span>•</span>
          <span className="font-bold text-navy-600">{formatPrice(pkg.price_sar, currency)}</span>
          {pkg.expires_at && (
            <>
              <span>•</span>
              <span className={`font-bold ${(() => { const d = getDaysUntilExpiry(pkg.expires_at); return d !== null && d >= 0 && d <= 7 ? 'text-red-500' : 'text-navy-400'; })()}`}>
                صالح حتى: {formatExpiryMonth(pkg.expires_at)}
              </span>
            </>
          )}
        </div>
      </div>
      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusColors[pkg.status]}`}>{STATUS_LABELS[pkg.status]}</span>
      <div className="flex shrink-0 gap-1">
        <button onClick={onEdit} className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 transition-colors hover:bg-sky-50 hover:text-sky-600"><Edit3 className="h-4 w-4" /></button>
        <button onClick={onDelete} className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 transition-colors hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function PackageForm({ pkg, agencyId, onClose, onSaved }: { pkg: Package | null; agencyId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<{
    title: string; description: string; category: PackageCategory; destination: string;
    destination_country: string; departure_city: string; duration_days: number;
    hotel_stars: number | null; flight_included: boolean; flight_details: string;
    inclusions: string; terms: string; price_sar: number; image_url: string; expires_at: string;
  }>({
    title: pkg?.title ?? '', description: pkg?.description ?? '', category: pkg?.category ?? 'leisure',
    destination: pkg?.destination ?? '', destination_country: pkg?.destination_country ?? '',
    departure_city: pkg?.departure_city ?? 'الرياض', duration_days: pkg?.duration_days ?? 7,
    hotel_stars: pkg?.hotel_stars ?? 3, flight_included: pkg?.flight_included ?? true,
    flight_details: pkg?.flight_details ?? '', inclusions: pkg?.inclusions.join('، ') ?? '',
    terms: pkg?.terms ?? '', price_sar: pkg?.price_sar ?? 1000, image_url: pkg?.image_url ?? '',
    expires_at: pkg?.expires_at ? pkg.expires_at.slice(0, 10) : new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      agency_id: agencyId, title: form.title, description: form.description, category: form.category,
      destination: form.destination, destination_country: form.destination_country,
      departure_city: form.departure_city, duration_days: Number(form.duration_days),
      hotel_stars: form.hotel_stars ? Number(form.hotel_stars) : null,
      flight_included: form.flight_included, flight_details: form.flight_details,
      inclusions: form.inclusions.split(/[،,]/).map((s) => s.trim()).filter(Boolean),
      terms: form.terms, price_sar: Number(form.price_sar), image_url: form.image_url,
      status: pkg ? pkg.status : 'pending', expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };
    let result;
    if (pkg) { result = await supabase.from('packages').update(payload).eq('id', pkg.id); }
    else { result = await supabase.from('packages').insert(payload); }
    if (result.error) { setError(result.error.message); setSaving(false); return; }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-navy-100 bg-white p-5">
          <h2 className="text-lg font-extrabold text-navy-900">{pkg ? 'تعديل الباقة' : 'إضافة باقة جديدة'}</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-50"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>}
          <PField label="عنوان الباقة" required><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={pInput} placeholder="مثال: جولة استانبول السياحية" /></PField>
          <PField label="وصف الباقة" required><textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={pInput} rows={3} placeholder="وصف موجز للباقة والمميزات" /></PField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PField label="التصنيف" required><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as PackageCategory })} className={pInput}>{Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></PField>
            <PField label="مدينة الانطلاق" required><select value={form.departure_city} onChange={(e) => setForm({ ...form, departure_city: e.target.value })} className={pInput}>{GCC_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></PField>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PField label="الوجهة" required><input required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className={pInput} placeholder="استانبول" /></PField>
            <PField label="الدولة" required><input required value={form.destination_country} onChange={(e) => setForm({ ...form, destination_country: e.target.value })} className={pInput} placeholder="تركيا" /></PField>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PField label="المدة (أيام)" required><input type="number" required min={1} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} className={pInput} /></PField>
            <PField label="نجوم الفندق"><select value={String(form.hotel_stars ?? '')} onChange={(e) => setForm({ ...form, hotel_stars: e.target.value ? Number(e.target.value) : null })} className={pInput}><option value="">بدون فندق</option>{[1,2,3,4,5].map((s) => <option key={s} value={s}>{s} نجوم</option>)}</select></PField>
            <PField label="السعر (ر.س)" required><input type="number" required min={0} value={form.price_sar} onChange={(e) => setForm({ ...form, price_sar: Number(e.target.value) })} className={pInput} /></PField>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="flight_included" checked={form.flight_included} onChange={(e) => setForm({ ...form, flight_included: e.target.checked })} className="h-4 w-4 rounded border-navy-300 text-sky-600 focus:ring-sky-500" />
            <label htmlFor="flight_included" className="text-sm font-semibold text-navy-700">تشمل تذاكر طيران</label>
          </div>
          {form.flight_included && <PField label="تفاصيل الطيران"><input value={form.flight_details} onChange={(e) => setForm({ ...form, flight_details: e.target.value })} className={pInput} placeholder="مثال: طيران الاقتصادي - ذهاب وعودة" /></PField>}
          <PField label="المشمولات (افصل بينها بفاصلة)"><input value={form.inclusions} onChange={(e) => setForm({ ...form, inclusions: e.target.value })} className={pInput} placeholder="الفندق، التذاكر، النقل" /></PField>
          <PField label="الشروط والأحكام"><textarea value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} className={pInput} rows={2} placeholder="الشروط الخاصة بالباقة" /></PField>
          <PField label="رابط صورة (اختياري)"><input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className={pInput} placeholder="https://..." dir="ltr" /></PField>
          <PField label="تاريخ انتهاء العرض (صالح حتى)" required><input type="date" required value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className={pInput} dir="ltr" /><p className="mt-1 text-xs text-navy-400">سيتم إخفاء العرض تلقائياً بعد هذا التاريخ</p></PField>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-sky-600 px-6 py-3 font-bold text-white transition-colors hover:bg-sky-700 disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : pkg ? 'حفظ التعديلات' : 'إضافة الباقة'}</button>
            <button type="button" onClick={onClose} className="rounded-xl border border-navy-200 px-6 py-3 font-bold text-navy-600 transition-colors hover:bg-navy-50">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AgencyForm({ existing, onClose, onCreated }: { existing?: Agency | null; onClose: () => void; onCreated: () => void }) {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    name: existing?.name ?? '', contact_name: existing?.contact_name ?? profile?.full_name ?? '',
    whatsapp_number: existing?.whatsapp_number ?? '', email: existing?.email ?? profile?.email ?? '',
    city: existing?.city ?? 'الرياض',
    country: existing?.country ?? 'السعودية',
    commercial_reg_number: existing?.commercial_reg_number ?? '',
    tax_cert_number: existing?.tax_cert_number ?? '',
    tax_cert_url: existing?.tax_cert_url ?? '',
    description: existing?.description ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name, contact_name: form.contact_name, whatsapp_number: form.whatsapp_number,
      email: form.email, city: form.city, country: form.country,
      commercial_reg_number: form.commercial_reg_number, tax_cert_number: form.tax_cert_number,
      tax_cert_url: form.tax_cert_url, description: form.description,
    };
    if (existing) {
      const { error } = await supabase.from('agencies').update(payload).eq('id', existing.id);
      if (error) { setError(error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from('agencies').insert({
        ...payload, approved: false,
      }).select().single();
      if (error) { setError(error.message); setSaving(false); return; }
      if (data && profile) { await supabase.from('profiles').update({ agency_id: data.id }).eq('id', profile.id); }
    }
    setSaving(false);
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-navy-100 bg-white p-5">
          <h2 className="text-lg font-extrabold text-navy-900">{existing ? 'تعديل بيانات الوكالة' : 'إنشاء ملف وكالة'}</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-50"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>}

          <div className="rounded-xl bg-navy-50 border border-navy-100 p-3 text-xs text-navy-600">
            <strong className="text-navy-800">بيانات الشركة الرسمية مطلوبة</strong> — يجب تقديم رقم السجل التجاري ورقم الشهادة الضريبية لإثبات الترخيص الرسمي. ستتم مراجعتها من قبل إدارة المنصة.
          </div>

          <PField label="اسم الوكالة / الشركة" required><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={pInput} placeholder="مثال: رحلات الخليج للسياحة" /></PField>
          <PField label="وصف الوكالة (اختياري)"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={pInput} rows={2} placeholder="نبذة مختصرة عن الوكالة" /></PField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PField label="الدولة" required>
              <select required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={pInput}>
                {GCC_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </PField>
            <PField label="المدينة" required>
              <select required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={pInput}>
                {GCC_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </PField>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-800">
              <FileCheck className="h-4 w-4" />
              البيانات القانونية والضريبية (إلزامية)
            </h3>
            <div className="space-y-4">
              <PField label="رقم السجل التجاري" required>
                <input required value={form.commercial_reg_number} onChange={(e) => setForm({ ...form, commercial_reg_number: e.target.value })} className={pInput} placeholder="مثال: 1010123456" dir="ltr" />
                <p className="mt-1 text-xs text-navy-400">رقم السجل التجاري الرسمي الصادر من الجهة المختصة</p>
              </PField>
              <PField label="رقم الشهادة الضريبية / الرقم الضريبي (VAT)" required>
                <input required value={form.tax_cert_number} onChange={(e) => setForm({ ...form, tax_cert_number: e.target.value })} className={pInput} placeholder="مثال: 300123456700003" dir="ltr" />
                <p className="mt-1 text-xs text-navy-400">الرقم الضريبي المعتمد لدولة التسجيل</p>
              </PField>
              <PField label="رابط الشهادة الضريبية (اختياري)">
                <input value={form.tax_cert_url} onChange={(e) => setForm({ ...form, tax_cert_url: e.target.value })} className={pInput} placeholder="https://..." dir="ltr" />
                <p className="mt-1 text-xs text-navy-400">رابط مباشر لصورة الشهادة الضريبية أو السجل التجاري</p>
              </PField>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PField label="اسم المسؤول" required><input required value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className={pInput} placeholder="الاسم الكامل" /></PField>
            <PField label="رقم واتساب (صيغة دولية)" required><input required value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} className={pInput} placeholder="966551234567" dir="ltr" /><p className="mt-1 text-xs text-navy-400">رمز الدولة ثم الرقم بدون + أو مسافات</p></PField>
          </div>
          <PField label="البريد الإلكتروني" required><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={pInput} dir="ltr" /></PField>

          {!existing && <div className="rounded-xl bg-sky-50 border border-sky-100 p-3 text-xs text-sky-700">سيتم مراجعة ملف وكالتك من قبل إدارة المنصة قبل ظهور باقاتك للعملاء.</div>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-sky-600 px-6 py-3 font-bold text-white transition-colors hover:bg-sky-700 disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : existing ? 'حفظ التعديلات' : 'إنشاء'}</button>
            <button type="button" onClick={onClose} className="rounded-xl border border-navy-200 px-6 py-3 font-bold text-navy-600 transition-colors hover:bg-navy-50">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const pInput = 'w-full rounded-xl border border-navy-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-500';

function PField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-xs font-bold text-navy-500">{label} {required && <span className="text-red-500">*</span>}</label>{children}</div>;
}
