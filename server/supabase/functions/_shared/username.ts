/**
 * TNV Hub Portal - Username Availability & Validation Service
 * Part A, Step 2: "Choose a username"
 * Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Section 7 RPC contracts)
 * Contract:
 * - Function: username_available(u)
 * - Caller: Anonymous / Anyone
 * - Returns: boolean (true if free, false if taken or invalid)
 * - Validation: 4 to 20 letters, digits or underscore: ^[A-Za-z0-9_]{4,20}$
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export const USERNAME_REGEX = /^[A-Za-z0-9_]{4,20}$/;

/**
 * Validates whether a username matches the strict specification format:
 * - 4 to 20 characters
 * - Letters, digits, or underscore only
 */
export function isValidUsernameFormat(username: string | null | undefined): boolean {
  if (!username || typeof username !== 'string') {
    return false;
  }
  return USERNAME_REGEX.test(username);
}

/**
 * Calls the `username_available` RPC function in Postgres.
 * Checks format first, returns only a boolean.
 * 
 * @param supabase Supabase client (anon or user client)
 * @param u The username to check
 * @returns Promise<boolean> - true if available, false if taken or invalid format
 */
export async function checkUsernameAvailable(
  supabase: SupabaseClient,
  u: string
): Promise<boolean> {
  // Pre-validate format on the client/service side
  if (!isValidUsernameFormat(u)) {
    return false;
  }

  const { data, error } = await supabase.rpc('username_available', { u });

  if (error) {
    console.error('Error checking username_available:', error.message);
    return false;
  }

  return Boolean(data);
}
