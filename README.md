# TNV Hub Portal — Frontend Reference

> **Developer ID:** `NITHINSJNDI`  
> **Repository:** [https://github.com/nithinrv07/tnv-hub](https://github.com/nithinrv07/tnv-hub)  
> **Branch:** `frontend`

---

## 📢 IMPORTANT NOTICE FOR FRONTEND TEAM
> **NOTE:** This `frontend` branch is created as an official **REFERENCE FOR THE FRONTEND TEAM**.  
> It contains the complete frontend implementation, DOM hierarchy, responsive 2-column grid layout, dynamic form field behaviors, client-side validation, searchable multi-select dropdown, photo/selfie capture, and volunteer dashboard UI. The frontend team can use this code directly or adapt these patterns into modern client frameworks (React, Next.js, Vue, or Angular).

---

## 🚀 What Has Been Done In This Project

### 1. Dynamic Volunteer Registration Form (Phase 1)
- **Affiliation / Category Dynamic Expansion**:
  - `Individual`: Standard view without extra organization fields.
  - `NGO`: Dynamically generates **`NGO Name *`** with placeholder `Enter name of ngo`.
  - `Trust`: Dynamically generates **`Trust Name *`** with placeholder `Enter name of trust`.
  - `Club`: Dynamically generates **`Club Name *`** with placeholder `Enter name of club`.
  - `School`: Dynamically generates **`School Name *`** with placeholder `Enter name of school`.
  - `College`: Dynamically generates **`College Name *`** with placeholder `Enter name of college`.
  - `Association`: Dynamically generates **`Association Name *`** with placeholder `Enter name of association`.
  - `Company`: Dynamically generates **`Company Name *`** with placeholder `Enter name of company`.
  - `Other`: Dynamically generates **`Other Name *`** with placeholder `Enter name of other`.
  - `Others (type manually)`: Inlines text input (`Enter Affiliation / Category`) directly below the dropdown without shifting the 2-column grid.

- **Work / Study Status Dynamic Fields**:
  - `Working`: Dynamically displays **`Company / Employer Name *`** (placeholder: `Enter company / employer name`).
  - `Student`: Dynamically displays **`School / College / Institution Name *`** (placeholder: `Enter school, college, or institution name`).
  - `Other` / `Others (type manually)`: Displays **`Work / Study Details *`**.

- **Natural 2-Column Responsive Grid**:
  - Automatically reflows based on visible fields matching exact UX specifications:
    - *When Individual:* Row 1: `[Affiliation]` | `[Work / Study Status]`, Row 2: `[Profession]` | `[Company / Employer]`.
    - *When Org:* Row 1: `[Affiliation]` | `[Org Name]`, Row 2: `[Work / Study Status]` | `[Profession]`, Row 3: `[Company / Employer]`.

- **Previous Works / Experience Box**:
  - Dark glassmorphic design system matching the rest of the application.
  - Live word counter (`0/150 words`).
  - Flexible validation accepting any concise answer (`Nil`, `Fresher`, `Teacher`, `Software Engineer`, etc.) or comprehensive description up to 150 words without arbitrary minimum-word blocks.

- **Searchable Past Field Work Multi-Select Dropdown**:
  - Custom trigger button with live selection summary (e.g., `Fresher`, `Women & Child Safety (+2 more)`).
  - Search filter input with instant text filtering.
  - Categorized under 7 core departments (General, Social Responsibility, Health & Wellness, Education & Skill Development, Community Development, Emergency Crisis, Environment & Sustainability).
  - Quick action buttons: `Clear all` and `Done`.

- **Demographics & Location Cascade**:
  - All 38 Tamil Nadu districts loaded.
  - Assembly Constituencies dynamically loaded based on district selection.
  - Mandatory **`Panchayat / Area *`** input.

- **Media & Profile Photo Integration**:
  - HTML5 Canvas & MediaDevices webcam selfie snapshot modal.
  - File picker (PNG/JPEG/WebP) with drag-and-drop and instant base64 preview.

- **Real-Time Validations & Security Badges**:
  - Debounced live username availability check against backend.
  - Unique email check (strictly 1 account per email).
  - AES-256 encrypted Aadhaar masking badge (`XXXX XXXX 1234`).

### 2. User Dashboard & Verification States
- **Application Status Views**:
  - `Under Review` (pending state): Displays security notices, locks official documents and community links.
  - `Approved Member`: Unlocks TNV Member ID (`TNV-CHE-0001`), official CR80 Member ID card download, appointment letter, and community group links.
- **Registered Profile Details**:
  - Complete review card displaying full name, username, email, phone, affiliation, dynamic organization name, profession, work/study status, company/institution name, district, constituency, panchayat, wing, department, preferred mode, and past field work badges.

---

## 📂 Frontend Directory Structure
```
public/
├── index.html        # Main semantic markup, accessible forms, modal dialogs, and dashboard
├── style.css         # Modern dark glassmorphic design system and responsive grid
└── app.js            # Client-side state, dynamic form handlers, dropdown logic, and API calls
```

---

## 💻 Running the Frontend
The frontend files are static HTML5, CSS3, and modern JavaScript. They can be served using any static HTTP server:
```bash
# Example using npx serve or python:
npx serve public
# or
python -m http.server 3000 --directory public
```

---

**Author / Developer ID:** `NITHINSJNDI`  
**Repository:** [https://github.com/nithinrv07/tnv-hub](https://github.com/nithinrv07/tnv-hub)
