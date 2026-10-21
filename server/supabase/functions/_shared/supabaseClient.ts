/**
 * TNV Hub Portal - Shared Supabase Client Factory
 * 
 * Rules from Backend & Database Specification:
 * - Service key exists ONLY in Edge Function secrets, never in the frontend or repository.
 * - Anonymous / Authenticated client respects RLS.
 * - Admin client uses SUPABASE_SERVICE_ROLE_KEY to perform privileged actions.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/**
 * Creates a Supabase client using the Service Role Key.
 * Bypasses RLS - used for privileged operations like register,
 * approve_applicant, create_donation, and checking internal records.
 */
export function getServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates an anon client that enforces RLS rules as a public/unauthenticated user.
 */
export function getAnonClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing environment variables: SUPABASE_URL or SUPABASE_ANON_KEY');
  }

  return createClient(supabaseUrl, anonKey);
}

/**
 * Creates a Supabase client configured with the caller's JWT token
 * to enforce user-specific RLS.
 */
export function getUserClient(authHeader: string): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing environment variables: SUPABASE_URL or SUPABASE_ANON_KEY');
  }

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}
