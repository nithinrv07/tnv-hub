// Landing page content, taken from the official site https://tamilnaduvolunteers.org/
// (About Us, Mission & Vision, Our Services, Our Management Body, Contact).
// Update it here when the official content changes.

const OFFICIAL = 'https://tamilnaduvolunteers.org';

export const ORG = {
  name: 'Tamil Nadu Volunteers',
  nameTa: 'தமிழ்நாடு தன்னார்வலர்கள்',
  motto: 'இயன்றதை இணைந்து செய்வோம்!',
  tagline: "Let's together empower society",
  intro:
    'Join us in our mission to create a better tomorrow through volunteer-driven initiatives. Together, we bridge the gap between communities and opportunities, ensuring every effort contributes to a brighter, inclusive, and sustainable future.',
  about:
    'Tamil Nadu Volunteers is a government-recognised, registered social welfare organisation working to create a compassionate, sustainable and inclusive Tamil Nadu. As one of Tamil Nadu’s fastest-growing volunteer networks, we bring together 10,000+ volunteers, NGOs, youth groups and corporate teams to support disaster management, environmental protection, education, tribal upliftment and social welfare activities.',
  aboutLead: 'Our mission is simple: empower people to create meaningful change.',
  mission:
    'To unite passionate individuals and organisations in Tamil Nadu to drive meaningful social change. By harnessing the power of volunteering, we aim to empower underserved communities, ensure sustainable development and provide immediate support during crises. Through education, environmental conservation and disaster management, we are dedicated to creating a more inclusive and resilient society for all.',
  vision:
    'A self-sustaining, socially responsible Tamil Nadu where every individual has access to opportunities for growth, equality and well-being. We aspire to be the bridge between the government, volunteers and the community, fostering a collaborative environment for positive transformation.'
};

// Registrations and recognition shown with the About section
export const CREDENTIALS = [
  { label: '80G tax exemption', detail: 'Donations are eligible for tax benefit' },
  { label: 'CSR approved', detail: 'Ministry of Corporate Affairs, Govt. of India · CSR00064088' },
  { label: 'Palam Kalyanasundaram Award', detail: 'Presented by Padma Shri Palam Kalyanasundaram' }
];

export const MANAGEMENT = [
  { name: 'Mr. Hari Krishnan N', role: 'Chairman & Chief Coordinator' },
  { name: 'Mr. Ramakrishnan C', role: 'Secretary & Coordinator' }
];

// "Our Impact" counters on the official home page
export const IMPACT = [
  { value: 10000, label: 'Volunteers in the team' },
  { value: 50000, label: 'People reached in disaster relief' },
  { value: 100000, label: 'Trees planted' },
  { value: 5000, label: 'Children served' },
  { value: 2000, label: 'Women empowered' }
];

// "Our Services", shortened. Figures are the official ones.
export const PROGRAMS = [
  {
    name: 'Disaster management',
    text: 'Aided 21,000 families during Cyclone Michaung. COVID-19 war rooms helped 2 lakh patients find beds, oxygen and food, and 1.76 lakh migrant workers get home safely.'
  },
  {
    name: 'Climate and environment',
    text: 'The 1 Crore Palm Plantation Mission has geo-tagged 45 lakh palm trees with 63,562 volunteers, alongside the 1000 Days Green Challenge and Green Schools Project.'
  },
  {
    name: 'Education',
    text: 'With IIT Madras and TAHDCO: 100 free tuition centres, 45+ students in IIT Madras programmes, laptops for girl students and smart classrooms in government schools.'
  },
  {
    name: 'Drug-free Tamil Nadu',
    text: 'With Tamil Nadu Police across all 38 districts: 89,000 students trained, 250+ awareness sessions and the 10581 helpline promoted.'
  },
  {
    name: 'Social responsibility',
    text: 'Project Social Connect, the 1 Day 1 Rupee scheme, has reached over 2.5 lakh people who now give a little to a greater cause every day.'
  },
  {
    name: 'Empowering volunteers',
    text: 'Finding, training and mentoring local changemakers, with a goal of 10 dedicated volunteers in every panchayat. The UDHAVI volunteer app is on the way.'
  },
  {
    name: 'Youth empowerment',
    text: 'Over 1 lakh young people in leadership workshops, mentorship and civic engagement programmes.'
  },
  {
    name: 'Inclusion and welfare',
    text: 'Support for 3,000+ differently-abled people, Narikuravar and Irular tribal communities, women’s vocational training and housing for 46 families.'
  },
  {
    name: 'Health and rescue',
    text: 'Medical camps, emergency blood donation, mental health awareness, meals for over 3 lakh people and rescue and care for homeless people.'
  }
];

export const GOALS = [
  { title: 'Empower youth leadership', text: 'Uplift those in need and foster a sense of humanity in every initiative.' },
  { title: 'Achieve environmental sustainability', text: 'Tree planting, waste management and awareness programmes for a sustainable future.' },
  { title: 'Enhance education access', text: 'Quality education for underprivileged children through resources, mentorship and infrastructure.' },
  { title: 'Support disaster relief', text: 'Swift rescue, aid distribution and long-term rehabilitation after natural disasters.' },
  { title: 'Promote inclusive development', text: 'Programmes for marginalised communities, differently-abled people and vulnerable groups.' }
];

export const VALUES = [
  { title: 'Compassion', text: 'Empathy and care in every action, so our work uplifts those in need.' },
  { title: 'Equality', text: 'A just, inclusive society with equal opportunity whatever someone’s background.' },
  { title: 'Creativity', text: 'New, practical solutions for the community’s changing needs.' },
  { title: 'Integrity', text: 'Honesty and transparency in every commitment we make.' }
];

// District groupings used by TNV zone coordinators (Our Team page)
export const ZONES = [
  { name: 'Chennai', districts: ['Chennai', 'Chengalpattu', 'Tiruvallur', 'Kanchipuram'] },
  { name: 'Vellore', districts: ['Vellore', 'Tirupathur', 'Ranipet', 'Tiruvannamalai'] },
  { name: 'Villupuram', districts: ['Villupuram', 'Kallakurichi', 'Cuddalore'] },
  { name: 'Dharmapuri', districts: ['Dharmapuri', 'Salem', 'Krishnagiri', 'Namakkal'] },
  { name: 'Coimbatore', districts: ['Coimbatore', 'Tiruppur', 'Erode', 'Nilgiris'] },
  { name: 'Trichy', districts: ['Tiruchirappalli', 'Perambalur', 'Karur', 'Pudukkottai'] },
  { name: 'Thanjavur', districts: ['Thanjavur', 'Tiruvarur', 'Nagapattinam', 'Mayiladuthurai', 'Ariyalur'] },
  { name: 'Madurai', districts: ['Madurai', 'Dindigul', 'Theni', 'Sivaganga', 'Virudhunagar', 'Ramanathapuram'] },
  { name: 'Tirunelveli', districts: ['Tirunelveli', 'Thoothukudi', 'Kanniyakumari', 'Tenkasi'] }
];

// The joining flow, in order (registration → verification → approval & credentials)
export const JOIN_STEPS = [
  {
    title: 'Register',
    text: 'Fill in the form from your phone or computer with your details, district, and wing preferences.'
  },
  {
    title: 'Take the verification call',
    text: 'Our district administration team calls you to confirm your details and talk about how you want to help.'
  },
  {
    title: 'Get your ID and groups',
    text: 'Once approved, access your volunteer profile, download official ID card and join your district WhatsApp group.'
  }
];

// Gallery: the images from the official site's home page gallery, optimised and
// served from client/public/gallery (<name>-800.webp and <name>-1600.webp).
// They illustrate TNV's work areas rather than specific events, so captions name the area.
// To add a photo: put <name>-800.webp and <name>-1600.webp in public/gallery and add an entry.
const img = name => ({ src: `/gallery/${name}-800.webp`, full: `/gallery/${name}-1600.webp` });
export const GALLERY = [
  {
    ...img('education'),
    alt: 'A row of schoolboys in uniform looking at the camera',
    caption: 'Education', place: '100 free tuition centres for children'
  },
  {
    ...img('farmers'),
    alt: 'Weathered hands holding a handful of soil',
    caption: 'Farmers and the land', place: 'Environment and farmers’ welfare'
  },
  {
    ...img('village'),
    alt: 'A stone lane between village houses with flowering plants',
    caption: 'Village development', place: 'Adopting villages across Tamil Nadu'
  },
  {
    ...img('health'),
    alt: 'Children walking down a street wearing face masks',
    caption: 'Health and hygiene', place: 'COVID-19 relief and medical camps'
  },
  {
    ...img('women-children'),
    alt: 'A mother in an orange sari sitting with her young daughter in a market street',
    caption: 'Women and children', place: 'Safety and empowerment programmes'
  },
  {
    ...img('community'),
    alt: 'Two older women laughing together outdoors',
    caption: 'Community welfare', place: 'Care for elders and families'
  },
  {
    ...img('children'),
    alt: 'Two smiling boys hugging',
    caption: 'Children served', place: '5,000+ children reached'
  },
  {
    ...img('teaching'),
    alt: 'A smiling teacher in front of a classroom of girls',
    caption: 'Teaching', place: 'Education with IIT Madras and TAHDCO'
  },
  {
    ...img('women'),
    alt: 'A woman in a sari sitting with a group of young children',
    caption: 'Women empowered', place: '2,000+ women supported'
  },
  {
    ...img('drug-free'),
    alt: 'Capsules scattered around the words Stop Drugs',
    caption: 'Drug-free Tamil Nadu', place: '89,000 students trained with Tamil Nadu Police'
  },
  {
    ...img('tree-planting'),
    alt: 'Two pairs of hands holding a small green seedling',
    caption: 'Tree planting', place: '1,00,000+ trees planted'
  }
];

export const SOCIAL_LINKS = [
  { name: 'Facebook', icon: 'facebook', url: 'https://facebook.com/tamilnaduvolunteers' },
  { name: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/TamilNaduVolunteers/' },
  { name: 'X (Twitter)', icon: 'x', url: 'https://x.com/TNVolunteersIND/' },
  { name: 'LinkedIn', icon: 'linkedin', url: 'https://www.linkedin.com/in/tamilnaduvolunteers/' },
  { name: 'YouTube', icon: 'youtube', url: 'https://www.youtube.com/channel/UCipkDG8Ltx0sfX_H7K7ApOA' }
];

// Digits with country code; shown as +91 90872 93339
export const CONTACT_PHONE = '919087293339';

export const CONTACT = {
  phone: CONTACT_PHONE,
  whatsapp: CONTACT_PHONE,
  email: 'tamilnaduvolunteers@gmail.com',
  address: '14/15, 3rd Floor, Easwar Apartments, Karaneeswarar Koil Street, Saidapet, Chennai 600015',
  hours: 'Monday to Saturday, 10:00 AM to 6:30 PM'
};

// Policy pages (content in data/policies.js)
export const POLICY_LINKS = [
  { name: 'Terms & Conditions', to: '/terms-conditions' },
  { name: 'Refund Policy', to: '/refund-policy' },
  { name: 'Privacy Policy', to: '/privacy-policy' }
];

// News & Updates strip. `to` is an in-site path, `href` an external link.
export const NEWS = [
  {
    text: 'Mass Palmyra Plantation Drive across Tamil Nadu on 27 September 2026, World Rivers Day',
    href: `${OFFICIAL}/2026/09/21/mass-palmyra-plantation-drive-across-tamil-nadu-on-september-27-2026-on-the-occasion-of-world-rivers-day/`
  },
  {
    text: 'Tamil Nadu Volunteers launches Organ Donation Support Initiative to promote awareness and help save lives',
    href: `${OFFICIAL}/2026/08/13/tamil-nadu-volunteers-launches-organ-donation-support-initiative-to-promote-awareness-and-help-save-lives/`
  },
  {
    text: 'TNV Club officially launched on the birthday of Chairman Hari Krishnan N',
    href: `${OFFICIAL}/2026/05/20/tnv-club-officially-launched-on-the-birthday-of-chairman-hari-krishnan-n/`
  },
  { text: 'Volunteer registration is open in all 38 districts of Tamil Nadu.', to: '/register' }
];
