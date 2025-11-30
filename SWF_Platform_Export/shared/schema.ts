import { pgTable, serial, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Tribe images table for persistent storage
export const tribeImages = pgTable('tribe_images', {
  id: serial('id').primaryKey(),
  tribeId: text('tribe_id').notNull(),
  imageType: text('image_type').notNull(), // 'card', 'header', 'facebook'
  imageData: text('image_data').notNull(), // base64 data
  mimeType: text('mime_type').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  isActive: boolean('is_active').default(true)
});

// Tribe data table
export const tribes = pgTable('tribes', {
  id: serial('id').primaryKey(),
  tribeId: text('tribe_id').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  location: text('location'),
  memberCount: integer('member_count').default(0),
  totalInvestment: integer('total_investment').default(0),
  currentAPY: text('current_apy'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Relations
export const tribeImagesRelations = relations(tribeImages, ({ one }) => ({
  tribe: one(tribes, {
    fields: [tribeImages.tribeId],
    references: [tribes.tribeId]
  })
}));

export const tribesRelations = relations(tribes, ({ many }) => ({
  images: many(tribeImages)
}));

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type TribeImage = typeof tribeImages.$inferSelect;
export type InsertTribeImage = typeof tribeImages.$inferInsert;
export type Tribe = typeof tribes.$inferSelect;
export type InsertTribe = typeof tribes.$inferInsert;