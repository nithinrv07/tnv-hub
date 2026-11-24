// Volunteer testimonials shown on the Volunteers page (/volunteers) and,
// for the entries marked `featured`, on the homepage.
//
// Only add GENUINE feedback, given by the volunteer, with their consent to
// publish their name, photo and words. Do not write or edit quotes on a
// volunteer's behalf beyond fixing obvious typos.
//
// Each entry:
// {
//   name: 'Full name as the volunteer wants it shown',     // required
//   quote: 'Their own words, 2-5 sentences.',              // required
//   district: 'Chennai',                                    // optional
//   wing: 'Youth Wing',                                     // optional
//   role: 'District Coordinator',                           // optional
//   since: 2024,                                            // optional: year they joined
//   photo: '/testimonials/name.jpg',                        // optional: file in client/public/testimonials/
//   activities: ['Palm plantation', 'Flood relief'],        // optional: what they took part in
//   learned: 'One line on what they learned or gained.',    // optional
//   featured: true                                          // optional: also show on the homepage
// }
//
// While the list is empty the homepage section stays hidden and the
// Volunteers page shows a short "stories coming soon" note.
export const TESTIMONIALS = [];

// How many featured testimonials the homepage shows.
export const HOMEPAGE_TESTIMONIAL_COUNT = 3;
