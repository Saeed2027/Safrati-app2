export type PackageCategory = 'leisure' | 'medical' | 'study';
export type PackageStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type UserRole = 'admin' | 'partner' | 'traveler';
export type TripRequestStatus = 'open' | 'responded' | 'closed';

export interface Agency {
  id: string;
  name: string;
  contact_name: string;
  whatsapp_number: string;
  email: string;
  city: string;
  approved: boolean;
  created_at: string;
  country: string;
  commercial_reg_number: string;
  tax_cert_number: string;
  tax_cert_url: string;
  description: string;
}

export const GCC_COUNTRIES = [
  'السعودية',
  'الإمارات',
  'قطر',
  'الكويت',
  'البحرين',
  'عمان',
];

export interface Package {
  id: string;
  agency_id: string;
  title: string;
  description: string;
  category: PackageCategory;
  destination: string;
  destination_country: string;
  departure_city: string;
  duration_days: number;
  hotel_stars: number | null;
  flight_included: boolean;
  flight_details: string;
  inclusions: string[];
  terms: string;
  price_sar: number;
  image_url: string;
  status: PackageStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  agency?: Agency;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  agency_id: string | null;
  created_at: string;
}

export interface Inquiry {
  id: string;
  package_id: string;
  agency_id: string;
  customer_name: string;
  customer_phone: string;
  message: string;
  created_at: string;
  package?: Package;
  agency?: Agency;
}

export interface PackageWithAgency extends Package {
  agency: Agency;
}

export interface TripRequest {
  id: string;
  customer_name: string;
  customer_phone: string;
  category: PackageCategory;
  destination: string;
  departure_city: string;
  travelers: number;
  budget_sar: number;
  notes: string;
  status: TripRequestStatus;
  created_at: string;
}

export const TRIP_REQUEST_STATUS_LABELS: Record<TripRequestStatus, string> = {
  open: 'مفتوح',
  responded: 'تم الرد',
  closed: 'مغلق',
};

export const CATEGORY_LABELS: Record<PackageCategory, string> = {
  leisure: 'سياحة وترفيه',
  medical: 'سياحة علاجية',
  study: 'دراسة بالخارج',
};

export const CATEGORY_ICONS: Record<PackageCategory, string> = {
  leisure: 'Plane',
  medical: 'Stethoscope',
  study: 'GraduationCap',
};

export const STATUS_LABELS: Record<PackageStatus, string> = {
  pending: 'بانتظار الموافقة',
  approved: 'معتمد',
  rejected: 'مرفوض',
  expired: 'منتهي',
};

export const CATEGORY_IMAGES: Record<PackageCategory, string> = {
  leisure: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
  medical: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80',
  study: 'https://images.unsplash.com/photo-1523050854058-8f9084ed79a7?w=800&q=80',
};

export function getPackageImage(pkg: { image_url?: string; category: PackageCategory }): string {
  if (pkg.image_url && pkg.image_url.trim()) return pkg.image_url;
  return CATEGORY_IMAGES[pkg.category];
}

export const GCC_CITIES = [
  'الرياض',
  'جدة',
  'الدمام',
  'مكة المكرمة',
  'دبي',
  'أبوظبي',
  'الشارقة',
  'الدوحة',
  'الكويت',
  'المنامة',
];

export const CURRENCIES = {
  SAR: { code: 'SAR', symbol: 'ر.س', name: 'ريال سعودي', rate: 1 },
  AED: { code: 'AED', symbol: 'د.إ', name: 'درهم إماراتي', rate: 0.98 },
  QAR: { code: 'QAR', symbol: 'ر.ق', name: 'ريال قطري', rate: 0.97 },
  KWD: { code: 'KWD', symbol: 'د.ك', name: 'دينار كويتي', rate: 0.082 },
  BHD: { code: 'BHD', symbol: 'د.ب', name: 'دينار بحريني', rate: 0.1 },
  OMR: { code: 'OMR', symbol: 'ر.ع', name: 'ريال عماني', rate: 0.103 },
  USD: { code: 'USD', symbol: '$', name: 'دولار أمريكي', rate: 0.27 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export const COUNTRY_CURRENCY_MAP: Record<string, CurrencyCode> = {
  'السعودية': 'SAR',
  'الإمارات': 'AED',
  'قطر': 'QAR',
  'الكويت': 'KWD',
  'البحرين': 'BHD',
  'عمان': 'OMR',
};

export function getCurrencyForCountry(country: string): CurrencyCode {
  return COUNTRY_CURRENCY_MAP[country] ?? 'SAR';
}

export function convertPrice(priceSar: number, currency: CurrencyCode): number {
  const rate = CURRENCIES[currency].rate;
  return priceSar * rate;
}

export function formatPrice(priceSar: number, currency: CurrencyCode): string {
  const converted = convertPrice(priceSar, currency);
  const formatted = converted.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: converted < 100 ? 3 : 0,
  });
  return `${formatted} ${CURRENCIES[currency].symbol}`;
}

export function formatNativePrice(priceSar: number, agencyCountry: string): string {
  const currency = getCurrencyForCountry(agencyCountry);
  return formatPrice(priceSar, currency);
}

export function formatPriceWithEstimate(
  priceSar: number,
  agencyCountry: string,
  displayCurrency: CurrencyCode,
): { native: string; estimate: string | null; nativeCurrency: CurrencyCode } {
  const nativeCurrency = getCurrencyForCountry(agencyCountry);
  const native = formatPrice(priceSar, nativeCurrency);
  if (displayCurrency === nativeCurrency) return { native, estimate: null, nativeCurrency };
  const estimate = formatPrice(priceSar, displayCurrency);
  return { native, estimate, nativeCurrency };
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export function formatExpiryMonth(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const d = new Date(expiresAt);
  if (isNaN(d.getTime())) return null;
  return `${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatExpiryDate(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const d = new Date(expiresAt);
  if (isNaN(d.getTime())) return null;
  return `${d.getDate()} ${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function getDaysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}
