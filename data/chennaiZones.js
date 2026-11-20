// Greater Chennai Corporation: 15 zones and the wards (1 to 200) in each.
// Keep in sync with client/src/data/chennaiZones.js.
const CHENNAI_DISTRICT_ID = 3;

const CHENNAI_ZONES = [
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

// Returns an error message, or null when the zone/ward pair is valid
function validateZoneWard(zone, ward) {
  const z = CHENNAI_ZONES.find(x => x.no === Number(zone));
  if (!z) return { field: 'zone', error: 'Choose your Chennai Corporation zone.' };
  const w = Number(ward);
  if (!Number.isInteger(w) || w < z.from || w > z.to) {
    return { field: 'ward', error: `Choose a ward in Zone ${z.no} (${z.from} to ${z.to}).` };
  }
  return null;
}

module.exports = { CHENNAI_DISTRICT_ID, CHENNAI_ZONES, validateZoneWard };
