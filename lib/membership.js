// Membership dates shared by the ID card, the appointment letter, the membership
// receipt and the QR verification page, so they always agree with each other and
// with today's date (India time).
//
// A membership is paid for one year from the member's latest verified payment
// (joining or renewal). When a renewal is paid, the card and the verification page
// move to the new year; when it is not, they show the year that has ended.
// Members with no payment on record fall back to the year that contains today,
// counted from the anniversary of the day they joined.

const TZ = 'Asia/Kolkata';

// Calendar date in India as { y, m, d } (m is 1-12)
function istParts(date) {
  const [y, m, d] = new Date(date).toLocaleDateString('en-CA', { timeZone: TZ }).split('-').map(Number);
  return { y, m, d };
}

// 29 Feb joins fall on 28 Feb in other years
function anniversary(joined, year) {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const day = joined.m === 2 && joined.d === 29 && !leap ? 28 : joined.d;
  return { y: year, m: joined.m, d: day };
}

const before = (a, b) => a.y !== b.y ? a.y < b.y : a.m !== b.m ? a.m < b.m : a.d < b.d;
const pad = n => String(n).padStart(2, '0');

/** "14-11-2026" */
const formatDmy = p => `${pad(p.d)}-${pad(p.m)}-${p.y}`;

/** "14-11-2026" for any date value, in India time; today when the value is missing or invalid */
function dmy(value) {
  const date = value ? new Date(value) : new Date();
  return formatDmy(istParts(isNaN(date.getTime()) ? new Date() : date));
}

/**
 * The member's joining date and current membership year.
 * @param {object} user profile (approved_at, created_at)
 * @param {Date} now
 * @param {{ paidAt?: string }} opts the latest verified membership payment, if any
 * @returns {{ joined, start, end, joinedText, startText, endText, yearLabel, paid, expired, iso: { joined, start, end } }}
 *   paid: a payment is on record; expired: the paid year has ended (today is on or after `end`)
 */
function membershipPeriod(user = {}, now = new Date(), opts = {}) {
  const raw = user.approved_at || user.membership_paid_at || user.created_at;
  const joinedDate = raw && !isNaN(new Date(raw).getTime()) ? new Date(raw) : new Date(now);
  const joined = istParts(joinedDate);
  const today = istParts(now);

  const paidDate = opts.paidAt && !isNaN(new Date(opts.paidAt).getTime()) ? new Date(opts.paidAt) : null;
  let start;
  let end;
  if (paidDate) {
    start = istParts(paidDate);
    end = anniversary(start, start.y + 1);
  } else {
    start = anniversary(joined, today.y);
    if (before(today, start)) start = anniversary(joined, today.y - 1);
    if (before(start, joined)) start = joined; // not a full year yet
    end = anniversary(joined, start.y + 1);
  }

  const iso = p => `${p.y}-${pad(p.m)}-${pad(p.d)}`;
  return {
    joined,
    start,
    end,
    joinedText: formatDmy(joined),
    startText: formatDmy(start),
    endText: formatDmy(end),
    yearLabel: `${start.y} - ${end.y}`,
    paid: Boolean(paidDate),
    expired: Boolean(paidDate) && !before(today, end),
    iso: { joined: iso(joined), start: iso(start), end: iso(end) }
  };
}

/** "2026-27" label for the membership year that starts with a payment (or today) */
function paymentYearLabel(value) {
  const { y } = istParts(value && !isNaN(new Date(value).getTime()) ? new Date(value) : new Date());
  return { short: `${y}-${String(y + 1).slice(2)}`, long: `${y} - ${y + 1}` };
}

module.exports = { membershipPeriod, paymentYearLabel, dmy };
