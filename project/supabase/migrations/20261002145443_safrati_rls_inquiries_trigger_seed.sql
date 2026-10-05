/*
# Safrati — RLS policies for inquiries, trigger, and seed data
*/

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inquiries_insert_public" ON inquiries;
CREATE POLICY "inquiries_insert_public" ON inquiries FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "inquiries_select_admin" ON inquiries;
CREATE POLICY "inquiries_select_admin" ON inquiries FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "inquiries_select_own" ON inquiries;
CREATE POLICY "inquiries_select_own" ON inquiries FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.agency_id = inquiries.agency_id)
);

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ SEED DATA ============
INSERT INTO agencies (id, name, contact_name, whatsapp_number, email, city, approved)
SELECT 'a0000000-0000-0000-0000-000000000001', 'رحلات الخليج السياحية', 'أحمد المالكي', '966551234567', 'gulftravels@safrati.demo', 'الرياض', true
WHERE NOT EXISTS (SELECT 1 FROM agencies WHERE id = 'a0000000-0000-0000-0000-000000000001');

INSERT INTO agencies (id, name, contact_name, whatsapp_number, email, city, approved)
SELECT 'a0000000-0000-0000-0000-000000000002', 'الشفاء للسياحة العلاجية', 'د. سارة العتيبي', '971501234567', 'shifa@safrati.demo', 'دبي', true
WHERE NOT EXISTS (SELECT 1 FROM agencies WHERE id = 'a0000000-0000-0000-0000-000000000002');

INSERT INTO agencies (id, name, contact_name, whatsapp_number, email, city, approved)
SELECT 'a0000000-0000-0000-0000-000000000003', 'بوابات العلم للدراسة بالخارج', 'خالد الكواري', '97433445566', 'eduways@safrati.demo', 'الدوحة', true
WHERE NOT EXISTS (SELECT 1 FROM agencies WHERE id = 'a0000000-0000-0000-0000-000000000003');

INSERT INTO packages (agency_id, title, description, category, destination, destination_country, departure_city, duration_days, hotel_stars, flight_included, flight_details, inclusions, terms, price_sar, image_url, status)
SELECT 'a0000000-0000-0000-0000-000000000001', 'جولة استانبول السياحية 5 أيام', 'اكتشف سحر استانبول مع جولة شاملة تشمل الفندق والرحلات المصحوبة بمرشد عربي.', 'leisure', 'استانبول', 'تركيا', 'الرياض', 5, 4, true, 'خطوط تركية - اقتصادي ذهاب وعودة', ARRAY['الفندق 4 نجوم','التذاكر الجوية','رحلات يومية','مرشد سياحي عربي','نقل المطار'],'الأسعار تشمل الضريبة. الإلغاء قبل 7 أيام من الموعد.', 3200, '', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE title = 'جولة استانبول السياحية 5 أيام');

INSERT INTO packages (agency_id, title, description, category, destination, destination_country, departure_city, duration_days, hotel_stars, flight_included, flight_details, inclusions, terms, price_sar, image_url, status)
SELECT 'a0000000-0000-0000-0000-000000000001', 'مالديف جنة الأرض 7 أيام', 'استمتع بقضاء أجمل الأوقات في جزر المالديف مع إقامة فاخرة على الشاطئ.', 'leisure', 'ماليه', 'المالديف', 'دبي', 7, 5, true, 'طيران الامارات - درجة اولى', ARRAY['فلل على الشاطئ','تذاكر جوية','افطار وعشاء','سبا مرة واحدة','رحلة قارب'],'الحجز يؤكد بمقدم 30%. الالغاء غير قابل للاسترداد.', 8500, '', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE title = 'مالديف جنة الأرض 7 أيام');

INSERT INTO packages (agency_id, title, description, category, destination, destination_country, departure_city, duration_days, hotel_stars, flight_included, flight_details, inclusions, terms, price_sar, image_url, status)
SELECT 'a0000000-0000-0000-0000-000000000002', 'فحص شامل في بانكوك 7 أيام', 'برنامج فحص طبي شامل في مستشفيات بانكوك المعتمدة مع اقامة فندقية.', 'medical', 'بانكوك', 'تايلاند', 'الكويت', 7, 5, true, 'طيران الكويت - اقتصادي', ARRAY['فحص شامل','اقامة فندق 5 نجوم','ترجمة طبية','نقل من والى المستشفى','متابعة بعد العودة'],'النتائج الطبية سرية. يتطلب موعد مسبق.', 6500, '', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE title = 'فحص شامل في بانكوك 7 أيام');

INSERT INTO packages (agency_id, title, description, category, destination, destination_country, departure_city, duration_days, hotel_stars, flight_included, flight_details, inclusions, terms, price_sar, image_url, status)
SELECT 'a0000000-0000-0000-0000-000000000002', 'علاج الاسنان في بودابست', 'علاج وتجميل الاسنان في عيادات بودابست المعتمدة دوليا بأسعار تنافسية.', 'medical', 'بودابست', 'المجر', 'الرياض', 10, 4, true, 'طيران - اقتصادي', ARRAY['كشف وتشخيص','علاج الاسنان','اقامة فندق 4 نجوم','ترجمة'],'قد يتطلب عدة زيارات حسب الحالة.', 4200, '', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE title = 'علاج الاسنان في بودابست');

INSERT INTO packages (agency_id, title, description, category, destination, destination_country, departure_city, duration_days, hotel_stars, flight_included, flight_details, inclusions, terms, price_sar, image_url, status)
SELECT 'a0000000-0000-0000-0000-000000000003', 'دورة لغة انجليزية في لندن 4 اسابيع', 'دورة مكثفة لتعلم اللغة الانجليزية في معهد معتمد في لندن مع اقامة عائلية.', 'study', 'لندن', 'المملكة المتحدة', 'الدوحة', 28, 3, true, 'قطر للطيران - اقتصادي', ARRAY['رسوم الدراسة','اقامة عائلية','تأشيرة طالب','كتب ومواد','أنشطة اجتماعية'],'يتطلب جواز سفر ساري 6 اشهر.', 9500, '', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE title = 'دورة لغة انجليزية في لندن 4 اسابيع');

INSERT INTO packages (agency_id, title, description, category, destination, destination_country, departure_city, duration_days, hotel_stars, flight_included, flight_details, inclusions, terms, price_sar, image_url, status)
SELECT 'a0000000-0000-0000-0000-000000000003', 'بكالوريوس ادارة اعمال في ماليزيا', 'القبول المباشر في جامعة ماليزية معتمدة لتخصص ادارة الاعمال باللغة الانجليزية.', 'study', 'كوالالمبور', 'ماليزيا', 'المنامة', 365, 4, false, '', ARRAY['رسوم الفصل الاول','مسكن طلابي','تأشيرة طالب','استقبال المطار'],'الرسوم لفصل دراسي واحد قابل للتجديد.', 18000, '', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE title = 'بكالوريوس ادارة اعمال في ماليزيا');

INSERT INTO packages (agency_id, title, description, category, destination, destination_country, departure_city, duration_days, hotel_stars, flight_included, flight_details, inclusions, terms, price_sar, image_url, status)
SELECT 'a0000000-0000-0000-0000-000000000001', 'باريس الرومانسية 6 أيام', 'رحلة ساحرة إلى باريس تشمل زيارة برج ايفل ومتحف اللوفر والنزهة في نهر السين.', 'leisure', 'باريس', 'فرنسا', 'دبي', 6, 4, true, 'طيران الإمارات - اقتصادي', ARRAY['الفندق 4 نجوم','تذاكر جوية','جولة برج ايفل','متحف اللوفر','نزهة نهر السين'],'تأشيرة شنغن مطلوبة. يمكن المساعدة في الاستخراج.', 5500, '', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE title = 'باريس الرومانسية 6 أيام');
