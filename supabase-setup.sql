-- ============================================================
-- Sunbelt Plumbing — Supabase Setup Script
-- Version: v1.0 (Apr 24, 2026)
-- ============================================================
-- HOW TO USE:
--   1. Open Supabase Dashboard → SQL Editor → New query
--   2. Paste this ENTIRE file
--   3. Click "Run"
--   4. Then manually create the storage bucket (instructions at bottom)
--
-- This script is IDEMPOTENT — safe to re-run.
-- ============================================================


-- ------------------------------------------------------------
-- 1. TABLES
-- ------------------------------------------------------------

-- Gallery photos (CRUD enabled in v1 admin)
CREATE TABLE IF NOT EXISTS gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  caption text,
  category text DEFAULT 'other',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gallery_active_order_idx
  ON gallery (is_active, display_order) WHERE is_active = true;


-- Testimonials / customer reviews (CRUD enabled in v1)
CREATE TABLE IF NOT EXISTS testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_location text,
  service_type text,
  rating smallint DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  quote text NOT NULL,
  avatar_letter text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS testimonials_active_order_idx
  ON testimonials (is_active, display_order) WHERE is_active = true;


-- Services (read-only for public, editable admin v2)
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  icon_name text,
  image_url text,
  display_order integer DEFAULT 0,
  is_featured_on_home boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- Price list items (editable admin v2)
CREATE TABLE IF NOT EXISTS prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  item_name text NOT NULL,
  price numeric(10, 2) NOT NULL,
  notes text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- Service areas (city chips)
CREATE TABLE IF NOT EXISTS service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name text NOT NULL,
  is_primary boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);


-- Site settings (singleton — one row with id = 'main')
CREATE TABLE IF NOT EXISTS site_settings (
  id text PRIMARY KEY DEFAULT 'main',
  phone text,
  email text,
  facebook_url text,
  business_hours text,
  service_area_text text,
  business_address text,
  emergency_tagline text,
  commitment_headline text,
  commitment_body text,
  roc_number text,
  updated_at timestamptz DEFAULT now()
);


-- Audit log (tracks every admin change for troubleshooting)
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text,
  table_name text NOT NULL,
  record_id text,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC);


-- ------------------------------------------------------------
-- 2. updated_at AUTO-TRIGGER
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['gallery','testimonials','services','prices','site_settings']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_%s_updated_at ON %I;', t, t);
    EXECUTE format('CREATE TRIGGER set_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t, t);
  END LOOP;
END$$;


-- ------------------------------------------------------------
-- 3. ROW LEVEL SECURITY — the security core
-- ------------------------------------------------------------
-- Strategy:
--   • Public (anon key) can READ active rows only
--   • Authenticated users (Princess) can READ + WRITE everything
--   • audit_log is authenticated-write, authenticated-read (not public)

ALTER TABLE gallery        ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials   ENABLE ROW LEVEL SECURITY;
ALTER TABLE services       ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log      ENABLE ROW LEVEL SECURITY;


-- Drop existing policies so this script is re-runnable
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND tablename IN ('gallery','testimonials','services','prices','service_areas','site_settings','audit_log')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END$$;


-- Public read policies (active rows only)
CREATE POLICY "public read active gallery"      ON gallery       FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "public read active testimonials" ON testimonials  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "public read active services"     ON services      FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "public read active prices"       ON prices        FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "public read active areas"        ON service_areas FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "public read settings"            ON site_settings FOR SELECT TO anon, authenticated USING (true);

-- Authenticated full CRUD
CREATE POLICY "authenticated manage gallery"      ON gallery       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated manage testimonials" ON testimonials  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated manage services"     ON services      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated manage prices"       ON prices        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated manage areas"        ON service_areas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated manage settings"     ON site_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Audit log: authenticated read + write only, not public
CREATE POLICY "authenticated read audit"  ON audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated write audit" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);


-- ------------------------------------------------------------
-- 4. SEED DATA — initial content
-- ------------------------------------------------------------

-- Site settings singleton row
INSERT INTO site_settings (id, phone, email, facebook_url, business_hours, service_area_text,
                           emergency_tagline, commitment_headline, commitment_body, roc_number)
VALUES (
  'main',
  '(480) 527-5385',
  'shan@sunbeltplumbingaz.com',
  'https://fb.com/SunbeltPlumbingLLC',
  '24-hour service',
  'Arizona City & Casa Grande · Phoenix to Tucson',
  'We handle the pressure so you don''t have to.',
  'Our Commitment',
  'As a family-owned and operated company, we are dedicated to delivering exceptional service and complete customer satisfaction. At Sunbelt Plumbing, we believe in honest, transparent pricing—never charging unnecessary fees for unforeseen issues, and never adding after-hours or trip charges. All of our work is backed by an industry-leading warranty, giving you 24/7 peace of mind. If any issue arises, you can count on us to respond promptly and make it right. That''s our commitment to you at Sunbelt Plumbing.',
  '344103'
) ON CONFLICT (id) DO NOTHING;


-- Service areas (matches hardcoded chips on homepage)
INSERT INTO service_areas (city_name, is_primary, display_order) VALUES
  ('Arizona City', true,  10),
  ('Casa Grande',  true,  20),
  ('Maricopa',     false, 30),
  ('Phoenix',      false, 40),
  ('Tucson',       false, 50),
  ('Eloy',         false, 60),
  ('Coolidge',     false, 70),
  ('Florence',     false, 80),
  ('Chandler',     false, 90),
  ('Mesa',         false, 100),
  ('Oro Valley',   false, 110),
  ('Marana',       false, 120)
ON CONFLICT DO NOTHING;


-- Services (Shan's flyer order)
INSERT INTO services (slug, title, description, image_url, display_order, is_featured_on_home) VALUES
  ('sewer-camera-locating', 'Sewer Camera Locating', 'Pinpoint sewer line issues with high-resolution camera inspections — no guessing, no unnecessary digging.', '/images/sewer_camera.jpg', 10, true),
  ('sewer-main-repairs',    'Sewer Main Repairs',    'Repair or replace damaged sewer mains — traditional and trenchless methods for minimal disruption.', null, 20, true),
  ('drain-clearing',        'Drain Clearing',        'Clear stubborn clogs in showers, sinks, toilets, and main lines with professional cable and hydro-jet equipment.', null, 30, true),
  ('whole-house-repipes',   'Whole House Repipes',   'Replace your home''s old or corroded pipes with modern materials built to last decades.', null, 40, true),
  ('water-heaters',         'Water Heaters',         'Installation, repair, and replacement of standard tank and tankless water heaters — electric and gas.', '/images/water_heater.jpg', 50, true),
  ('water-softeners',       'Water Softeners',       'Protect your pipes and appliances from Arizona''s hard water with a professionally installed softener system.', null, 60, true),
  ('permits-inspections',   'Permits & Inspections', 'We pull city permits and handle inspections so your project is fully up to code — no shortcuts, no surprises.', null, 70, true),
  ('diagnosis-repair',      'Diagnosis & Repair',    'Accurate diagnosis of any plumbing issue, followed by a clean, lasting repair done right the first time.', '/images/wrench_pipe.jpg', 80, true),
  ('fixture-installations', 'Fixture Installations', 'Sinks, toilets, faucets, shower valves, garbage disposals — installed cleanly and to code.', null, 90, true)
ON CONFLICT (slug) DO NOTHING;


-- Prices from the 2026 PDF
INSERT INTO prices (category, item_name, price, display_order) VALUES
  -- Drain & Sewer
  ('drain-sewer', 'Cable Clear Shower',                 189.00, 10),
  ('drain-sewer', 'Cable Clear Kitchen Clog',           189.00, 20),
  ('drain-sewer', 'Cable Clear Bathroom Sink',          189.00, 30),
  ('drain-sewer', 'Auger Toilet',                       189.00, 40),
  ('drain-sewer', 'Cable Clear Main Line Clog',         289.00, 50),
  ('drain-sewer', 'Camera Sewer Line',                  250.00, 60),
  -- Fixture & Appliance
  ('fixture-install', 'Supply & Install Standard Toilet',                                 459.00, 100),
  ('fixture-install', 'Supply & Install Moen Shower Valve',                               629.00, 110),
  ('fixture-install', 'Supply & Install TWO (Tub Waste & Overflow)',                      349.00, 120),
  ('fixture-install', 'Supply & Install 60"x30" Fiberglass Tub & Surround',              2250.00, 130),
  ('fixture-install', 'Supply & Install Standard 40-gallon Electric Water Heater',       1289.00, 140),
  ('fixture-install', 'Supply & Install Ice Maker Box',                                   289.00, 150),
  ('fixture-install', 'Supply & Install Hot & Cold Washer Valves',                        289.00, 160),
  ('fixture-install', 'Supply & Install Washer Box with P-trap Riser',                    415.00, 170),
  ('fixture-install', 'Supply & Install Angle Stop Valves (each)',                         89.00, 180),
  ('fixture-install', 'Supply & Install Garbage Disposal',                                419.00, 190),
  -- Ball Valves
  ('ball-valves', 'Supply & Install 1/2" Ball Valve Above Ground',   219.00, 200),
  ('ball-valves', 'Supply & Install 3/4" Ball Valve Above Ground',   249.00, 210),
  ('ball-valves', 'Supply & Install 1" Ball Valve Above Ground',     289.00, 220),
  ('ball-valves', 'Supply & Install 1.25" Ball Valve Above Ground',  349.00, 230),
  ('ball-valves', 'Supply & Install 1.5" Ball Valve Above Ground',   389.00, 240),
  ('ball-valves', 'Supply & Install 2" Ball Valve Above Ground',     439.00, 250),
  -- HBC Fan Coil
  ('fan-coil', 'Supply & Install 4 HBC Fan Coil with Flush Valves',   1289.00, 300),
  ('fan-coil', 'Supply & Install 6 HBC Fan Coil with Flush Valves',   1389.00, 310),
  ('fan-coil', 'Supply & Install 8 HBC Fan Coil with Flush Valves',   1489.00, 320),
  ('fan-coil', 'Supply & Install 10 HBC Fan Coil with Flush Valves',  1789.00, 330),
  ('fan-coil', 'Supply & Install Fan Coil Digital Thermostat',         409.00, 340),
  ('fan-coil', 'Supply & Install Flush Valves & Clean Coils',          389.00, 350),
  ('fan-coil', 'Flush Fan Coil & Clean Coils',                         189.00, 360);


-- Placeholder testimonials (replace with real reviews via admin)
INSERT INTO testimonials (customer_name, customer_location, service_type, rating, quote, avatar_letter, display_order) VALUES
  ('Maria L.',  'Phoenix',     'Water heater repair',  5, 'Showed up on time, fixed our water heater the same day, and the price was exactly what they quoted. Couldn''t ask for a better experience.', 'M', 10),
  ('James R.',  'Casa Grande', 'Emergency repair',     5, 'Had a midnight pipe burst and they were at my door within the hour. Friendly, professional, and incredibly skilled. Lifesavers.', 'J', 20),
  ('Diane K.',  'Tucson',      'Bathroom remodel',     5, 'Renovated our entire bathroom plumbing. Clean work, fair price, and they actually picked up when I called with questions. Highly recommend.', 'D', 30)
ON CONFLICT DO NOTHING;


-- ============================================================
-- 5. STORAGE BUCKET — MANUAL STEP REQUIRED
-- ============================================================
-- After running this SQL, create the "gallery" storage bucket
-- in the Supabase dashboard:
--
-- 1. Go to: Storage → New bucket
-- 2. Name: gallery
-- 3. Public bucket: ✅ YES (check the box)
-- 4. File size limit: 5 MB
-- 5. Allowed MIME types: image/jpeg, image/png, image/webp
-- 6. Click "Create bucket"
--
-- Then add this Storage policy so authenticated users can upload:
-- 1. Go to: Storage → gallery → Policies
-- 2. New Policy → "For full customization"
-- 3. Paste:
--
--    CREATE POLICY "authenticated upload" ON storage.objects
--      FOR INSERT TO authenticated
--      WITH CHECK (bucket_id = 'gallery');
--
--    CREATE POLICY "authenticated delete" ON storage.objects
--      FOR DELETE TO authenticated
--      USING (bucket_id = 'gallery');
--
-- Public SELECT is automatic when bucket is marked public.
-- ============================================================

-- Done! Check the Table Editor to verify tables + seeded rows.
