import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  decimal,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

export const docTypeEnum = pgEnum('doc_extraction_type', [
  'rent_roll',
  'offering_memorandum',
  'property_report',
  'appraisal',
  'inspection_report',
  'insurance_declaration',
  'tax_return',
  'bank_statement',
  'operating_statement',
  'lease_abstract',
  'title_report',
  'environmental_report',
  'other'
]);

export const docStatusEnum = pgEnum('doc_extraction_status', [
  'uploaded',
  'processing',
  'extracted',
  'verified',
  'failed'
]);

export const docExtractions = pgTable("doc_extractions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id"),
  propertyId: varchar("property_id"),
  walletAddress: varchar("wallet_address", { length: 42 }),
  docType: docTypeEnum("doc_type").notNull(),
  status: docStatusEnum("status").notNull().default('uploaded'),
  originalFilename: varchar("original_filename", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSizeBytes: integer("file_size_bytes"),
  extractedData: jsonb("extracted_data"),
  rawText: text("raw_text"),
  confidence: decimal("confidence", { precision: 5, scale: 4 }),
  fieldCount: integer("field_count"),
  appliedToDeal: boolean("applied_to_deal").default(false),
  errorMessage: text("error_message"),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  dealIdx: index("doc_extractions_deal_idx").on(table.dealId),
  propertyIdx: index("doc_extractions_property_idx").on(table.propertyId),
  walletIdx: index("doc_extractions_wallet_idx").on(table.walletAddress),
  typeIdx: index("doc_extractions_type_idx").on(table.docType),
  statusIdx: index("doc_extractions_status_idx").on(table.status),
  createdIdx: index("doc_extractions_created_idx").on(table.createdAt),
}));

export type DocExtraction = typeof docExtractions.$inferSelect;
export type InsertDocExtraction = typeof docExtractions.$inferInsert;

export const docExtractionFields = pgTable("doc_extraction_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  extractionId: varchar("extraction_id").notNull(),
  fieldName: varchar("field_name", { length: 200 }).notNull(),
  fieldValue: text("field_value"),
  fieldType: varchar("field_type", { length: 50 }).notNull().default('string'),
  confidence: decimal("confidence", { precision: 5, scale: 4 }),
  sourceLocation: varchar("source_location", { length: 200 }),
  mappedTo: varchar("mapped_to", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  extractionIdx: index("doc_fields_extraction_idx").on(table.extractionId),
  fieldNameIdx: index("doc_fields_name_idx").on(table.fieldName),
}));

export type DocExtractionField = typeof docExtractionFields.$inferSelect;
