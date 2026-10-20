/**
 * TNV Hub Portal - Districts Service & Validator
 * Part A, Step 1: Loading districts from the districts table (readable by everyone)
 * Part A, Step 3: Validating district existence during applicant registration
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { District } from './types.ts';

/**
 * Fetches all 38 districts ordered alphabetically by name.
 * RLS allows public/everyone select access on this table.
 */
export async function getDistricts(supabase: SupabaseClient): Promise<{ data: District[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('districts')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    return { data: null, error: new Error(`Failed to fetch districts: ${error.message}`) };
  }

  return { data: data as District[], error: null };
}

/**
 * Validates whether a district ID exists in the database.
 * Used during Step 3 registration validation:
 * "Phone matches 10 digits starting 6 to 9. Aadhaar is exactly 12 digits. District exists.
 *  Reject with a clear message on the first failure; create nothing."
 */
export async function validateDistrictExists(supabase: SupabaseClient, districtId: number): Promise<boolean> {
  if (!districtId || !Number.isInteger(districtId) || districtId <= 0) {
    return false;
  }

  const { data, error } = await supabase
    .from('districts')
    .select('id')
    .eq('id', districtId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return true;
}

/**
 * Get district details by ID.
 */
export async function getDistrictById(supabase: SupabaseClient, districtId: number): Promise<District | null> {
  const { data, error } = await supabase
    .from('districts')
    .select('id, name')
    .eq('id', districtId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as District;
}
