-- Real Estate Module: Unique Constraints for Idempotent Ingest
-- Migration: 0005_re_ingest_constraints.sql
-- Date: 2026-02-20
-- Adds unique constraints required for ON CONFLICT deduplication
-- during ATTOM, Rentcast, and Geocoder ingest operations

ALTER TABLE re_sales
  ADD CONSTRAINT re_sales_property_date_unique
  UNIQUE (property_id, sale_date);
--> statement-breakpoint
ALTER TABLE re_taxes
  ADD CONSTRAINT re_taxes_property_year_unique
  UNIQUE (property_id, tax_year);
--> statement-breakpoint
ALTER TABLE re_property_facts
  ADD CONSTRAINT re_property_facts_type_source_unique
  UNIQUE (property_id, fact_type, source_id);
