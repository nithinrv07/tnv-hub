const PLACEHOLDERS = {
  coordinatorName: 'Coordinator',
  coordinatorContact: '1234567890',
  activities: 'Details to be updated',
  description: 'Information coming soon'
};

const EMPTY_FIELDS = {
  name: 'District information coming soon',
  zone: 'Zone information coming soon',
  ...PLACEHOLDERS
};

const RAW_DISTRICTS = [
  { name: 'Chennai', zone: 'Chennai', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Chengalpattu', zone: 'Chennai', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Tiruvallur', zone: 'Chennai', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Kanchipuram', zone: 'Chennai', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Vellore', zone: 'Vellore', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Tirupathur', zone: 'Vellore', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Ranipet', zone: 'Vellore', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Tiruvannamalai', zone: 'Vellore', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Villupuram', zone: 'Villupuram', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Kallakurichi', zone: 'Villupuram', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Cuddalore', zone: 'Villupuram', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Dharmapuri', zone: 'Dharmapuri', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Salem', zone: 'Dharmapuri', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Krishnagiri', zone: 'Dharmapuri', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Namakkal', zone: 'Dharmapuri', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Coimbatore', zone: 'Coimbatore', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Tiruppur', zone: 'Coimbatore', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Erode', zone: 'Coimbatore', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Nilgiris', zone: 'Coimbatore', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Tiruchirappalli', zone: 'Trichy', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Perambalur', zone: 'Trichy', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Karur', zone: 'Trichy', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Pudukkottai', zone: 'Trichy', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Thanjavur', zone: 'Thanjavur', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Tiruvarur', zone: 'Thanjavur', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Nagapattinam', zone: 'Thanjavur', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Mayiladuthurai', zone: 'Thanjavur', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Ariyalur', zone: 'Thanjavur', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Madurai', zone: 'Madurai', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Dindigul', zone: 'Madurai', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Theni', zone: 'Madurai', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Sivaganga', zone: 'Madurai', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Virudhunagar', zone: 'Madurai', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Ramanathapuram', zone: 'Madurai', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Tirunelveli', zone: 'Tirunelveli', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Thoothukudi', zone: 'Tirunelveli', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Kanniyakumari', zone: 'Tirunelveli', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description },
  { name: 'Tenkasi', zone: 'Tirunelveli', coordinatorName: PLACEHOLDERS.coordinatorName, coordinatorContact: PLACEHOLDERS.coordinatorContact, activities: PLACEHOLDERS.activities, description: PLACEHOLDERS.description }
];

const withDefaults = district => Object.fromEntries(
  Object.entries(EMPTY_FIELDS).map(([field, fallback]) => [
    field,
    typeof district[field] === 'string' && district[field].trim()
      ? district[field].trim()
      : fallback
  ])
);

export const DISTRICT_PLACEHOLDERS = PLACEHOLDERS;
export const DISTRICTS = RAW_DISTRICTS.map(withDefaults);

const zones = new Map();
DISTRICTS.forEach(district => {
  if (!zones.has(district.zone)) zones.set(district.zone, []);
  zones.get(district.zone).push(district.name);
});

export const ZONES = Array.from(zones, ([name, districts]) => ({ name, districts }));

export function districtSlug(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getDistrictBySlug(slug) {
  const normalizedSlug = String(slug || '').toLowerCase();
  return DISTRICTS.find(district => districtSlug(district.name) === normalizedSlug) || null;
}

export function getDistrictPlaceholderFields(district) {
  return Object.entries(EMPTY_FIELDS)
    .filter(([field, placeholder]) => district[field] === placeholder)
    .map(([field]) => field);
}
