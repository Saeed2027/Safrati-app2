import { supabase } from '@/lib/supabase';
import { GCC_CITIES, GCC_COUNTRIES, COUNTRY_CURRENCY_MAP } from '@/lib/types';

export interface FeedSource {
  id: string;
  name: string;
  source_type: 'json_api' | 'csv_file' | 'simulated' | 'rss_feed';
  country: string;
  url: string;
  default_agency_id: string | null;
  auto_approve: boolean;
  active: boolean;
  default_expiry_days: number;
  last_run_at: string | null;
  created_at: string;
}

export interface FeedImport {
  id: string;
  feed_source_id: string | null;
  source_name: string;
  status: 'running' | 'success' | 'failed' | 'partial';
  imported_count: number;
  updated_count: number;
  skipped_count: number;
  error_message: string;
  started_at: string;
  finished_at: string | null;
}

export interface FeedOffer {
  title: string;
  description: string;
  category: 'leisure' | 'medical' | 'study';
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
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
}

// ─── Simulated feed generators per country ──────────────────────────────────

const LEISURE_DESTINATIONS: Record<string, [string, string][]> = {
  'السعودية': [['باكو', 'أذربيجان'], ['طرابزيون', 'تركيا'], ['طشقند', 'أوزبكستان'], ['كوالالمبور', 'ماليزيا']],
  'الإمارات': [['إسطنبول', 'تركيا'], ['صلالة', 'عمان'], ['باكو', 'أذربيجان'], ['تبليسي', 'جورجيا']],
  'قطر': [['بالي', 'إندونيسيا'], ['بانكوك', 'تايلاند'], ['كاتماندو', 'نيبال'], ['موريشيوس', 'موريشيوس']],
  'الكويت': [['دبي', 'الإمارات'], ['صنعاء', 'اليمن'], ['أثينا', 'اليونان'], ['تبليسي', 'جورجيا']],
  'البحرين': [['ألمانيا', 'ألمانيا'], ['لندن', 'بريطانيا'], ['باريس', 'فرنسا'], ['روما', 'إيطاليا']],
  'عمان': [['سالالاه', 'عمان'], ['كولومبو', 'سريلانكا'], ['ماليه', 'المالديف'], ['زنجبار', 'تنزانيا']],
};

const MEDICAL_DESTINATIONS: [string, string][] = [
  ['أنقرة', 'تركيا'], ['بانكوك', 'تايلاند'], ['سيول', 'كوريا الجنوبية'], ['فرانكفورت', 'ألمانيا'],
];

const STUDY_DESTINATIONS: [string, string][] = [
  ['لندن', 'بريطانيا'], ['تورنتو', 'كندا'], ['ملبورن', 'أستراليا'], ['دبلن', 'أيرلندا'],
];

const HOTEL_INCLUSIONS = ['الإقامة الفندقية', 'وجبة الإفطار', 'النقل الداخلي', 'جولات سياحية مرشدة', 'تأمين السفر'];
const MEDICAL_INCLUSIONS = ['الاستشارة الطبية', 'الفحوصات الشاملة', 'الإقامة الفندقية', 'الترجمة الطبية', 'النقل من المطار'];
const STUDY_INCLUSIONS = ['رسوم الدراسة', 'الإقامة في السكن الطلابي', 'التأشيرة الطلابية', 'الاستشارة الأكاديمية', 'التأمين الصحي'];

const TERMS = 'الأسعار قابلة للتغيير حسب التوفر. الدفع مقدماً بنسبة 30%. الإلغاء قبل 14 يوماً بدون رسوم.';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function generateOffers(country: string, count: number): FeedOffer[] {
  const cityMap: Record<string, string> = {
    'السعودية': 'الرياض',
    'الإمارات': 'دبي',
    'قطر': 'الدوحة',
    'الكويت': 'الكويت',
    'البحرين': 'المنامة',
    'عمان': 'مسقط',
  };
  const departureCity = cityMap[country] ?? 'الرياض';
  const leisureDests = LEISURE_DESTINATIONS[country] ?? LEISURE_DESTINATIONS['السعودية'];
  const offers: FeedOffer[] = [];

  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    if (roll < 0.6) {
      const [dest, destCountry] = pick(leisureDests);
      const days = 4 + Math.floor(Math.random() * 8);
      const stars = 3 + Math.floor(Math.random() * 3);
      offers.push({
        title: `عرض سياحي ${dest} — ${days} أيام`,
        description: `اكتشف جمال ${dest} مع باقة سياحية متكاملة تشمل الإقامة والجولات. عرض حصري لفترة محدودة.`,
        category: 'leisure',
        destination: dest,
        destination_country: destCountry,
        departure_city: departureCity,
        duration_days: days,
        hotel_stars: stars,
        flight_included: true,
        flight_details: 'طيران اقتصادي — ذهاب وعودة',
        inclusions: pickN(HOTEL_INCLUSIONS, 3 + Math.floor(Math.random() * 2)),
        terms: TERMS,
        price_sar: 2500 + Math.floor(Math.random() * 8000),
        image_url: '',
      });
    } else if (roll < 0.85) {
      const [dest, destCountry] = pick(MEDICAL_DESTINATIONS);
      const days = 7 + Math.floor(Math.random() * 14);
      offers.push({
        title: `برنامج علاجي في ${dest} — ${days} أيام`,
        description: `برنامج علاجي شامل في أفضل المستشفيات المعتمدة في ${dest}. يشمل الاستشارات والفحوصات والإقامة.`,
        category: 'medical',
        destination: dest,
        destination_country: destCountry,
        departure_city: departureCity,
        duration_days: days,
        hotel_stars: 4,
        flight_included: true,
        flight_details: 'طيران اقتصادي — ذهاب وعودة',
        inclusions: pickN(MEDICAL_INCLUSIONS, 4),
        terms: TERMS,
        price_sar: 15000 + Math.floor(Math.random() * 50000),
        image_url: '',
      });
    } else {
      const [dest, destCountry] = pick(STUDY_DESTINATIONS);
      const weeks = 12 + Math.floor(Math.random() * 24);
      offers.push({
        title: `منحة دراسية في ${dest} — ${weeks} أسبوع`,
        description: `فرصة دراسية في مؤسسات تعليمية معتمدة في ${dest}. يشمل التسجيل والإقامة والاستشارة الأكاديمية.`,
        category: 'study',
        destination: dest,
        destination_country: destCountry,
        departure_city: departureCity,
        duration_days: weeks * 7,
        hotel_stars: null,
        flight_included: false,
        flight_details: '',
        inclusions: pickN(STUDY_INCLUSIONS, 4),
        terms: TERMS,
        price_sar: 20000 + Math.floor(Math.random() * 60000),
        image_url: '',
      });
    }
  }

  return offers;
}

// ─── Import pipeline ─────────────────────────────────────────────────────────

export async function runFeedImport(source: FeedSource): Promise<ImportResult> {
  const startedAt = new Date().toISOString();
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0 };

  // Create import log entry
  const { data: logEntry } = await supabase.from('feed_imports').insert({
    feed_source_id: source.id,
    source_name: source.name,
    status: 'running',
    started_at: startedAt,
  }).select().single();

  try {
    // Resolve or create agency for this source's country
    let agencyId = source.default_agency_id;
    if (!agencyId) {
      const { data: agencyIdData, error: agencyError } = await supabase.rpc('get_or_create_masked_agency', {
        p_country: source.country,
      });
      if (agencyError || !agencyIdData) {
        throw new Error(`Failed to resolve agency for ${source.country}: ${agencyError?.message ?? 'unknown'}`);
      }
      agencyId = agencyIdData as string;
    }

    // Generate simulated offers
    const offerCount = 3 + Math.floor(Math.random() * 5);
    const offers = generateOffers(source.country, offerCount);

    const expiryDate = new Date(Date.now() + source.default_expiry_days * 86400000).toISOString();
    const status = source.auto_approve ? 'approved' : 'pending';

    for (const offer of offers) {
      // Check for duplicate by title + agency
      const { data: existing } = await supabase
        .from('packages')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('title', offer.title)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from('packages')
          .update({
            description: offer.description,
            price_sar: offer.price_sar,
            duration_days: offer.duration_days,
            expires_at: expiryDate,
            status,
            inclusions: offer.inclusions,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          result.skipped++;
        } else {
          result.updated++;
        }
      } else {
        // Insert new
        const { error: insertError } = await supabase.from('packages').insert({
          agency_id: agencyId,
          title: offer.title,
          description: offer.description,
          category: offer.category,
          destination: offer.destination,
          destination_country: offer.destination_country,
          departure_city: offer.departure_city,
          duration_days: offer.duration_days,
          hotel_stars: offer.hotel_stars,
          flight_included: offer.flight_included,
          flight_details: offer.flight_details,
          inclusions: offer.inclusions,
          terms: offer.terms,
          price_sar: offer.price_sar,
          image_url: offer.image_url,
          status,
          expires_at: expiryDate,
        });

        if (insertError) {
          result.skipped++;
        } else {
          result.imported++;
        }
      }
    }

    // Update source last_run_at
    await supabase.from('feed_sources').update({
      last_run_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', source.id);

    // Update import log
    const finalStatus = result.skipped > 0 && result.imported === 0 && result.updated === 0 ? 'failed' : 'success';
    if (logEntry) {
      await supabase.from('feed_imports').update({
        status: finalStatus,
        imported_count: result.imported,
        updated_count: result.updated,
        skipped_count: result.skipped,
        finished_at: new Date().toISOString(),
      }).eq('id', logEntry.id);
    }

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (logEntry) {
      await supabase.from('feed_imports').update({
        status: 'failed',
        error_message: errorMsg,
        imported_count: result.imported,
        updated_count: result.updated,
        skipped_count: result.skipped,
        finished_at: new Date().toISOString(),
      }).eq('id', logEntry.id);
    }
    throw err;
  }
}

export async function runAllActiveFeeds(): Promise<{ totalImported: number; totalUpdated: number; sourcesRun: number; errors: string[] }> {
  const { data: sources, error } = await supabase
    .from('feed_sources')
    .select('*')
    .eq('active', true);

  if (error) throw new Error(`Failed to fetch feed sources: ${error.message}`);

  const errors: string[] = [];
  let totalImported = 0;
  let totalUpdated = 0;

  for (const source of (sources ?? []) as FeedSource[]) {
    try {
      const result = await runFeedImport(source);
      totalImported += result.imported;
      totalUpdated += result.updated;
    } catch (err) {
      errors.push(`${source.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { totalImported, totalUpdated, sourcesRun: (sources ?? []).length, errors };
}

// ─── Seed default feed sources ──────────────────────────────────────────────

export async function seedDefaultFeedSources(): Promise<void> {
  const { data: existing } = await supabase.from('feed_sources').select('id').limit(1);
  if (existing && existing.length > 0) return;

  const defaultSources = GCC_COUNTRIES.map((country) => ({
    name: `مصدر ${country} الآلي`,
    source_type: 'simulated' as const,
    country,
    url: '',
    auto_approve: true,
    active: true,
    default_expiry_days: 90,
  }));

  await supabase.from('feed_sources').insert(defaultSources);
}

// ─── Live sync: auto-expire + aggregate ─────────────────────────────────────

export async function performLiveSync(): Promise<{ expired: number; imported: number; updated: number; errors: string[] }> {
  // 1. Auto-expire stale offers
  const { data: expireResult } = await supabase.rpc('auto_expire_packages');
  const expiredCount = (expireResult as unknown as { expired_count: number }[])?.[0]?.expired_count ?? 0;

  // 2. Run all active feed sources
  const feedResult = await runAllActiveFeeds();

  return {
    expired: expiredCount,
    imported: feedResult.totalImported,
    updated: feedResult.totalUpdated,
    errors: feedResult.errors,
  };
}
