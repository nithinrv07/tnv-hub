/**
 * TNV Hub Portal - Shared Backend Types
 * Based on TNV_Hub_Backend_Database_Spec (1).pdf & Form Images
 */

export interface District {
  id: number;
  name: string;
}

export type AppStatus = 'pending' | 'approved';

export type AppRole = 
  | 'volunteer' 
  | 'district_coordinator' 
  | 'wing_lead' 
  | 'dept_admin' 
  | 'master_admin';

export type CallOutcome = 'no_answer' | 'scheduled' | 'attended';

export type PayStatus = 'paid' | 'failed';

export interface Profile {
  id: string; // uuid references auth.users(id)
  username: string; // 4 to 20 chars
  full_name: string;
  email: string;
  phone: string; // 10 digits starting 6 to 9
  address?: string | null;
  district_id: number;
  aadhaar_enc: string; // encrypted, never returned to browser
  aadhaar_last4: string; // for masked display (e.g. XXXX XXXX 1234)
  status: AppStatus; // default 'pending'
  role?: AppRole | null; // null until verified
  wing_id?: number | null;
  tnv_id?: string | null; // generated on approval
  photo_path?: string | null;
  membership_paid: boolean; // default false
  created_at: string;
  // Supplementary fields from registration form
  dob?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  father_or_husband_name?: string | null;
  category?: string | null;
  affiliation?: string | null;
  organization_name?: string | null;
  work_study_status?: string | null;
  employer_name?: string | null;
  blood_group?: string | null;
  occupation?: string | null;
  assembly_constituency?: string | null;
  panchayat?: string | null;
  wing_to_join?: string | null;
  department?: string | null;
  mode_of_work?: string | null;
  previous_experience?: string | null;
  past_field_work?: string[] | null;
  pincode?: string | null;
  preferred_designation?: string | null;
}

export interface ProfilePublic {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  dob?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  father_or_husband_name?: string | null;
  category?: string | null;
  affiliation?: string | null;
  organization_name?: string | null;
  work_study_status?: string | null;
  employer_name?: string | null;
  blood_group?: string | null;
  occupation?: string | null;
  address?: string | null;
  pincode?: string | null;
  district_id: number;
  district_name?: string;
  assembly_constituency?: string | null;
  panchayat?: string | null;
  wing_to_join?: string | null;
  department?: string | null;
  mode_of_work?: string | null;
  previous_experience?: string | null;
  past_field_work?: string[] | null;
  aadhaar_last4: string;
  preferred_designation?: string | null;
  status: AppStatus;
  role?: AppRole | null;
  wing_id?: number | null;
  wing_name?: string | null;
  tnv_id?: string | null;
  photo_path?: string | null;
  membership_paid: boolean;
  created_at: string;
}

/**
 * Registration form submission payload
 */
export interface RegisterInput {
  username: string;
  full_name: string;
  email: string;
  phone: string;
  password: string;
  confirm_password?: string;
  aadhaar: string; // Exactly 12 digits
  district_id: number;
  address: string;
  pincode?: string;
  dob?: string;
  gender?: string;
  marital_status?: string;
  father_or_husband_name?: string;
  category?: string;
  affiliation?: string;
  organization_name?: string;
  work_study_status?: string;
  employer_name?: string;
  blood_group?: string;
  occupation?: string;
  assembly_constituency?: string;
  panchayat?: string;
  wing_to_join?: string;
  department?: string;
  mode_of_work?: string;
  previous_experience?: string;
  past_field_work?: string[];
  preferred_designation?: string;
  photo_path?: string;
  agree_terms?: boolean;
}

export interface Notification {
  id: string;
  kind: string;
  profile_id: string;
  read: boolean;
  created_at: string;
}

export interface ApiErrorResponse {
  error: string;
  field?: string;
  details?: unknown;
}

export interface RegisterSuccessResponse {
  message: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  } | null;
  profile: ProfilePublic;
}
