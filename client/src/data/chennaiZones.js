// Greater Chennai Corporation: 15 zones and the wards (1 to 200) in each.
// Shown on the registration forms when the district is Chennai.
// Keep in sync with server/data/chennaiZones.js.
export const CHENNAI_DISTRICT_ID = 3;

export const CHENNAI_ZONES = [
  { no: 1, name: 'Thiruvottiyur', from: 1, to: 14 },
  { no: 2, name: 'Manali', from: 15, to: 21 },
  { no: 3, name: 'Madhavaram', from: 22, to: 33 },
  { no: 4, name: 'Tondiarpet', from: 34, to: 48 },
  { no: 5, name: 'Royapuram', from: 49, to: 63 },
  { no: 6, name: 'Thiru. Vi. Ka. Nagar', from: 64, to: 78 },
  { no: 7, name: 'Ambattur', from: 79, to: 93 },
  { no: 8, name: 'Anna Nagar', from: 94, to: 108 },
  { no: 9, name: 'Teynampet', from: 109, to: 126 },
  { no: 10, name: 'Kodambakkam', from: 127, to: 142 },
  { no: 11, name: 'Valasaravakkam', from: 143, to: 155 },
  { no: 12, name: 'Alandur', from: 156, to: 167 },
  { no: 13, name: 'Adyar', from: 168, to: 182 },
  { no: 14, name: 'Perungudi', from: 183, to: 191 },
  { no: 15, name: 'Sholinganallur', from: 192, to: 200 }
];

export const zoneLabel = z => `Zone ${z.no} – ${z.name}`;

export function wardsForZone(zoneNo) {
  const zone = CHENNAI_ZONES.find(z => z.no === Number(zoneNo));
  if (!zone) return [];
  return Array.from({ length: zone.to - zone.from + 1 }, (_, i) => zone.from + i);
}

export const isChennai = district => {
  if (district === undefined || district === null || district === '') return false;
  if (String(district) === String(CHENNAI_DISTRICT_ID)) return true;
  return String(district).trim().toLowerCase() === 'chennai';
};
