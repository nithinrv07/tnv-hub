/**
 * Tamil Nadu Volunteer Hub - Comprehensive Registration Metadata
 * 
 * Includes:
 * 1. 234 Assembly Constituencies mapped to 38 Tamil Nadu Districts
 * 2. Affiliation / Category options
 * 3. Wings to Join & Departments
 * 4. Mode of Work options
 * 5. Past Field Work categories & specific departments
 */

const DISTRICT_CONSTITUENCIES = {
  1: ["Ariyalur", "Jayankondam"], // Ariyalur
  2: ["Chengalpattu", "Cheyyur", "Maduranthakam", "Tambaram", "Pallavaram", "Thiruporur", "Sholinganallur"], // Chengalpattu
  3: ["Dr. Radhakrishnan Nagar", "Perambur", "Kolathur", "Villivakkam", "Thiru-Vi-Ka-Nagar", "Egmore", "Royapuram", "Harbour", "Chepauk-Thiruvallikeni", "Thousand Lights", "Anna Nagar", "Virugampakkam", "Saidapet", "Thiyagarayanagar", "Mylapore", "Velachery"], // Chennai
  4: ["Mettupalayam", "Sulur", "Kavundampalayam", "Coimbatore North", "Thondamuthur", "Coimbatore South", "Singanallur", "Kinathukadavu", "Pollachi", "Valparai"], // Coimbatore
  5: ["Tittakudi", "Vridhachalam", "Neyveli", "Panruti", "Cuddalore", "Kurinjipadi", "Bhuvanagiri", "Chidambaram", "Kattumannarkoil"], // Cuddalore
  6: ["Palacode", "Pennagaram", "Dharmapuri", "Pappireddippatti", "Harur"], // Dharmapuri
  7: ["Palani", "Oddanchatram", "Athoor", "Nilakkottai", "Natham", "Dindigul", "Vedasandur"], // Dindigul
  8: ["Erode East", "Erode West", "Modakkurichi", "Perundurai", "Bhavani", "Anthiyur", "Gobichettipalayam", "Bhavanisagar"], // Erode
  9: ["Ulundurpettai", "Rishivandiyam", "Sankarapuram", "Kallakurichi"], // Kallakurichi
  10: ["Uthiramerur", "Kancheepuram", "Sriperumbudur", "Alandur"], // Kanchipuram
  11: ["Kanyakumari", "Nagercoil", "Colachel", "Padmanabhapuram", "Vilavancode", "Killiyoor"], // Kanyakumari
  12: ["Aravakurichi", "Karur", "Krishnarayapuram", "Kulithalai"], // Karur
  13: ["Uthangarai", "Bargur", "Krishnagiri", "Veppanahalli", "Hosur", "Thalli"], // Krishnagiri
  14: ["Melur", "Madurai East", "Sholavandan", "Madurai North", "Madurai South", "Madurai Central", "Madurai West", "Thiruparankundram", "Thirumangalam", "Usilampatti"], // Madurai
  15: ["Sirkazhi", "Mayiladuthurai", "Poompuhar"], // Mayiladuthurai
  16: ["Kilvelur", "Nagapattinam", "Vedaranyam"], // Nagapattinam
  17: ["Rasipuram", "Senthamangalam", "Namakkal", "Paramathi-Velur", "Tiruchengodu", "Kumarapalayam"], // Namakkal
  18: ["Udhagamandalam", "Gudalur", "Coonoor"], // Nilgiris
  19: ["Perambalur", "Kunnam"], // Perambalur
  20: ["Gandharvakottai", "Viralimalai", "Pudukkottai", "Thirumayam", "Alangudi", "Aranthangi"], // Pudukkottai
  21: ["Paramakudi", "Tiruvadanai", "Ramanathapuram", "Mudukulathur"], // Ramanathapuram
  22: ["Arakkonam", "Sholingur", "Ranipet", "Arcot"], // Ranipet
  23: ["Gangavalli", "Attur", "Yercaud", "Omalur", "Mettur", "Edappadi", "Sankari", "Salem West", "Salem North", "Salem South", "Veerapandi"], // Salem
  24: ["Sivaganga", "Manamadurai", "Tiruppattur", "Karaikudi"], // Sivaganga
  25: ["Sankarankovil", "Vasudevanallur", "Kadayanallur", "Tenkasi", "Alangulam"], // Tenkasi
  26: ["Thiruvidaimarudur", "Kumbakonam", "Papanasam", "Thiruvaiyaru", "Thanjavur", "Orathanadu", "Pattukkottai", "Peravurani"], // Thanjavur
  27: ["Andipatti", "Periyakulam", "Bodinayakanur", "Cumbum"], // Theni
  28: ["Vilathikulam", "Thoothukkudi", "Tiruchendur", "Srivaikuntam", "Ottapidaram", "Kovilpatti"], // Thoothukudi
  29: ["Manapparai", "Srirangam", "Tiruchirappalli West", "Tiruchirappalli East", "Thiruverumbur", "Lalgudi", "Manachanallur", "Musiri", "Thuraiyur"], // Tiruchirappalli
  30: ["Tirunelveli", "Ambasamudram", "Palayamkottai", "Nanguneri", "Radhapuram"], // Tirunelveli
  31: ["Vaniyambadi", "Ambur", "Jolarpet", "Tirupattur"], // Tirupathur
  32: ["Dharapuram", "Kangayam", "Avanashi", "Tiruppur North", "Tiruppur South", "Palladam", "Udumalaipettai", "Madathukulam"], // Tiruppur
  33: ["Gummidipoondi", "Ponneri", "Tiruttani", "Thiruvallur", "Poonamallee", "Avadi", "Maduravoyal", "Ambattur", "Madavaram", "Tiruvottiyur"], // Tiruvallur
  34: ["Chengam", "Tiruvannamalai", "Kilpennathur", "Kalasapakkam", "Polur", "Arani", "Cheyyar", "Vandavasi"], // Tiruvannamalai
  35: ["Thiruthuraipoondi", "Mannargudi", "Thiruvarur", "Nannilam"], // Tiruvarur
  36: ["Katpadi", "Vellore", "Anaikattu", "Kilvaithinankuppam", "Gudiyattam"], // Vellore
  37: ["Gingee", "Mailam", "Tindivanam", "Vanur", "Villupuram", "Vikravandi", "Tirukkoyilur"], // Viluppuram
  38: ["Rajapalayam", "Srivilliputhur", "Sattur", "Sivakasi", "Virudhunagar", "Aruppukkottai", "Tiruchuli"] // Virudhunagar
};

// Image 1: Affiliation / Category dropdown options
const AFFILIATIONS = [
  "Individual",
  "NGO",
  "Trust",
  "Club",
  "School",
  "College",
  "Association",
  "Company",
  "Other",
  "Others (type manually)"
];

// Image 4: Wings to Join & Departments
const WINGS = [
  "Management Wing — Governance, Systems & Organizational Support",
  "Operations Wing — Programs, Public Service & Social Impact"
];

const DEPARTMENTS_BY_WING = {
  "Management Wing — Governance, Systems & Organizational Support": [
    {
      name: "1. Administration & Human Resources Department",
      items: [
        "Volunteer Recruitment",
        "HR & Member Engagement",
        "Training & Orientation",
        "Reporting & Documentation",
        "Code of Conduct Cell",
        "Monitoring & Evaluation Cell",
        "Internal Audit Cell",
        "Research & Policy Cell",
        "Innovation Cell"
      ]
    },
    {
      name: "2. Finance & Compliance Department",
      items: [
        "Accounts & Budgeting",
        "Financial Planning",
        "Fundraising Support",
        "One Day One Rupee Management",
        "Audit & Compliance",
        "Donor Financial Reporting"
      ]
    },
    {
      name: "3. Partnerships, CSR & NGO Relations Department",
      items: [
        "NGO Collaboration Cell",
        "CSR Partnerships",
        "Corporate Relations",
        "Institutional Tie-Ups",
        "Government Liaison",
        "MOU Coordination"
      ]
    },
    {
      name: "4. Technology & Digital Systems Department",
      items: [
        "Website & Platform Team",
        "App Development Team",
        "Data Systems & Dashboard Unit",
        "Automation & Digital Tools",
        "Technical Support"
      ]
    },
    {
      name: "5. Communication & Media Department",
      items: [
        "Social Media Team",
        "Content & Design Unit",
        "Public Relations Cell",
        "Documentation Media Team",
        "News & Publications"
      ]
    },
    {
      name: "6. Field Operations Department",
      items: [
        "Ground Operations Team",
        "Event Volunteer Unit",
        "Emergency Field Response",
        "District Field Coordination"
      ]
    },
    {
      name: "7. Online Volunteer Operations Department",
      items: [
        "Digital Campaign Team",
        "Remote Volunteer Coordination",
        "Call Activity Team",
        "Data Verification Unit",
        "Online Support Desk"
      ]
    }
  ],
  "Operations Wing — Programs, Public Service & Social Impact": [
    {
      name: "1. Social Responsibility, Awareness & Advocacy Department",
      items: [
        "Fostering Social Responsibility",
        "Drug-Free Society & Drug-Free Tamil Nadu",
        "Women & Child Safety",
        "Public Awareness",
        "Legal Awareness"
      ]
    },
    {
      name: "2. Health & Wellness Department",
      items: [
        "Health, Hygiene & Sanitation",
        "Nutrition & Wellness",
        "Mental Health Awareness",
        "Blood Donation Initiatives",
        "Organ Donation"
      ]
    },
    {
      name: "3. Education & Skill Development Department",
      items: [
        "Education Empowerment Initiatives",
        "Youth Empowerment",
        "Women Empowerment",
        "Sports Development",
        "Self Employment"
      ]
    },
    {
      name: "4. Community Development Department",
      items: [
        "Village Development",
        "Farmers Welfare",
        "Tribal Welfare",
        "Affordable Housing & Homeless Care"
      ]
    },
    {
      name: "5. Emergency Crisis & Disaster Management Department",
      items: [
        "Disaster Response",
        "Differently Abled Support",
        "Emergency Aid",
        "TNV Global Welfare Initiatives"
      ]
    },
    {
      name: "6. Environment, Sustainability & Ecological Restoration Department",
      items: [
        "Environment Protection & Climate Change",
        "Animal Welfare",
        "SDG Goals & Implementation",
        "Ecological Restoration"
      ]
    }
  ]
};

// Image 5: Which mode of work do you prefer?
const MODES_OF_WORK = [
  "Online Volunteering",
  "Field Volunteering",
  "Both"
];

// Item 5: Past Field Work (select all that apply)
const PAST_FIELD_WORK_DEPARTMENTS = [
  {
    department: "General",
    items: [
      "Fresher"
    ]
  },
  {
    department: "Social Responsibility, Awareness & Advocacy Department",
    items: [
      "Fostering Social Responsibility",
      "Drug-Free Society & Drug-Free Tamil Nadu",
      "Women & Child Safety",
      "Public Awareness",
      "Legal Awareness"
    ]
  },
  {
    department: "Health & Wellness Department",
    items: [
      "Health, Hygiene & Sanitation",
      "Nutrition & Wellness",
      "Mental Health Awareness",
      "Blood Donation Initiatives",
      "Organ Donation"
    ]
  },
  {
    department: "Education & Skill Development Department",
    items: [
      "Education Empowerment Initiatives",
      "Youth Empowerment",
      "Women Empowerment",
      "Sports Development",
      "Self Employment"
    ]
  },
  {
    department: "Community Development Department",
    items: [
      "Village Development",
      "Farmers Welfare",
      "Tribal Welfare",
      "Affordable Housing & Homeless Care"
    ]
  },
  {
    department: "Emergency Crisis & Disaster Management Department",
    items: [
      "Disaster Response",
      "Differently Abled Support",
      "Emergency Aid",
      "TNV Global Welfare Initiatives"
    ]
  },
  {
    department: "Environment, Sustainability & Ecological Restoration Department",
    items: [
      "Environment Protection & Climate Change",
      "Animal Welfare",
      "SDG Goals & Implementation",
      "Ecological Restoration"
    ]
  }
];

// Work / Study Status options
const WORK_STUDY_STATUSES = [
  "Working",
  "Student",
  "Other",
  "Others (type manually)"
];

module.exports = {
  DISTRICT_CONSTITUENCIES,
  AFFILIATIONS,
  WORK_STUDY_STATUSES,
  WINGS,
  DEPARTMENTS_BY_WING,
  MODES_OF_WORK,
  PAST_FIELD_WORK_DEPARTMENTS
};
