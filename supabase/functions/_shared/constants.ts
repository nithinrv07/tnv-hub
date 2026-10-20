/**
 * TNV Hub Portal - Registration Form Constants
 * 
 * Rules:
 * - English only (No Hindi translations)
 * - Clean designations (No fee / money mentions)
 */

export const CATEGORIES = [
  'General',
  'OBC',
  'SC',
  'ST',
  'Minority',
] as const;

export type Category = typeof CATEGORIES[number];

export const BLOOD_GROUPS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const;

export type BloodGroup = typeof BLOOD_GROUPS[number];

export const GENDERS = [
  'Male',
  'Female',
  'Other',
] as const;

export type Gender = typeof GENDERS[number];

export const MARITAL_STATUSES = [
  'Single',
  'Married',
  'Divorced',
  'Widowed',
] as const;

export type MaritalStatus = typeof MARITAL_STATUSES[number];

export const OCCUPATIONS = [
  'Student',
  'Government Employee',
  'Private Employee',
  'Business Owner / Entrepreneur',
  'Farmer',
  'Homemaker',
  'Daily Wage Worker',
  'Self-Employed',
  'Unemployed',
  'Retired',
  'Teacher / Professor',
  'Doctor / Healthcare Worker',
  'Engineer / IT Professional',
  'Social Worker / NGO Worker',
  'Police / Armed Forces',
  'Artist / Creative Professional',
  'Driver / Transport Worker',
  'Labourer',
  'Other',
] as const;

export type Occupation = typeof OCCUPATIONS[number];

export const DESIGNATIONS = [
  'Active Member',
  'General Member',
  'Event Coordinator',
  'Social Worker',
  'District Coordinator',
  'Block Coordinator',
  'District President',
  'Branch Manager',
  'HR Manager',
  'Member',
  'Volunteer',
] as const;

export type Designation = typeof DESIGNATIONS[number];
