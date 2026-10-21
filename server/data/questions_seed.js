// Seed data of 16 bilingual interview questions from tnv-selection-next-master
// Exactly 10 questions are active by default (positions 1-10)

const SEEDED_QUESTIONS = [
  {
    id: 1,
    position: 1,
    question_en: "Why do you want to serve as a Tamil Nadu Volunteers Leader?",
    question_ta: "தமிழ்நாடு தன்னார்வலர்களின் தலைமைப் பொறுப்பில் செயல்பட நீங்கள் ஏன் விரும்புகிறீர்கள்? இந்தப் பொறுப்பை சிறப்பாக மேற்கொள்ள உங்களிடம் உள்ள திறன்கள் மற்றும் பங்களிப்புகள் என்னென்ன?",
    hint: "Look for:\n• Genuine motivation for social service\n• Commitment beyond position or recognition\n• Understanding of TNV's vision\n• Willingness to take responsibility\n• Desire to create socially responsible citizens and grassroots leaders\n\n\"Leadership is not a position; it is a responsibility to serve.\"",
    active: true
  },
  {
    id: 2,
    position: 2,
    question_en: "What are the first three things you would do after receiving the appointment?",
    question_ta: "நியமனம் கிடைத்தவுடன் நீங்கள் முதலில் செய்யும் மூன்று முக்கியமான செயல்கள் என்ன?",
    hint: "Look for these 3 steps:\n1. UNDERSTAND & ASSESS — Meet existing volunteers, understand local needs, strengths, challenges, and ongoing activities\n2. ORGANISE & BUILD — Create a strong local volunteer network, identify potential leaders, assign responsibilities based on skills and interests\n3. ACT & MEASURE — Start meaningful priority service activities, set clear targets, maintain transparency, measure real social impact\n\nKey leadership quality: Listen first → Organise people → Take action → Create measurable impact.",
    active: true
  },
  {
    id: 3,
    position: 3,
    question_en: "What should a Tamil Nadu Volunteers Leader never do?",
    question_ta: "தமிழ்நாடு தன்னார்வலர்களின் தலைவர்களில் ஒருவராக நீங்கள் என்ன செய்யக்கூடாது?",
    hint: "Look for:\n• Never misuse the organisation's name, position, funds or resources\n• Never use volunteers for personal, political or commercial benefit\n• Never create false service records\n• Never discriminate\n• Never take credit for others' work\n• Never compromise transparency, trust or TNV values\n\nKey principle: \"Never use service for personal gain; use leadership to create more service.\"",
    active: true
  },
  {
    id: 4,
    position: 4,
    question_en: "Tell me about some social service activity that you personally carried out.",
    question_ta: "நீங்கள் நேரடியாக மேற்கொண்ட ஒரு சில சமூக சேவைப் பணியைப் பற்றி சொல்லுங்கள்?",
    hint: "Look for:\n• Genuine personal experience\n• Personal contribution\n• Involvement of others where relevant\n• Actual outcome\n• Learning from the experience\n\n\"A real example.\"",
    active: true
  },
  {
    id: 5,
    position: 5,
    question_en: "How did you involve other people in that activity?",
    question_ta: "அந்த சமூக சேவைப் பணியில் மற்றவர்களை எவ்வாறு இணைத்து செயல்படச் செய்தீர்கள்?",
    hint: "Look for:\n• How they identified the right people\n• How they communicated the need\n• How they assigned or coordinated roles\n• How they motivated others to participate\n• What collective outcome was achieved",
    active: true
  },
  {
    id: 6,
    position: 6,
    question_en: "How would you build and organise a volunteer team in your area?",
    question_ta: "உங்கள் பகுதியில் தன்னார்வலர் குழுவை எவ்வாறு உருவாக்கி ஒருங்கிணைப்பீர்கள்?",
    hint: "Look for:\n• Identifying people interested in social service\n• Creating volunteering opportunities\n• Assigning responsibilities based on skills\n• Training and mentoring\n• Building a local team\n• Developing future social leaders",
    active: true
  },
  {
    id: 7,
    position: 7,
    question_en: "Will you continue serving even without money or recognition? Why?",
    question_ta: "பணம் அல்லது பாராட்டு கிடைக்காவிட்டாலும் தொடர்ந்து சமூக சேவை செய்வீர்களா? ஏன்?",
    hint: "Look for:\n• Genuine service mindset\n• Commitment beyond personal benefit\n• Consistency\n• Willingness to serve without expecting recognition",
    active: true
  },
  {
    id: 8,
    position: 8,
    question_en: "How would you guide and develop a young volunteer into a leader?",
    question_ta: "ஒரு இளம் தன்னார்வலரை எவ்வாறு வழிநடத்தி, எதிர்காலத் தலைவராக உருவாக்குவீர்கள்?",
    hint: "Look for:\n• Understanding their strengths\n• Providing responsibility\n• Mentoring\n• Leading by example\n• Allowing them to take decisions\n• Encouraging initiative\n• Creating independent future leaders",
    active: true
  },
  {
    id: 9,
    position: 9,
    question_en: "If you are given an area with no volunteers, how will you build the network and address a local social problem within 30 days?",
    question_ta: "தன்னார்வலர்கள் இல்லாத ஒரு பகுதியில் உங்களை நியமித்தால், அங்கு தன்னார்வலர் வலையமைப்பை எவ்வாறு உருவாக்கி, 30 நாட்களுக்குள் ஒரு உள்ளூர் சமூகப் பிரச்சினையை எவ்வாறு அணுகுவீர்கள்?",
    hint: "Look for:\n• Identifying a genuine local problem\n• Understanding the root cause\n• Identifying people affected\n• Finding potential volunteers\n• Creating a small service opportunity\n• Mobilising and training people\n• Coordinating with relevant Government/NGO/local groups\n• Achieving a measurable result\n\nKey principle: Identify → Mobilise → Organise → Serve → Measure",
    active: true
  },
  {
    id: 10,
    position: 10,
    question_en: "How will you work with Government, NGOs and local organisations?",
    question_ta: "அரசு, தன்னார்வத் தொண்டு நிறுவனங்கள் (NGOs) மற்றும் உள்ளூர் அமைப்புகளுடன் எவ்வாறு இணைந்து பணியாற்றுவீர்கள்?",
    hint: "Look for:\n• Respecting each stakeholder's role\n• Clear communication\n• Effective coordination\n• Connecting resources with genuine needs\n• Avoiding duplication\n• Transparency\n• Working towards a common goal",
    active: true
  },
  {
    id: 11,
    position: 11,
    question_en: "Tell me about a time when you gave someone else an opportunity to lead.",
    question_ta: "வேறு ஒருவருக்கு தலைமை ஏற்கும் வாய்ப்பை வழங்கிய ஒரு அனுபவத்தைப் பற்றி சொல்லுங்கள்.",
    hint: "Look for:\n• Identifying another person's potential\n• Giving them genuine responsibility\n• Providing guidance without controlling them\n• Allowing them to make decisions\n• Supporting them when needed\n• Recognising their contribution\n• Helping them grow into an independent leader",
    active: false
  },
  {
    id: 12,
    position: 12,
    question_en: "If your team fails to achieve its target, what will you do?",
    question_ta: "உங்கள் குழு நிர்ணயித்த இலக்கை அடையத் தவறினால், நீங்கள் என்ன செய்வீர்கள்?",
    hint: "Look for:\n• Taking responsibility\n• Identifying the reason for failure\n• Listening without blaming\n• Learning from mistakes\n• Creating a revised action plan\n• Motivating the team towards the next target",
    active: false
  },
  {
    id: 13,
    position: 13,
    question_en: "How will you ensure that your team's service is genuine and transparent?",
    question_ta: "உங்கள் குழுவின் சேவை உண்மையானதும் வெளிப்படையானதுமாக இருப்பதை எப்படி உறுதி செய்வீர்கள்?",
    hint: "Look for:\n• Proper documentation\n• Beneficiary verification\n• Photographs/videos where appropriate\n• Geo-tagging where applicable\n• Activity and volunteer records\n• Impact reporting\n• Willingness for verification",
    active: false
  },
  {
    id: 14,
    position: 14,
    question_en: "How do you build positive working relationships with people who have different opinions or backgrounds?",
    question_ta: "உங்களுடன் மாறுபட்ட கருத்துகள் அல்லது வேறுபட்ட பின்னணியைக் கொண்டவர்களுடன் நல்ல ஒத்துழைப்புடன் எப்படி பணியாற்றுவீர்கள்?",
    hint: "Look for:\n• Respecting different opinions\n• Listening without prejudice\n• Focusing on the common social goal\n• Working collaboratively despite differences\n• Avoiding personal conflicts\n• Finding practical solutions through mutual understanding",
    active: false
  },
  {
    id: 15,
    position: 15,
    question_en: "How would you handle disagreements or conflicts within your team while keeping everyone focused on the common goal?",
    question_ta: "உங்கள் குழுவில் கருத்து வேறுபாடுகள் அல்லது முரண்பாடுகள் ஏற்பட்டால், அனைவரையும் ஒரே இலக்கை நோக்கி எவ்வாறு செயல்பட செய்வீர்கள்?",
    hint: "Look for:\n• Listening to different perspectives\n• Respecting differences\n• Avoiding personal conflicts\n• Finding common ground\n• Solving issues through discussion\n• Keeping the team focused on the social goal",
    active: false
  },
  {
    id: 16,
    position: 16,
    question_en: "Tell me about a social problem in your area that nobody is addressing. If we give you 30 days, what will you do?",
    question_ta: "உங்கள் பகுதியில் யாரும் கவனிக்காத ஒரு சமூகப் பிரச்சினையை சொல்லுங்கள். அதை சரிசெய்ய 30 நாட்கள் கொடுத்தால் என்ன செய்வீர்கள்?",
    hint: "Look for:\n• Ability to identify a genuine local problem\n• Understanding of the root cause\n• Identifying affected people\n• Practical 30-day action plan\n• Volunteer mobilisation\n• Government/NGO coordination\n• Measurable outcome\n\nFramework: Problem → Root Cause → People → Resources → Volunteers → Action → Result",
    active: false
  }
];

module.exports = {
  SEEDED_QUESTIONS
};
