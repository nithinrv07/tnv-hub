// States and union territories of India (other than Tamil Nadu) and countries,
// for volunteers who live outside Tamil Nadu.

export const INDIAN_STATES = [
  'Tamil Nadu',
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
  'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry',
  'Punjab', 'Rajasthan', 'Sikkim', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

// Countries with India first, then largest Tamil and Indian communities, then the rest A–Z
const FIRST = ['United Arab Emirates', 'Singapore', 'Malaysia', 'Sri Lanka', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman', 'Bahrain'];
const REST = [
  'Afghanistan', 'Argentina', 'Austria', 'Bangladesh', 'Belgium', 'Bhutan', 'Brazil', 'Brunei', 'Cambodia', 'Chile', 'China',
  'Czech Republic', 'Denmark', 'Egypt', 'Fiji', 'Finland', 'France', 'Germany', 'Ghana', 'Greece', 'Guyana', 'Hong Kong',
  'Hungary', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan', 'Jordan', 'Kenya', 'Lebanon', 'Maldives',
  'Mauritius', 'Mexico', 'Myanmar', 'Nepal', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 'Philippines',
  'Poland', 'Portugal', 'Réunion', 'Romania', 'Russia', 'Seychelles', 'South Africa', 'South Korea', 'Spain', 'Suriname',
  'Sweden', 'Switzerland', 'Taiwan', 'Tanzania', 'Thailand', 'Trinidad and Tobago', 'Turkey', 'Uganda', 'Ukraine', 'Vietnam',
  'Zambia', 'Zimbabwe'
];
export const COUNTRIES = ['India', ...FIRST, ...REST, 'Other'];

// Nationality: Indian citizens living abroad (NRIs) and foreign nationals
export const NATIONALITIES = ['Indian', ...FIRST.filter(c => c !== 'Sri Lanka'), 'Sri Lankan', ...REST, 'Other'];

export const RESIDENCY = [
  { id: 'tamil_nadu', label: 'Tamil Nadu', hint: 'Aadhaar and a Tamil Nadu address' },
  { id: 'india', label: 'Another state in India', hint: 'Aadhaar and your state address' },
  { id: 'abroad', label: 'Outside India', hint: 'Passport and an international phone number' }
];
