import { useState } from 'react';
import { X, Plane, Stethoscope, GraduationCap, Send, Loader2, CheckCircle2, User, Phone, MapPin, Users, DollarSign, StickyNote, Lock, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PackageCategory } from '@/lib/types';
import { CATEGORY_LABELS, GCC_CITIES, formatPrice } from '@/lib/types';
import { useCurrency } from '@/contexts/CurrencyContext';

interface CustomRequestModalProps {
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onLoginRequired: () => void;
}

export function CustomRequestModal({ open, onClose, isAuthenticated, onLoginRequired }: CustomRequestModalProps) {
  const { currency } = useCurrency();
  const [form, setForm] = useState<{
    customer_name: string;
    customer_phone: string;
    category: PackageCategory;
    destination: string;
    departure_city: string;
    travelers: number;
    budget_sar: number;
    notes: string;
  }>({
    customer_name: '',
    customer_phone: '',
    category: 'leisure',
    destination: '',
    departure_city: 'الرياض',
    travelers: 1,
    budget_sar: 5000,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error } = await supabase.from('trip_requests').insert({
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      category: form.category,
      destination: form.destination,
      departure_city: form.departure_city,
      travelers: Number(form.travelers),
      budget_sar: Number(form.budget_sar),
      notes: form.notes,
      status: 'open',
    });

    setSubmitting(false);
    if (error) {
      setError('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
      return;
    }
    setSubmitted(true);
  }

  function handleClose() {
    setSubmitted(false);
    setError(null);
    setForm({
      customer_name: '', customer_phone: '', category: 'leisure',
      destination: '', departure_city: 'الرياض', travelers: 1,
      budget_sar: 5000, notes: '',
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="mb-2 text-xl font-extrabold text-navy-900">تم إرسال طلبك بنجاح!</h2>
            <p className="mb-6 text-sm leading-relaxed text-navy-400">
              تم استلام طلب رحلتك المخصصة. ستقوم وكالات السفر المعتمدة بمراجعة طلبك
              والتواصل معك مباشرة عبر واتساب لتقديم عروض مخصصة تناسب احتياجاتك.
            </p>
            <button
              onClick={handleClose}
              className="rounded-xl bg-sky-600 px-6 py-3 font-bold text-white transition-colors hover:bg-sky-700"
            >
              تم
            </button>
          </div>
        ) : !isAuthenticated ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100">
              <Lock className="h-8 w-8 text-sky-600" />
            </div>
            <h2 className="mb-2 text-xl font-extrabold text-navy-900">سجّل الدخول لإنشاء طلب مخصص</h2>
            <p className="mb-6 text-sm leading-relaxed text-navy-400">
              إنشاء طلب رحلة مخصص متاح للأعضاء المسجلين فقط. سجّل دخولك أو أنشئ حساباً
              مجاناً لإرسال طلبك إلى الوكالات المعتمدة.
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
            <button
              onClick={handleClose}
              className="mt-4 text-xs font-semibold text-navy-400 hover:text-navy-600"
            >
              العودة للتصفح
            </button>
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-navy-100 bg-white p-5">
              <div>
                <h2 className="text-lg font-extrabold text-navy-900">أنشئ طلب رحلة مخصصة</h2>
                <p className="text-xs text-navy-400">أخبرنا عن رحلتك المطلوبة وستتواصل معك الوكالات</p>
              </div>
              <button onClick={handleClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
              )}

              {/* Category selection with icons */}
              <div>
                <label className="mb-2 block text-xs font-bold text-navy-500">نوع الطلب</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'leisure', label: CATEGORY_LABELS.leisure, icon: Plane },
                    { value: 'medical', label: CATEGORY_LABELS.medical, icon: Stethoscope },
                    { value: 'study', label: CATEGORY_LABELS.study, icon: GraduationCap },
                  ] as const).map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setForm({ ...form, category: cat.value })}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-bold transition-all ${
                        form.category === cat.value
                          ? 'border-sky-500 bg-sky-50 text-sky-700'
                          : 'border-navy-100 text-navy-500 hover:border-navy-200'
                      }`}
                    >
                      <cat.icon className="h-5 w-5" />
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field icon={User} label="الاسم الكامل" required>
                  <input
                    required
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    className={inputClass}
                    placeholder="اسمك الكامل"
                  />
                </Field>
                <Field icon={Phone} label="رقم واتساب" required>
                  <input
                    required
                    value={form.customer_phone}
                    onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                    className={inputClass}
                    placeholder="9665XXXXXXXX"
                    dir="ltr"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field icon={MapPin} label="الوجهة المرغوبة" required>
                  <input
                    required
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    className={inputClass}
                    placeholder="مثال: باكو، لندن، بانكوك..."
                  />
                </Field>
                <Field icon={Plane} label="مدينة الانطلاق" required>
                  <select
                    required
                    value={form.departure_city}
                    onChange={(e) => setForm({ ...form, departure_city: e.target.value })}
                    className={inputClass}
                  >
                    {GCC_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field icon={Users} label="عدد المسافرين" required>
                  <input
                    type="number"
                    required
                    min={1}
                    value={form.travelers}
                    onChange={(e) => setForm({ ...form, travelers: Number(e.target.value) })}
                    className={inputClass}
                  />
                </Field>
                <Field icon={DollarSign} label={`الميزانية التقريبية (${formatPrice(form.budget_sar, currency)})`} required>
                  <input
                    type="number"
                    required
                    min={0}
                    step={500}
                    value={form.budget_sar}
                    onChange={(e) => setForm({ ...form, budget_sar: Number(e.target.value) })}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field icon={StickyNote} label="ملاحظات إضافية">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={inputClass}
                  rows={3}
                  placeholder="أي تفاصيل إضافية: تواريخ، تفضيلات الفندق، احتياجات خاصة..."
                />
              </Field>

              <div className="rounded-xl bg-sky-50 border border-sky-100 p-3 text-xs text-sky-700">
                سيتم إرسال طلبك إلى جميع الوكالات المعتمدة في المنصة. سيتواصل معك المعنيون مباشرة عبر واتساب.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-navy-800 to-sky-600 px-6 py-3.5 font-bold text-white transition-all hover:shadow-lg hover:shadow-sky-500/30 disabled:opacity-50"
                >
                  {submitting ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> جارٍ الإرسال...</>
                  ) : (
                    <><Send className="h-5 w-5" /> إرسال الطلب</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-navy-200 px-6 py-3.5 font-bold text-navy-600 transition-colors hover:bg-navy-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-navy-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-500';

function Field({
  icon: Icon,
  label,
  required,
  children,
}: {
  icon: typeof User;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-navy-500">
        <Icon className="h-3.5 w-3.5" />
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
