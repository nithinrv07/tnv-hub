-- =====================================================================
-- TNV Hub Portal - Phase 1 Seed Data
-- 10 Structured Interview Questions for Volunteer Verification (Part B)
-- Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Section 13)
-- Scoring: 0 = Poor/No, 0.5 = Moderate/Partial, 1 = Excellent/Yes
-- =====================================================================

insert into interview_questions (position, text, active) values
(1, 'Previous Community Service & Field Experience: Has the candidate actively participated in volunteer, social work, or grassroots community initiatives?', true),
(2, 'Commitment & Availability: Can the applicant commit regular hours each week for TNV community tasks, on-ground events, and coordinate meetings?', true),
(3, 'Communication & Interpersonal Skills: How effectively does the applicant articulate ideas, listen to public concerns, and interact with diverse community groups?', true),
(4, 'Alignment with TNV Values & Integrity: Does the candidate demonstrate honesty, empathy, and strict adherence to non-partisan community service?', true),
(5, 'Leadership & Initiative: Has the candidate demonstrated capacity to take responsibility, motivate peers, or solve problems independently in challenging situations?', true),
(6, 'Teamwork & Collaboration: How cooperatively does the applicant work under guidance and collaborate with co-volunteers and district coordinators?', true),
(7, 'Emergency & Crisis Preparedness: Is the applicant willing and available to mobilize during disaster relief, flood drives, or urgent public assistance?', true),
(8, 'Digital & Reporting Proficiency: Ability to utilize mobile portals, WhatsApp community groups, attendance QR codes, and digital reporting tools?', true),
(9, 'Understanding of Local District Demographics: Awareness of local issues, assembly constituencies, panchayats, and civic priorities in their home district?', true),
(10, 'Professionalism & Representation: Does the candidate maintain respectful conduct and ethical standards appropriate for representing Tamil Nadu Volunteers publicly?', true)
on conflict (position) do update set
    text = excluded.text,
    active = excluded.active;

