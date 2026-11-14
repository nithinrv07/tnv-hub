// The four birthday card designs. Each member gets one picked at random for the
// year: the same design shows on their dashboard and in their birthday email.
// Keep ids and wording in sync with server/mail/birthdayCards.js.

export const BIRTHDAY_CARDS = [
  {
    id: 'confetti',
    name: 'Confetti',
    emoji: '🎉',
    title: 'Happy Birthday, {first}!',
    subtitle: 'இனிய பிறந்தநாள் வாழ்த்துகள்',
    message: 'Everyone at Tamil Nadu Volunteers, {district} is celebrating you today. Thank you for the time and heart you give to our community. Have a wonderful year ahead!'
  },
  {
    id: 'sunrise',
    name: 'Sunrise',
    emoji: '🌅',
    title: 'A bright new year begins, {first}',
    subtitle: 'Happy Birthday from the TNV family',
    message: 'May this year bring you good health, new friendships and many more days of making a difference. With warm wishes from your {district} district team.'
  },
  {
    id: 'palm',
    name: 'Green Palm',
    emoji: '🌴',
    title: 'Many happy returns, {first}',
    subtitle: 'Growing together, one year at a time',
    message: 'Like the palms we plant across Tamil Nadu, may your year be strong and full of growth. Thank you for standing with Tamil Nadu Volunteers in {district}.'
  },
  {
    id: 'kolam',
    name: 'Kolam',
    emoji: '🪔',
    title: 'இனிய பிறந்தநாள் வாழ்த்துகள், {first}!',
    subtitle: 'Happy Birthday',
    message: 'On your special day, the volunteers of {district} send you love and blessings. May your home be filled with light and your year with joy.'
  }
];

// Same member, same year -> same design; a new design each year (matches the server)
export function pickBirthdayCard(profileId, year) {
  const key = `${profileId}:${year}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return BIRTHDAY_CARDS[h % BIRTHDAY_CARDS.length];
}

export function fillCard(card, member) {
  const first = String(member.full_name || member.username || 'friend').trim().split(/\s+/)[0];
  const district = member.district_name || 'Tamil Nadu';
  const fill = s => s.replaceAll('{first}', first).replaceAll('{district}', district);
  return { ...card, title: fill(card.title), subtitle: fill(card.subtitle), message: fill(card.message) };
}
