import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) {
    return _supabaseAdmin;
  }
  
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required but not set');
  }
  
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required but not set');
  }
  
  _supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  
  return _supabaseAdmin;
}

export const supabaseAdmin = {
  get auth() {
    return getSupabaseAdmin().auth;
  },
};

export async function createAuthUser(email: string, password: string, metadata?: Record<string, unknown>) {
  const client = getSupabaseAdmin();
  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  
  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }
  
  return data.user;
}

export async function disableAuthUser(userId: string) {
  const client = getSupabaseAdmin();
  const { data, error } = await client.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
    user_metadata: { disabled: true, disabled_at: new Date().toISOString() },
  });
  
  if (error) {
    throw new Error(`Failed to disable user: ${error.message}`);
  }
  
  return data.user;
}

export async function enableAuthUser(userId: string) {
  const client = getSupabaseAdmin();
  const { data, error } = await client.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
    user_metadata: { disabled: false },
  });
  
  if (error) {
    throw new Error(`Failed to enable user: ${error.message}`);
  }
  
  return data.user;
}

export async function deleteAuthUser(userId: string) {
  const client = getSupabaseAdmin();
  const { error } = await client.auth.admin.deleteUser(userId);
  
  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
  
  return true;
}

export async function getAuthUser(userId: string) {
  const client = getSupabaseAdmin();
  const { data, error } = await client.auth.admin.getUserById(userId);
  
  if (error) {
    throw new Error(`Failed to get user: ${error.message}`);
  }
  
  return data.user;
}

export async function listAuthUsers(options?: { page?: number; perPage?: number }) {
  const client = getSupabaseAdmin();
  const { data, error } = await client.auth.admin.listUsers({
    page: options?.page ?? 1,
    perPage: options?.perPage ?? 50,
  });
  
  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }
  
  return data;
}
