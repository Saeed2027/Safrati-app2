import { useEffect } from 'react';
import { X, Star, Clock, MapPin, Plane, CheckCircle2, FileText, MessageCircle, Building2, Calendar, CalendarClock, Lock, UserPlus, LogIn } from 'lucide-react';
import type { PackageWithAgency } from '@/lib/types';
import { CATEGORY_LABELS, formatPriceWithEstimate, getPackageImage, formatExpiryMonth, formatExpiryDate, getDaysUntilExpiry } from '@/lib/types';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface PackageModalProps {
  pkg: PackageWithAgency | null;
  onClose: () => void;
  isAuthenticated: boolean;
  onLoginRequired: () => void;
}

export function PackageModal({ pkg, onClose, isAuthenticated, onLoginRequired }: PackageModalProps) {
  const { currency } = useCurrency();
  const [showInquiry, setShowInquiry] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (pkg) {
      setShowInquiry(false);
      setSubmitted(false);
      setName('');
      setPhone('');
      setMessage('');
    }
  }, [pkg]);

  useEffect(() => {
    if (pkg) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [pkg]);

  if (!pkg) return null;

  const priceDisplay = formatPriceWithEstimate(pkg.price_sar, pkg.agency.country, currency);
  const waNumber = pkg.agency.whatsapp_number.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(
    `مرحباً، أنا مهتم بباقة: ${pkg.title} (${pkg.destination})`
  )}`;

  async function handleInquiry(e: React.FormEvent) {
    e.preventDefault();
    if (!pkg) return;
    setSubmitting(true);
    const { error } = await supabase.from('inquiries').insert({
      package_id: pkg.id,
      agency_id: pkg.agency_id,
      customer_name: name,
      customer_phone: phone,
      message,
    });
    setSubmitting(false);
    if (error) {
      alert('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
      return;
    }
    setSubmitted(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-52 overflow-hidden bg-gradient-to-br from-navy-800 to-navy-600">
          {(() => { const img = getPackageImage(pkg); return img ? (
            <img src={img} alt={pkg.title} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Plane className="h-20 w-20 text-white/20" />
            </div>
          ); })()}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-colors hover:bg-white/30"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 right-4 rounded-full bg-sky-500 px-4 py-1.5 text-sm font-bold text-white">
            {CATEGORY_LABELS[pkg.category]}
          </div>
        </div>

        <div className="p-6">
          <h2 className="mb-2 text-xl font-extrabold text-navy-900">{pkg.title}</h2>
          <p className="mb-5 text-sm leading-relaxed text-navy-500">{pkg.description}</p>

          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoChip icon={MapPin} label="الوجهة" value={pkg.destination} />
            <InfoChip icon={Building2} label="الدولة" value={pkg.destination_country} />
            <InfoChip icon={Plane} label="مدينة الانطلاق" value={pkg.departure_city} />
            <InfoChip icon={Clock} label="المدة" value={`${pkg.duration_days} يوم`} />
            {pkg.hotel_stars && (
              <InfoChip
                icon={Star}
                label="الفندق"
                value={`${pkg.hotel_stars} نجوم`}
              />
            )}
            <InfoChip
              icon={Plane}
              label="الطيران"
              value={pkg.flight_included ? 'مشمول' : 'غير مشمول'}
            />
          </div>

          {pkg.flight_included && pkg.flight_details && (
            <div className="mb-5 rounded-xl border border-sky-100 bg-sky-50 p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-bold text-sky-700">
                <Plane className="h-4 w-4" />
                تفاصيل الطيران
              </div>
              <p className="text-sm text-navy-600">{pkg.flight_details}</p>
            </div>
          )}

          <div className="mb-5">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-navy-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              يشمل الباقة
            </h3>
            <div className="flex flex-wrap gap-2">
              {pkg.inclusions.map((item, i) => (
                <span
                  key={i}
                  className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                >
                  {item}
                </span>
              ))}
              {pkg.inclusions.length === 0 && (
                <span className="text-sm text-navy-400">لا توجد تفاصيل</span>
              )}
            </div>
          </div>

          {pkg.terms && (
            <div className="mb-5">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-navy-800">
                <FileText className="h-4 w-4 text-navy-500" />
                الشروط والأحكام
              </h3>
              <p className="rounded-xl bg-navy-50 p-3 text-sm leading-relaxed text-navy-600">
                {pkg.terms}
              </p>
            </div>
          )}

          {pkg.expires_at && (() => {
            const expiryMonth = formatExpiryMonth(pkg.expires_at);
            const expiryDate = formatExpiryDate(pkg.expires_at);
            const daysLeft = getDaysUntilExpiry(pkg.expires_at);
            const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
            return (
              <div className={`mb-5 flex items-center justify-between rounded-xl p-4 ${isExpiringSoon ? 'bg-red-50 border border-red-200' : 'bg-sky-50 border border-sky-100'}`}>
                <div className="flex items-center gap-2">
                  <CalendarClock className={`h-5 w-5 ${isExpiringSoon ? 'text-red-500' : 'text-sky-600'}`} />
                  <div>
                    <div className={`text-xs font-semibold ${isExpiringSoon ? 'text-red-400' : 'text-sky-500'}`}>صلاحية العرض</div>
                    <div className={`text-sm font-bold ${isExpiringSoon ? 'text-red-700' : 'text-sky-800'}`}>
                      صالح حتى شهر: {expiryMonth}
                    </div>
                  </div>
                </div>
                <div className={`text-left text-xs font-bold ${isExpiringSoon ? 'text-red-500' : 'text-sky-600'}`}>
                  {daysLeft !== null && daysLeft >= 0
                    ? daysLeft === 0 ? 'ينتهي اليوم!' : `${daysLeft} يوم متبقي`
                    : 'منتهي الصلاحية'}
                </div>
              </div>
            );
          })()}

          <div className="mb-5 flex items-center justify-between rounded-xl bg-navy-900 p-4">
            <div>
              <span className="text-xs text-navy-200">السعر</span>
              <div className="text-2xl font-extrabold text-white">
                {priceDisplay.native}
              </div>
              {priceDisplay.estimate && (
                <div className="mt-0.5 text-xs font-medium text-navy-300">
                  ≈ {priceDisplay.estimate}
                </div>
              )}
            </div>
            <div className="text-left">
              <span className="text-xs text-navy-200">مقدم من</span>
              <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                <Building2 className="h-3.5 w-3.5 text-sky-300" />
                شركة معتمدة
              </div>
            </div>
          </div>

          {!showInquiry && !submitted && (
            isAuthenticated ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 font-bold text-white transition-colors hover:bg-emerald-600"
                >
                  <MessageCircle className="h-5 w-5" />
                  تواصل عبر واتساب
                </a>
                <button
                  onClick={() => setShowInquiry(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-sky-500 px-6 py-3.5 font-bold text-sky-600 transition-colors hover:bg-sky-50"
                >
                  أرسل استفساراً
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/50 p-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100">
                  <Lock className="h-6 w-6 text-sky-600" />
                </div>
                <h3 className="mb-1 text-sm font-extrabold text-navy-900">سجّل الدخول للتواصل مع الوكالة</h3>
                <p className="mb-4 text-xs leading-relaxed text-navy-500">
                  معلومات التواصل المباشرة وواتساب متاحة للأعضاء المسجلين فقط.
                  أنشئ حساباً مجاناً للوصول إلى جميع تفاصيل الوكالات وإرسال الاستفسارات.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <button
                    onClick={onLoginRequired}
                    className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky-700"
                  >
                    <LogIn className="h-4 w-4" />
                    تسجيل الدخول
                  </button>
                  <button
                    onClick={onLoginRequired}
                    className="flex items-center justify-center gap-2 rounded-xl border border-sky-300 px-5 py-2.5 text-sm font-bold text-sky-600 transition-colors hover:bg-sky-50"
                  >
                    <UserPlus className="h-4 w-4" />
                    إنشاء حساب جديد
                  </button>
                </div>
              </div>
            )
          )}

          {showInquiry && !submitted && (
            <form onSubmit={handleInquiry} className="space-y-3">
              <h3 className="text-sm font-bold text-navy-800">أرسل استفسارك للوكالة المعتمدة</h3>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم الكامل"
                className="w-full rounded-xl border border-navy-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-500"
              />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="رقم الهاتف"
                className="w-full rounded-xl border border-navy-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-500"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="رسالتك (اختياري)"
                rows={3}
                className="w-full rounded-xl border border-navy-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-500"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-sky-600 px-6 py-3 font-bold text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
                >
                  {submitting ? 'جارٍ الإرسال...' : 'إرسال'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInquiry(false)}
                  className="rounded-xl border border-navy-200 px-6 py-3 font-bold text-navy-600 transition-colors hover:bg-navy-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          )}

          {submitted && (
            <div className="rounded-xl bg-emerald-50 p-4 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
              <p className="font-bold text-emerald-700">تم إرسال استفسارك بنجاح!</p>
              <p className="mt-1 text-sm text-emerald-600">سيتواصل معك الوكالة المعتمدة قريباً.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-navy-100 bg-navy-50/50 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-navy-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-sm font-bold text-navy-800">{value}</div>
    </div>
  );
}
