import { Plane, Stethoscope, GraduationCap, Star, Clock, MapPin, ArrowLeft, Lock, ShieldCheck, Timer, CalendarClock, Globe } from 'lucide-react';
import type { PackageWithAgency, PackageCategory } from '@/lib/types';
import { CATEGORY_LABELS, formatPriceWithEstimate, getPackageImage, formatExpiryMonth, getDaysUntilExpiry } from '@/lib/types';
import { useCurrency } from '@/contexts/CurrencyContext';

const CATEGORY_STYLES: Record<PackageCategory, { bg: string; text: string; icon: typeof Plane }> = {
  leisure: { bg: 'bg-sky-100', text: 'text-sky-700', icon: Plane },
  medical: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: Stethoscope },
  study: { bg: 'bg-amber-100', text: 'text-amber-700', icon: GraduationCap },
};

interface PackageCardProps {
  pkg: PackageWithAgency;
  onClick: () => void;
  isAuthenticated: boolean;
}

export function PackageCard({ pkg, onClick, isAuthenticated }: PackageCardProps) {
  const { currency } = useCurrency();
  const style = CATEGORY_STYLES[pkg.category];
  const Icon = style.icon;

  const isExpiringSoon = (() => {
    const daysLeft = getDaysUntilExpiry(pkg.expires_at);
    return daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
  })();

  const expiryMonth = formatExpiryMonth(pkg.expires_at);

  const priceDisplay = formatPriceWithEstimate(pkg.price_sar, pkg.agency.country, currency);

  return (
    <button
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white text-right shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-navy-900/10"
    >
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-navy-800 to-navy-600">
        {(() => { const img = getPackageImage(pkg); return img ? (
          <img
            src={img}
            alt={pkg.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Icon className="h-16 w-16 text-white/30" />
          </div>
        ); })()}
        <div className={`absolute top-3 right-3 flex items-center gap-1.5 rounded-full ${style.bg} ${style.text} px-3 py-1 text-xs font-bold`}>
          <Icon className="h-3.5 w-3.5" />
          {CATEGORY_LABELS[pkg.category]}
        </div>
        {pkg.hotel_stars && (
          <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-gold-600">
            <Star className="h-3.5 w-3.5 fill-gold-500 text-gold-500" />
            {pkg.hotel_stars} نجوم
          </div>
        )}
        {isExpiringSoon && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
            <Timer className="h-3.5 w-3.5" />
            ينتهي قريباً
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1.5 line-clamp-2 text-base font-bold text-navy-900 transition-colors group-hover:text-sky-600">
          {pkg.title}
        </h3>
        <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-navy-400">
          {pkg.description}
        </p>

        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-navy-500">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-sky-500" />
            {pkg.destination}
          </span>
          {pkg.destination_country && (
            <span className="flex items-center gap-1 font-semibold text-navy-700">
              <Globe className="h-3.5 w-3.5 text-sky-500" />
              {pkg.destination_country}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-sky-500" />
            {pkg.duration_days} يوم
          </span>
          <span className="flex items-center gap-1">
            <Plane className="h-3.5 w-3.5 text-sky-500" />
            من {pkg.departure_city}
          </span>
        </div>

        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          شركة معتمدة
        </div>

        {expiryMonth && (
          <div className={`mb-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold ${isExpiringSoon ? 'bg-red-50 text-red-600' : 'bg-sky-50 text-sky-700'}`}>
            <CalendarClock className="h-3.5 w-3.5" />
            صالح حتى شهر: {expiryMonth}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-navy-50 pt-3">
          <div>
            <span className="text-xs text-navy-400">السعر</span>
            <div className="text-lg font-extrabold text-navy-900">
              {priceDisplay.native}
            </div>
            {priceDisplay.estimate && (
              <div className="text-xs font-medium text-navy-400">
                ≈ {priceDisplay.estimate}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isAuthenticated && (
              <span className="flex items-center gap-1 rounded-full bg-navy-50 px-2.5 py-1 text-xs font-semibold text-navy-400">
                <Lock className="h-3 w-3" />
                تواصل محجوب
              </span>
            )}
            <span className="flex items-center gap-1 text-sm font-semibold text-sky-600 transition-colors group-hover:text-sky-700">
              التفاصيل
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
