/**
 * TNV Event Management - Centralized Categories, Departments, and Districts
 * Single source of truth across Events.jsx, EventManager.jsx, and Dashboard.jsx
 */

export const TN_DISTRICTS = [
  'All Districts',
  'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri',
  'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur',
  'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris',
  'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga',
  'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli',
  'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore',
  'Viluppuram', 'Virudhunagar'
];

export const EVENT_CATEGORIES = [
  'All Categories',
  'Palm seed plantation',
  'Climate and environment',
  'Tree plantation drive',
  'Disaster management',
  'Education',
  'Drug-free Tamil Nadu',
  'Social responsibility',
  'Empowering volunteers',
  'Youth empowerment',
  'Health and rescue',
  'Clean-up & Sanitation'
];

export const EVENT_DEPARTMENTS = [
  'All Departments',
  'Administration & Human Resources Department',
  'Finance & Compliance Department',
  'Partnerships, CSR & NGO Relations Department',
  'Technology & Digital Systems Department',
  'Communication & Media Department',
  'Field Operations Department',
  'Online Volunteer Operations Department',
  'Social Responsibility, Awareness & Advocacy Department',
  'Health & Wellness Department',
  'Education & Skill Development Department',
  'Community Development Department',
  'Emergency Crisis & Disaster Management Department',
  'Environment, Sustainability & Ecological Restoration Department'
];

export const WINGS = [
  'All Wings',
  'Youth Wing',
  'Women Wing',
  'Students Wing',
  'Social Action Wing',
  'Operations Wing'
];

/**
 * Case-insensitive matcher for category filter
 */
export function matchesCategory(itemCategory, filterCategory) {
  if (!filterCategory || filterCategory.toLowerCase() === 'all' || filterCategory.toLowerCase() === 'all categories') {
    return true;
  }
  const target = (itemCategory || '').toLowerCase().trim();
  const filter = filterCategory.toLowerCase().trim();
  return target === filter || target.includes(filter) || filter.includes(target);
}

/**
 * Case-insensitive matcher for department filter
 */
export function matchesDepartment(itemDepartment, filterDepartment) {
  if (!filterDepartment || filterDepartment.toLowerCase() === 'all' || filterDepartment.toLowerCase() === 'all departments') {
    return true;
  }
  const target = (itemDepartment || '').toLowerCase().trim();
  const filter = filterDepartment.toLowerCase().trim();
  return target === filter || target.includes(filter) || filter.includes(target);
}
