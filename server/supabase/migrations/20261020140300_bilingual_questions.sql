-- Migration: 20261020140300_bilingual_questions.sql
-- Bilingual Interview Questions seeded from tnv-selection-next-master
-- Supports flexible 10-question selection and dynamic admin question authoring

create table if not exists interview_questions (
  id serial primary key,
  position int not null,
  question_en text not null,
  question_ta text not null default '',
  hint text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 20261020120300_partb_scoring.sql already created interview_questions with a single
-- English "text" column, so the table above was not created. Add the bilingual
-- columns, carry any existing text across, and retire the old column.
alter table interview_questions add column if not exists question_en text;
alter table interview_questions add column if not exists question_ta text not null default '';
alter table interview_questions add column if not exists hint text not null default '';
alter table interview_questions add column if not exists updated_at timestamptz not null default now();
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'interview_questions' and column_name = 'text'
  ) then
    update interview_questions set question_en = coalesce(question_en, text);
    alter table interview_questions drop column text;
  end if;
end $$;
alter table interview_questions alter column question_en set not null;
create unique index if not exists interview_questions_position_key on interview_questions (position);

-- Seed the 16 bilingual questions (updates any earlier English-only questions in place)
insert into interview_questions (position, question_en, question_ta, hint, active)
select * from (values
  (1, 'Why do you want to serve as a Tamil Nadu Volunteers Leader?', 'தமிழ்நாடு தன்னார்வலர்களின் தலைமைப் பொறுப்பில் செயல்பட நீங்கள் ஏன் விரும்புகிறீர்கள்? இந்தப் பொறுப்பை சிறப்பாக மேற்கொள்ள உங்களிடம் உள்ள திறன்கள் மற்றும் பங்களிப்புகள் என்னென்ன?', 'Look for:\n• Genuine motivation for social service\n• Commitment beyond position or recognition\n• Understanding of TNV''s vision\n• Willingness to take responsibility\n• Desire to create socially responsible citizens and grassroots leaders\n\n"Leadership is not a position; it is a responsibility to serve."', true),
  (2, 'What are the first three things you would do after receiving the appointment?', 'நியமனம் கிடைத்தவுடன் நீங்கள் முதலில் செய்யும் மூன்று முக்கியமான செயல்கள் என்ன?', 'Look for these 3 steps:\n1. UNDERSTAND & ASSESS — Meet existing volunteers, understand local needs, strengths, challenges, and ongoing activities\n2. ORGANISE & BUILD — Create a strong local volunteer network, identify potential leaders, assign responsibilities based on skills and interests\n3. ACT & MEASURE — Start meaningful priority service activities, set clear targets, maintain transparency, measure real social impact\n\nKey leadership quality: Listen first → Organise people → Take action → Create measurable impact.', true),
  (3, 'What should a Tamil Nadu Volunteers Leader never do?', 'தமிழ்நாடு தன்னார்வலர்களின் தலைவர்களில் ஒருவராக நீங்கள் என்ன செய்யக்கூடாது?', 'Look for:\n• Never misuse the organisation''s name, position, funds or resources\n• Never use volunteers for personal, political or commercial benefit\n• Never create false service records\n• Never discriminate\n• Never take credit for others'' work\n• Never compromise transparency, trust or TNV values\n\nKey principle: "Never use service for personal gain; use leadership to create more service."', true),
  (4, 'Tell me about some social service activity that you personally carried out.', 'நீங்கள் நேரடியாக மேற்கொண்ட ஒரு சில சமூக சேவைப் பணியைப் பற்றி சொல்லுங்கள்?', 'Look for:\n• Genuine personal experience\n• Personal contribution\n• Involvement of others where relevant\n• Actual outcome\n• Learning from the experience\n\n"A real example."', true),
  (5, 'How did you involve other people in that activity?', 'அந்த சமூக சேவைப் பணியில் மற்றவர்களை எவ்வாறு இணைத்து செயல்படச் செய்தீர்கள்?', 'Look for:\n• How they identified the right people\n• How they communicated the need\n• How they assigned or coordinated roles\n• How they motivated others to participate\n• What collective outcome was achieved', true),
  (6, 'How would you build and organise a volunteer team in your area?', 'உங்கள் பகுதியில் தன்னார்வலர் குழுவை எவ்வாறு உருவாக்கி ஒருங்கிணைப்பீர்கள்?', 'Look for:\n• Identifying people interested in social service\n• Creating volunteering opportunities\n• Assigning responsibilities based on skills\n• Training and mentoring\n• Building a local team\n• Developing future social leaders', true),
  (7, 'Will you continue serving even without money or recognition? Why?', 'பணம் அல்லது பாராட்டு கிடைக்காவிட்டாலும் தொடர்ந்து சமூக சேவை செய்வீர்களா? ஏன்?', 'Look for:\n• Genuine service mindset\n• Commitment beyond personal benefit\n• Consistency\n• Willingness to serve without expecting recognition', true),
  (8, 'How would you guide and develop a young volunteer into a leader?', 'ஒரு இளம் தன்னார்வலரை எவ்வாறு வழிநடத்தி, எதிர்காலத் தலைவராக உருவாக்குவீர்கள்?', 'Look for:\n• Understanding their strengths\n• Providing responsibility\n• Mentoring\n• Leading by example\n• Allowing them to take decisions\n• Encouraging initiative\n• Creating independent future leaders', true),
  (9, 'If you are given an area with no volunteers, how will you build the network and address a local social problem within 30 days?', 'தன்னார்வலர்கள் இல்லாத ஒரு பகுதியில் உங்களை நியமித்தால், அங்கு தன்னார்வலர் வலையமைப்பை எவ்வாறு உருவாக்கி, 30 நாட்களுக்குள் ஒரு உள்ளூர் சமூகப் பிரச்சினையை எவ்வாறு அணுகுவீர்கள்?', 'Look for:\n• Identifying a genuine local problem\n• Understanding the root cause\n• Identifying people affected\n• Finding potential volunteers\n• Creating a small service opportunity\n• Mobilising and training people\n• Coordinating with relevant Government/NGO/local groups\n• Achieving a measurable result\n\nKey principle: Identify → Mobilise → Organise → Serve → Measure', true),
  (10, 'How will you work with Government, NGOs and local organisations?', 'அரசு, தன்னார்வத் தொண்டு நிறுவனங்கள் (NGOs) மற்றும் உள்ளூர் அமைப்புகளுடன் எவ்வாறு இணைந்து பணியாற்றுவீர்கள்?', 'Look for:\n• Respecting each stakeholder''s role\n• Clear communication\n• Effective coordination\n• Connecting resources with genuine needs\n• Avoiding duplication\n• Transparency\n• Working towards a common goal', true),
  (11, 'Tell me about a time when you gave someone else an opportunity to lead.', 'வேறு ஒருவருக்கு தலைமை ஏற்கும் வாய்ப்பை வழங்கிய ஒரு அனுபவத்தைப் பற்றி சொல்லுங்கள்.', 'Look for:\n• Identifying another person''s potential\n• Giving them genuine responsibility\n• Providing guidance without controlling them\n• Allowing them to make decisions\n• Supporting them when needed\n• Recognising their contribution\n• Helping them grow into an independent leader', false),
  (12, 'If your team fails to achieve its target, what will you do?', 'உங்கள் குழு நிர்ணயித்த இலக்கை அடையத் தவறினால், நீங்கள் என்ன செய்வீர்கள்?', 'Look for:\n• Taking responsibility\n• Identifying the reason for failure\n• Listening without blaming\n• Learning from mistakes\n• Creating a revised action plan\n• Motivating the team towards the next target', false),
  (13, 'How will you ensure that your team''s service is genuine and transparent?', 'உங்கள் குழுவின் சேவை உண்மையானதும் வெளிப்படையானதுமாக இருப்பதை எப்படி உறுதி செய்வீர்கள்?', 'Look for:\n• Proper documentation\n• Beneficiary verification\n• Photographs/videos where appropriate\n• Geo-tagging where applicable\n• Activity and volunteer records\n• Impact reporting\n• Willingness for verification', false),
  (14, 'How do you build positive working relationships with people who have different opinions or backgrounds?', 'உங்களுடன் மாறுபட்ட கருத்துகள் அல்லது வேறுபட்ட பின்னணியைக் கொண்டவர்களுடன் நல்ல ஒத்துழைப்புடன் எப்படி பணியாற்றுவீர்கள்?', 'Look for:\n• Respecting different opinions\n• Listening without prejudice\n• Focusing on the common social goal\n• Working collaboratively despite differences\n• Avoiding personal conflicts\n• Finding practical solutions through mutual understanding', false),
  (15, 'How would you handle disagreements or conflicts within your team while keeping everyone focused on the common goal?', 'உங்கள் குழுவில் கருத்து வேறுபாடுகள் அல்லது முரண்பாடுகள் ஏற்பட்டால், அனைவரையும் ஒரே இலக்கை நோக்கி எவ்வாறு செயல்பட செய்வீர்கள்?', 'Look for:\n• Listening to different perspectives\n• Respecting differences\n• Avoiding personal conflicts\n• Finding common ground\n• Solving issues through discussion\n• Keeping the team focused on the social goal', false),
  (16, 'Tell me about a social problem in your area that nobody is addressing. If we give you 30 days, what will you do?', 'உங்கள் பகுதியில் யாரும் கவனிக்காத ஒரு சமூகப் பிரச்சினையை சொல்லுங்கள். அதை சரிசெய்ய 30 நாட்கள் கொடுத்தால் என்ன செய்வீர்கள்?', 'Look for:\n• Ability to identify a genuine local problem\n• Understanding of the root cause\n• Identifying affected people\n• Practical 30-day action plan\n• Volunteer mobilisation\n• Government/NGO coordination\n• Measurable outcome\n\nFramework: Problem → Root Cause → People → Resources → Volunteers → Action → Result', false)
) as t(position, question_en, question_ta, hint, active)
on conflict (position) do update set
  question_en = excluded.question_en,
  question_ta = excluded.question_ta,
  hint = excluded.hint,
  active = excluded.active,
  updated_at = now();

-- RPC: Get questions
create or replace function get_interview_questions(only_active boolean default false)
returns table (
  id int,
  "position" int, -- quoted: POSITION is a keyword and is not allowed unquoted here
  question_en text,
  question_ta text,
  hint text,
  active boolean
) language sql security definer as $$
  select id, position, question_en, question_ta, hint, active
  from interview_questions
  where (not only_active or active = true)
  order by position asc, id asc;
$$;

-- RPC: Set exactly 10 active questions
create or replace function set_active_interview_questions(p_active_ids int[])
returns boolean language plpgsql security definer as $$
begin
  if array_length(p_active_ids, 1) is distinct from 10 then
    raise exception 'Exactly 10 questions must be active for the interview';
  end if;

  update interview_questions
  set active = (id = any(p_active_ids)),
      updated_at = now();

  return true;
end;
$$;
