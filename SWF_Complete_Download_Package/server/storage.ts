// Storage layer for SWF platform
import { db, pool } from './db';
import { 
  users, 
  registrations, 
  type User, 
  type InsertUser,
  type Registration,
  type InsertRegistration
} from '../shared/schema';
import { eq } from 'drizzle-orm';
import connectPgSimple from 'connect-pg-simple';
import session from 'express-session';

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Registration methods
  getRegistration(id: number): Promise<Registration | undefined>;
  getRegistrationByEmail(email: string): Promise<Registration | undefined>;
  createRegistration(registration: InsertRegistration): Promise<Registration>;
  getAllRegistrations(limit?: number): Promise<Registration[]>;
  updateRegistration(id: number, updates: Partial<InsertRegistration>): Promise<Registration | undefined>;
  
  // Session store
  sessionStore: ReturnType<typeof connectPgSimple>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // Create PostgreSQL session store
  sessionStore: ReturnType<typeof connectPgSimple>;
  
  constructor() {
    const PostgresSessionStore = connectPgSimple(session);
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }
  
  // Registration methods
  async getRegistration(id: number): Promise<Registration | undefined> {
    const [registration] = await db.select().from(registrations).where(eq(registrations.id, id));
    return registration;
  }
  
  async getRegistrationByEmail(email: string): Promise<Registration | undefined> {
    const [registration] = await db.select().from(registrations).where(eq(registrations.email, email));
    return registration;
  }
  
  async createRegistration(registration: InsertRegistration): Promise<Registration> {
    const [newRegistration] = await db.insert(registrations).values(registration).returning();
    return newRegistration;
  }
  
  async getAllRegistrations(limit = 100): Promise<Registration[]> {
    return db.select().from(registrations).limit(limit);
  }
  
  async updateRegistration(id: number, updates: Partial<InsertRegistration>): Promise<Registration | undefined> {
    const [updatedRegistration] = await db
      .update(registrations)
      .set(updates)
      .where(eq(registrations.id, id))
      .returning();
    return updatedRegistration;
  }
}

// Export a singleton instance of the storage class
export const storage = new DatabaseStorage();