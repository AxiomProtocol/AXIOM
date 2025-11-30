// Database schema for SWF platform
import { sql } from 'drizzle-orm';
import { pgTable, serial, text, boolean, timestamp } from 'drizzle-orm/pg-core';

// Users table for admin authentication
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  address: text('address').notNull(),
  username: text('username'),
  password: text('password').notNull(),
  email: text('email'),
  role: text('role'),
  isAdmin: boolean('is_admin').default(false),
  createdAt: timestamp('created_at').defaultNow()
});

// Registration records from landing page form submissions
export const registrations = pgTable('registrations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phoneNumber: text('phone_number'),
  city: text('city'),
  state: text('state'),
  walletAddress: text('wallet_address'),
  investmentInterest: text('investment_interest'),
  country: text('country'),
  hearAboutUs: text('hear_about_us'),
  additionalInfo: text('additional_info'),
  agreeToTerms: boolean('agree_to_terms').default(false),
  subscribeToNewsletter: boolean('subscribe_to_newsletter').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  status: text('status').default('pending')
});

// User type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Registration type definitions
export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = typeof registrations.$inferInsert;