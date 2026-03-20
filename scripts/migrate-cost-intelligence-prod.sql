-- Cost Intelligence Engine — Production Migration
-- Run this in your production database (Vercel / Neon console)
-- Safe to run multiple times (uses IF NOT EXISTS)

-- 1. regional_cost_modifiers
CREATE TABLE IF NOT EXISTS regional_cost_modifiers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_code      VARCHAR(20)  NOT NULL,
  region_name      VARCHAR(100) NOT NULL,
  labor_factor     NUMERIC      NOT NULL DEFAULT 1.0000,
  material_factor  NUMERIC      NOT NULL DEFAULT 1.0000,
  overall_factor   NUMERIC      NOT NULL DEFAULT 1.0000,
  metro_areas      TEXT[],
  states           TEXT[],
  source           VARCHAR(80)  DEFAULT 'RSMeans City Cost Index',
  updated_at       TIMESTAMP    NOT NULL DEFAULT now()
);

-- 2. cost_estimate_templates
CREATE TABLE IF NOT EXISTS cost_estimate_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name    VARCHAR(100) NOT NULL,
  template_slug    VARCHAR(60)  NOT NULL,
  description      TEXT,
  property_type    VARCHAR(20)  NOT NULL DEFAULT 'both',
  rehab_category   VARCHAR(40)  NOT NULL,
  scope_items_json JSONB        NOT NULL,
  is_system        BOOLEAN      NOT NULL DEFAULT true,
  created_at       TIMESTAMP    NOT NULL DEFAULT now()
);

-- 3. cost_estimates
CREATE TABLE IF NOT EXISTS cost_estimates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id               UUID,
  property_id           UUID,
  inspection_session_id UUID,
  estimate_name         VARCHAR(255) NOT NULL,
  property_type         VARCHAR(20)  NOT NULL DEFAULT 'multifamily',
  status                VARCHAR(30)  NOT NULL DEFAULT 'draft',
  region_code           VARCHAR(20),
  total_units           INTEGER      NOT NULL DEFAULT 1,
  avg_unit_sqft         NUMERIC,
  total_sqft            NUMERIC,
  contingency_pct       NUMERIC      NOT NULL DEFAULT 0.1000,
  soft_cost_pct         NUMERIC      NOT NULL DEFAULT 0.05,
  labor_adj_pct         NUMERIC      NOT NULL DEFAULT 0.0000,
  material_adj_pct      NUMERIC      NOT NULL DEFAULT 0.0000,
  provider              VARCHAR(40)  NOT NULL DEFAULT 'craftsman_local',
  arv_estimate          NUMERIC,
  hard_cost_total       NUMERIC,
  soft_cost_total       NUMERIC,
  contingency_total     NUMERIC,
  grand_total           NUMERIC,
  per_unit_cost         NUMERIC,
  per_sqft_cost         NUMERIC,
  cost_low              NUMERIC,
  cost_high             NUMERIC,
  confidence            NUMERIC,
  version               INTEGER      NOT NULL DEFAULT 1,
  generated_at          TIMESTAMP,
  notes                 TEXT,
  created_by            VARCHAR(255),
  created_at            TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at            TIMESTAMP    NOT NULL DEFAULT now()
);

-- 4. cost_estimate_versions
CREATE TABLE IF NOT EXISTS cost_estimate_versions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id  UUID      NOT NULL REFERENCES cost_estimates(id) ON DELETE CASCADE,
  version      INTEGER   NOT NULL,
  snapshot_json JSONB    NOT NULL,
  triggered_by VARCHAR(60),
  notes        TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT now()
);

-- 5. cost_estimate_scope_items
CREATE TABLE IF NOT EXISTS cost_estimate_scope_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id         UUID        NOT NULL REFERENCES cost_estimates(id) ON DELETE CASCADE,
  area_label          VARCHAR(100),
  trade               VARCHAR(60) NOT NULL,
  item_name           VARCHAR(255) NOT NULL,
  quantity            NUMERIC     NOT NULL DEFAULT 1,
  unit                VARCHAR(30) NOT NULL DEFAULT 'each',
  condition           VARCHAR(30),
  severity            VARCHAR(20),
  repair_or_replace   VARCHAR(20) NOT NULL DEFAULT 'replace',
  scope_note          TEXT,
  photo_refs          TEXT[],
  voice_note_ref      VARCHAR(255),
  room_observation    TEXT,
  applies_to_all_units BOOLEAN    NOT NULL DEFAULT false,
  unit_labels         TEXT[],
  mapped_benchmark_id UUID,
  mapped_provider     VARCHAR(40),
  mapping_confidence  NUMERIC,
  mapping_method      VARCHAR(30) DEFAULT 'auto',
  regional_factor     NUMERIC,
  labor_factor        NUMERIC,
  material_factor     NUMERIC,
  waste_factor        NUMERIC     NOT NULL DEFAULT 0.05,
  contingency_factor  NUMERIC     NOT NULL DEFAULT 0.10,
  cv_inference_ready  BOOLEAN     NOT NULL DEFAULT false,
  cv_inference_ref    VARCHAR(255),
  sort_order          INTEGER     DEFAULT 0,
  created_at          TIMESTAMP   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP   NOT NULL DEFAULT now()
);

-- 6. cost_estimate_line_items
CREATE TABLE IF NOT EXISTS cost_estimate_line_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id           UUID        NOT NULL REFERENCES cost_estimates(id) ON DELETE CASCADE,
  scope_item_id         UUID        REFERENCES cost_estimate_scope_items(id) ON DELETE SET NULL,
  trade                 VARCHAR(60) NOT NULL,
  description           VARCHAR(255) NOT NULL,
  quantity              NUMERIC     NOT NULL,
  unit                  VARCHAR(30) NOT NULL,
  unit_material_cost    NUMERIC,
  unit_labor_cost       NUMERIC,
  unit_equipment_cost   NUMERIC,
  unit_total_cost       NUMERIC,
  subtotal_material     NUMERIC,
  subtotal_labor        NUMERIC,
  subtotal_equipment    NUMERIC,
  subtotal_pre_adj      NUMERIC,
  regional_factor_applied NUMERIC,
  labor_adj_applied     NUMERIC,
  material_adj_applied  NUMERIC,
  waste_total           NUMERIC,
  line_total            NUMERIC,
  cost_low              NUMERIC,
  cost_high             NUMERIC,
  confidence            NUMERIC,
  provider              VARCHAR(40),
  benchmark_id          UUID,
  assumptions_json      JSONB,
  is_contingency        BOOLEAN     NOT NULL DEFAULT false,
  is_soft_cost          BOOLEAN     NOT NULL DEFAULT false,
  created_at            TIMESTAMP   NOT NULL DEFAULT now()
);

-- 7. cost_estimate_benchmarks
CREATE TABLE IF NOT EXISTS cost_estimate_benchmarks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id          UUID        NOT NULL REFERENCES cost_estimates(id) ON DELETE CASCADE,
  deal_id              UUID,
  property_type        VARCHAR(20),
  region_code          VARCHAR(20),
  provider_estimate    NUMERIC,
  adjusted_estimate    NUMERIC,
  contractor_bid       NUMERIC,
  approved_budget      NUMERIC,
  actual_cost          NUMERIC,
  variance_bid         NUMERIC,
  variance_bid_pct     NUMERIC,
  variance_actual      NUMERIC,
  variance_actual_pct  NUMERIC,
  trade_variances_json JSONB,
  project_status       VARCHAR(30) DEFAULT 'pending',
  geography            VARCHAR(100),
  notes                TEXT,
  created_at           TIMESTAMP   NOT NULL DEFAULT now(),
  updated_at           TIMESTAMP   NOT NULL DEFAULT now()
);

-- 8. rehab_cost_benchmarks (Craftsman NCE seed data table)
CREATE TABLE IF NOT EXISTS rehab_cost_benchmarks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system          VARCHAR(60)  NOT NULL,
  condition_level VARCHAR(30)  NOT NULL,
  property_type   VARCHAR(20)  NOT NULL DEFAULT 'both',
  cost_unit       VARCHAR(20)  NOT NULL DEFAULT 'per_unit',
  cost_low        NUMERIC      NOT NULL,
  cost_mid        NUMERIC      NOT NULL,
  cost_high       NUMERIC      NOT NULL,
  region          VARCHAR(30)  NOT NULL DEFAULT 'national',
  source          VARCHAR(80)  NOT NULL DEFAULT 'Craftsman National Construction Estimator',
  notes           TEXT,
  created_at      TIMESTAMP    NOT NULL DEFAULT now()
);

-- 9. re_rehab_scopes (field intelligence scope output)
CREATE TABLE IF NOT EXISTS re_rehab_scopes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id               UUID        NOT NULL,
  scenario_id           UUID,
  inspection_session_id UUID,
  scope_name            VARCHAR(255) NOT NULL,
  line_items            JSONB        NOT NULL,
  package_mix           JSONB,
  recommended_budget    NUMERIC,
  confidence            NUMERIC,
  generated_by          VARCHAR(42),
  created_at            TIMESTAMP    NOT NULL DEFAULT now()
);

-- SEED: Craftsman NCE reference costs (57 rows)
-- Skips insert if data already exists
INSERT INTO rehab_cost_benchmarks (system, condition_level, property_type, cost_unit, cost_low, cost_mid, cost_high, region, source, notes)
SELECT * FROM (VALUES
  ('appliances','full_replace','both','per_unit',2800,4200,6500,'national','Craftsman National Construction Estimator','Full suite — range, refrigerator, dishwasher, microwave, washer/dryer. Craftsman NCE Div 11.'),
  ('appliances','light_rehab','both','per_unit',150,350,600,'national','Craftsman National Construction Estimator','Clean, service, minor repair. Craftsman NCE Div 11.'),
  ('appliances','medium_rehab','both','per_unit',1200,2200,3500,'national','Craftsman National Construction Estimator','Replace 1-2 major appliances (range, refrigerator). Craftsman NCE Div 11.'),
  ('bathroom','full_replace','both','per_unit',8500,13000,20000,'national','Craftsman National Construction Estimator','Full gut — tile, tub/shower, vanity, toilet, plumbing rough, ventilation. Craftsman NCE Div 15.'),
  ('bathroom','light_rehab','both','per_unit',1200,2200,3200,'national','Craftsman National Construction Estimator','Recaulk, fixtures, accessories, paint. Craftsman NCE Div 15.'),
  ('bathroom','medium_rehab','both','per_unit',4000,6000,9500,'national','Craftsman National Construction Estimator','Vanity, toilet, tub surround, tile, paint. Craftsman NCE Div 15.'),
  ('common_area','full_replace','multifamily','per_unit',8000,16000,30000,'national','Craftsman National Construction Estimator','Full common area renovation — lobby, corridors, amenities. Craftsman NCE Div 9.'),
  ('common_area','light_rehab','multifamily','per_unit',500,1000,2000,'national','Craftsman National Construction Estimator','Paint corridors, touch up, cleaning. Craftsman NCE Div 9.'),
  ('common_area','medium_rehab','multifamily','per_unit',2000,4500,8000,'national','Craftsman National Construction Estimator','Flooring, lighting, mailboxes, paint. Craftsman NCE Div 9.'),
  ('doors','full_replace','both','per_door',750,1200,2200,'national','Craftsman National Construction Estimator','Exterior door replace — steel/fiberglass with frame and hardware. Craftsman NCE Div 8.'),
  ('doors','light_rehab','both','per_door',150,280,450,'national','Craftsman National Construction Estimator','Hardware replace, paint, adjustment. Craftsman NCE Div 8.'),
  ('doors','medium_rehab','both','per_door',280,450,700,'national','Craftsman National Construction Estimator','Interior door replace with hardware and trim. Craftsman NCE Div 8.'),
  ('electrical','full_replace','both','per_unit',8000,14000,25000,'national','Craftsman National Construction Estimator','Full rewire — panel, all circuits, fixtures, code compliance. Craftsman NCE Div 16.'),
  ('electrical','light_rehab','both','per_unit',400,900,1600,'national','Craftsman National Construction Estimator','Outlets, switches, fixtures, GFCI. Craftsman NCE Div 16.'),
  ('electrical','medium_rehab','both','per_unit',2500,4500,7500,'national','Craftsman National Construction Estimator','Panel upgrade, circuit additions, smoke detectors. Craftsman NCE Div 16.'),
  ('exterior','full_replace','both','per_sqft',6,10.5,16,'national','Craftsman National Construction Estimator','Full siding replace — vinyl, fiber cement. Craftsman NCE Div 7.'),
  ('exterior','light_rehab','both','per_sqft',1.25,2,3,'national','Craftsman National Construction Estimator','Caulk, paint, minor repairs. Craftsman NCE Div 7.'),
  ('exterior','medium_rehab','both','per_sqft',2.75,5,8,'national','Craftsman National Construction Estimator','Siding sections, soffit, fascia repair. Craftsman NCE Div 7.'),
  ('flooring','full_replace','both','per_sqft',7,10.5,15,'national','Craftsman National Construction Estimator','Hardwood, porcelain tile, subfloor repair included. Craftsman NCE Div 9.'),
  ('flooring','light_rehab','both','per_sqft',1.5,2.5,3.75,'national','Craftsman National Construction Estimator','Refinish hardwood, deep clean carpet, repair vinyl. Craftsman NCE Div 9.'),
  ('flooring','medium_rehab','both','per_sqft',3.5,5,7,'national','Craftsman National Construction Estimator','LVP/LVT install, new carpet, laminate. Craftsman NCE Div 9.'),
  ('foundation','full_replace','both','flat',15000,35000,75000,'national','Craftsman National Construction Estimator','Structural repair, pier and beam, underpinning. Craftsman NCE Div 3.'),
  ('foundation','light_rehab','both','flat',500,1500,3500,'national','Craftsman National Construction Estimator','Crack injection, seal, drainage. Craftsman NCE Div 3.'),
  ('foundation','medium_rehab','both','flat',3000,7000,15000,'national','Craftsman National Construction Estimator','Waterproofing, French drain, crawlspace encapsulation. Craftsman NCE Div 3.'),
  ('garage','full_replace','sfr','flat',3000,7000,18000,'national','Craftsman National Construction Estimator','Structural repair, full conversion or rebuild. Craftsman NCE Div 5.'),
  ('garage','light_rehab','sfr','flat',300,700,1200,'national','Craftsman National Construction Estimator','Clean, paint, minor repairs. Craftsman NCE Div 16.'),
  ('garage','medium_rehab','sfr','flat',900,1800,3200,'national','Craftsman National Construction Estimator','Door replace, opener, epoxy floor. Craftsman NCE Div 16.'),
  ('hvac','full_replace','both','per_unit',6000,9500,16000,'national','Craftsman National Construction Estimator','Full system replace — split system, ductwork repair. Craftsman NCE Div 15.'),
  ('hvac','light_rehab','both','per_unit',350,700,1200,'national','Craftsman National Construction Estimator','Service, tune-up, filter, minor repairs. Craftsman NCE Div 15.'),
  ('hvac','medium_rehab','both','per_unit',3000,5000,7500,'national','Craftsman National Construction Estimator','Replace condenser, air handler, or major component. Craftsman NCE Div 15.'),
  ('kitchen','full_replace','both','per_unit',14000,20000,30000,'national','Craftsman National Construction Estimator','Full gut — cabinets, countertops, appliances, flooring, plumbing rough. Craftsman NCE Div 11.'),
  ('kitchen','light_rehab','both','per_unit',2500,3500,4800,'national','Craftsman National Construction Estimator','Paint cabinets, hardware, caulk, minor repairs. Craftsman NCE Div 11.'),
  ('kitchen','medium_rehab','both','per_unit',7500,10500,14500,'national','Craftsman National Construction Estimator','New cabinets, countertops, sink, basic appliances. Craftsman NCE Div 11.'),
  ('landscaping','full_replace','both','flat',3500,8000,18000,'national','Craftsman National Construction Estimator','Full regrading, irrigation, landscaping design. Craftsman NCE Div 2.'),
  ('landscaping','light_rehab','both','flat',300,700,1500,'national','Craftsman National Construction Estimator','Clean, mulch, mow. Craftsman NCE Div 2.'),
  ('landscaping','medium_rehab','both','flat',1000,2500,5000,'national','Craftsman National Construction Estimator','Sod, beds, shrubs, irrigation repair. Craftsman NCE Div 2.'),
  ('laundry_room','full_replace','multifamily','flat',5000,10000,20000,'national','Craftsman National Construction Estimator','New machines, room build-out, plumbing/electrical. Craftsman NCE Div 11.'),
  ('laundry_room','light_rehab','multifamily','flat',200,500,900,'national','Craftsman National Construction Estimator','Machine service, dryer vent clean. Craftsman NCE Div 11.'),
  ('laundry_room','medium_rehab','multifamily','flat',1500,2800,5000,'national','Craftsman National Construction Estimator','Machine replace, paint, flooring. Craftsman NCE Div 11.'),
  ('other','full_replace','both','flat',5000,12000,25000,'national','Craftsman National Construction Estimator','Major unlisted scope — permits, engineering, contingency. Craftsman NCE.'),
  ('other','light_rehab','both','flat',500,1000,2500,'national','Craftsman National Construction Estimator','General cleanup, haul-out, touch-up items. Craftsman NCE.'),
  ('other','medium_rehab','both','flat',2000,4000,8000,'national','Craftsman National Construction Estimator','Miscellaneous scope items, permits, general conditions. Craftsman NCE.'),
  ('paint','full_replace','both','per_sqft',2,3,4.5,'national','Craftsman National Construction Estimator','Interior + exterior paint, primer, texture repair. Craftsman NCE Div 9.'),
  ('paint','light_rehab','both','per_sqft',0.6,0.9,1.25,'national','Craftsman National Construction Estimator','Touch up, patch, spot repaint. Craftsman NCE Div 9.'),
  ('paint','medium_rehab','both','per_sqft',1,1.5,2,'national','Craftsman National Construction Estimator','Full interior repaint — walls, ceilings, trim. Craftsman NCE Div 9.'),
  ('plumbing','full_replace','both','per_unit',8000,14000,22000,'national','Craftsman National Construction Estimator','Full rough-in — supply, drain, water heater, all fixtures. Craftsman NCE Div 15.'),
  ('plumbing','light_rehab','both','per_unit',450,900,1600,'national','Craftsman National Construction Estimator','Fixture repairs, drain cleaning, minor leaks. Craftsman NCE Div 15.'),
  ('plumbing','medium_rehab','both','per_unit',1800,3200,5500,'national','Craftsman National Construction Estimator','Fixture replace, water heater, supply lines. Craftsman NCE Div 15.'),
  ('roof','full_replace','both','per_sqft',5,8,14,'national','Craftsman National Construction Estimator','Full reroof — tear off and replace. Craftsman NCE Div 7.'),
  ('roof','light_rehab','both','per_sqft',0.5,1,2,'national','Craftsman National Construction Estimator','Patch, seal, flashing repair. Craftsman NCE Div 7.'),
  ('roof','medium_rehab','both','per_sqft',2.5,4.5,7,'national','Craftsman National Construction Estimator','Partial shingle replace, section reroof. Craftsman NCE Div 7.'),
  ('site_parking','full_replace','multifamily','flat',15000,35000,75000,'national','Craftsman National Construction Estimator','Full lot resurface, curbing, lighting. Craftsman NCE Div 2.'),
  ('site_parking','light_rehab','both','flat',500,1200,2500,'national','Craftsman National Construction Estimator','Restripe, minor patch, clean. Craftsman NCE Div 2.'),
  ('site_parking','medium_rehab','both','flat',3500,8000,16000,'national','Craftsman National Construction Estimator','Section repaving, drainage repair. Craftsman NCE Div 2.'),
  ('windows','full_replace','both','per_window',550,850,1400,'national','Craftsman National Construction Estimator','Full window replace — impact or double-pane vinyl. Craftsman NCE Div 8.'),
  ('windows','light_rehab','both','per_window',75,175,300,'national','Craftsman National Construction Estimator','Caulk, weather strip, hardware, repair. Craftsman NCE Div 8.'),
  ('windows','medium_rehab','both','per_window',350,550,750,'national','Craftsman National Construction Estimator','Partial replace — vinyl double pane. Craftsman NCE Div 8.')
) AS v(system, condition_level, property_type, cost_unit, cost_low, cost_mid, cost_high, region, source, notes)
WHERE NOT EXISTS (SELECT 1 FROM rehab_cost_benchmarks LIMIT 1);

-- SEED: Regional cost modifiers (7 regions)
INSERT INTO regional_cost_modifiers (region_code, region_name, labor_factor, material_factor, overall_factor, metro_areas, states)
SELECT * FROM (VALUES
  ('SOUTH_ATL','Atlanta Metro',0.88,0.92,0.90,ARRAY['Atlanta','Marietta','Sandy Springs'],ARRAY['GA']),
  ('SOUTH_CLT','Charlotte Metro',0.86,0.90,0.88,ARRAY['Charlotte','Concord','Gastonia'],ARRAY['NC','SC']),
  ('SOUTH_HOU','Houston Metro',0.86,0.90,0.88,ARRAY['Houston','Sugar Land','The Woodlands'],ARRAY['TX']),
  ('SOUTH_DAL','Dallas Metro',0.88,0.92,0.90,ARRAY['Dallas','Fort Worth','Irving'],ARRAY['TX']),
  ('MID_CHI','Chicago Metro',1.02,1.08,1.05,ARRAY['Chicago','Naperville','Joliet'],ARRAY['IL']),
  ('NE_NYC','New York Metro',1.25,1.35,1.30,ARRAY['New York','Newark','Jersey City'],ARRAY['NY','NJ']),
  ('NATIONAL','National Average',1.00,1.00,1.00,ARRAY[]::text[],ARRAY[]::text[])
) AS v(region_code, region_name, labor_factor, material_factor, overall_factor, metro_areas, states)
WHERE NOT EXISTS (SELECT 1 FROM regional_cost_modifiers LIMIT 1);
