// Landing page content. Programs follow the departments used in registration.
export const PROGRAMS = [
  {
    name: 'Social responsibility',
    text: 'Women and child safety, elder care and support for families who need a hand.'
  },
  {
    name: 'Health and wellness',
    text: 'Blood donation drives, health camps and awareness in towns and villages.'
  },
  {
    name: 'Education and skill development',
    text: 'Tutoring, career guidance and digital skills for students and young adults.'
  },
  {
    name: 'Community development',
    text: 'Local projects planned with panchayats, residents and partner organisations.'
  },
  {
    name: 'Emergency response',
    text: 'Trained volunteers ready for floods, cyclones and other crises across the state.'
  },
  {
    name: 'Environment and sustainability',
    text: 'Tree planting, water body clean-ups and waste reduction in every district.'
  }
];

// The joining flow, in order (registration → payment → phone verification → approval)
export const JOIN_STEPS = [
  {
    title: 'Register',
    text: 'Fill in one form from your phone with your name, district, phone number and Aadhaar.'
  },
  {
    title: 'Pay ₹365 or skip',
    text: 'Annual membership is ₹1 a day. You can pay now or later; your application continues either way.'
  },
  {
    title: 'Take the verification call',
    text: 'Our administration team calls you to confirm your details and talk about how you want to help.'
  },
  {
    title: 'Get your ID and groups',
    text: 'Once approved, download your TNV ID card and appointment letter and join your district WhatsApp group.'
  }
];

// TODO: replace with the official TNV links when they are supplied.
// An empty url renders the item as "coming soon" instead of a dead link.
export const SOCIAL_LINKS = [
  { name: 'WhatsApp announcements channel', url: '' },
  { name: 'Instagram', url: '' },
  { name: 'Facebook', url: '' },
  { name: 'YouTube', url: '' }
];
