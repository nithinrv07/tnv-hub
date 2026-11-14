import os
import sys
import json
import re
import pymupdf

def clean_address_smart(raw_addr, district):
    if not raw_addr:
        return ""
    
    # 1. Normalize line breaks and split into lines
    raw_lines = [l.strip(' ,') for l in str(raw_addr).replace('\r', '\n').split('\n') if l.strip(' ,')]
    
    # 2. Filter out duplicate lines or lines already contained in another line
    clean_lines = []
    for line in raw_lines:
        line_clean = re.sub(r'\s*,\s*', ', ', line).strip(' ,')
        already_present = False
        for existing in clean_lines:
            if line_clean.lower() in existing.lower() or existing.lower() in line_clean.lower():
                if len(line_clean) > len(existing):
                    clean_lines[clean_lines.index(existing)] = line_clean
                already_present = True
                break
        if not already_present and line_clean:
            clean_lines.append(line_clean)

    addr_str = ', '.join(clean_lines) if clean_lines else str(raw_addr)
    
    # 3. Clean up double commas, extra spaces, leading 'Address:'
    addr_str = re.sub(r'^address\s*:\s*', '', addr_str, flags=re.IGNORECASE).strip(' ,')
    addr_str = re.sub(r'\s*,\s*', ', ', addr_str)
    
    # 4. Remove district if already present in address so it doesn't repeat
    if district:
        addr_str = re.sub(rf',?\s*{re.escape(district)}(\s+district)?\s*$', '', addr_str, flags=re.IGNORECASE).strip(' ,')
        
    # Guarantee strictly single line with no control/newline characters
    addr_str = ' '.join(addr_str.split())
    return addr_str

def generate_appointment_pdf(output_path, user):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    template_candidates = [
        os.path.join(base_dir, 'tnv-vol IDs', 'Appointment_Letter_TN_Volunteers.pdf'),
        os.path.join(base_dir, 'server', 'assets', 'letterhead', 'Appointment_Letter_TN_Volunteers.pdf'),
        'tnv-vol IDs/Appointment_Letter_TN_Volunteers.pdf',
        'server/assets/letterhead/Appointment_Letter_TN_Volunteers.pdf'
    ]

    template_pdf = None
    for cand in template_candidates:
        if os.path.exists(cand):
            template_pdf = cand
            break

    if not template_pdf:
        raise FileNotFoundError("Appointment_Letter_TN_Volunteers.pdf template not found!")

    doc = pymupdf.open(template_pdf)
    page = doc[0]

    # Volunteer dynamic data
    full_name = str(user.get('full_name') or 'Volunteer').strip()
    gender = str(user.get('gender') or '').lower()
    salutation = 'Ms' if ('fem' in gender or gender == 'f') else 'Mr'

    raw_district = str(user.get('district_name') or user.get('district') or 'Tamil Nadu').strip()
    # Normalize district string
    district = re.sub(r'\s+district$', '', raw_district, flags=re.IGNORECASE).strip()
    if not district:
        district = 'Tamil Nadu'
    
    # Line 4 must ONLY display the district name of the volunteer:
    address_line2 = f"{district} district"

    # Line 3: Address Line 1
    raw_addr = str(user.get('address') or '').strip()
    if not raw_addr:
        role = str(user.get('role') or user.get('preferred_designation') or 'Volunteer').strip()
        cleaned_addr = f"{role}, {district}"
    else:
        cleaned_addr = clean_address_smart(raw_addr, district)

    address_line1 = f"Address: {cleaned_addr}"

    # Date string in YYYY-MM-DD
    date_str = str(user.get('date_str') or user.get('approval_date') or user.get('joining_date') or '').strip()
    if not date_str or len(date_str) < 8:
        from datetime import datetime
        date_str = datetime.now().strftime('%Y-%m-%d')
    else:
        if '-' in date_str:
            parts = date_str.split('-')
            if len(parts) == 3 and len(parts[0]) == 2 and len(parts[2]) == 4:
                date_str = f"{parts[2]}-{parts[1]}-{parts[0]}"

    tnv_id = str(user.get('tnv_id') or '').strip()

    # Redactions (carefully isolated coordinates to prevent bleeding/overlap)
    # 1. Candidate Name line below "To,": Y in [186.4, 199.0]
    page.add_redact_annot(pymupdf.Rect(38.0, 186.4, 550.0, 199.0), fill=(1, 1, 1))

    # 2. Address Line 1: Y in [200.0, 214.0]
    page.add_redact_annot(pymupdf.Rect(38.0, 200.0, 550.0, 214.0), fill=(1, 1, 1))

    # 3. Address Line 2 (District line): Y in [215.0, 229.0]
    page.add_redact_annot(pymupdf.Rect(38.0, 215.0, 550.0, 229.0), fill=(1, 1, 1))

    # 4. Date value: leaves "Date: " intact, removes old date "2026-10-17"
    page.add_redact_annot(pymupdf.Rect(72.5, 230.0, 250.0, 244.0), fill=(1, 1, 1))

    # 5. Dear line: redact entire line Y in [274.0, 288.5] (stops before 289.4 to preserve 'ID No:')
    page.add_redact_annot(pymupdf.Rect(38.0, 274.0, 550.0, 288.5), fill=(1, 1, 1))

    # 6. ID No line: if tnv_id is provided, redact any existing text after "ID No:"
    if tnv_id:
        page.add_redact_annot(pymupdf.Rect(74.0, 289.4, 300.0, 306.0), fill=(1, 1, 1))

    page.apply_redactions()

    # Load Poppins fonts
    fonts_dir = os.path.join(base_dir, 'server', 'assets', 'letterhead', 'fonts')
    poppins_reg = os.path.join(fonts_dir, 'Poppins-Regular.ttf')
    poppins_bold = os.path.join(fonts_dir, 'Poppins-Bold.ttf')
    poppins_med = os.path.join(fonts_dir, 'Poppins-Medium.ttf')

    font_reg = pymupdf.Font(fontfile=poppins_reg)
    font_bold = pymupdf.Font(fontfile=poppins_bold)

    font_size = 11.9
    color = (0, 0, 0)

    # Line 1: Volunteer Name below "To," (baseline y = 197.0)
    page.insert_text(pymupdf.Point(39.20, 197.0), full_name, fontfile=poppins_reg, fontsize=font_size, color=color)

    # Line 2: Address line 1 (baseline y = 212.0)
    # Ensure it never exceeds single line width
    if font_reg.text_length(address_line1, fontsize=font_size) > 500:
        while len(address_line1) > 15 and font_reg.text_length(address_line1 + '...', fontsize=font_size) > 500:
            address_line1 = address_line1[:address_line1.rfind(' ') if ' ' in address_line1 else len(address_line1)-1].strip(' ,')
        address_line1 += '...'
    page.insert_text(pymupdf.Point(39.08, 212.0), address_line1, fontfile=poppins_reg, fontsize=font_size, color=color)

    # Line 3: District line ONLY (baseline y = 227.0)
    page.insert_text(pymupdf.Point(39.07, 227.0), address_line2, fontfile=poppins_reg, fontsize=font_size, color=color)

    # Line 4: Date value (baseline y = 242.0)
    page.insert_text(pymupdf.Point(73.79, 242.0), date_str, fontfile=poppins_reg, fontsize=font_size, color=color)

    # Line 5: Dear line: "Dear Mr/Ms " (Bold) + "Name," (Regular)
    prefix = f"Dear {salutation} "
    page.insert_text(pymupdf.Point(39.14, 287.0), prefix, fontfile=poppins_bold, fontsize=font_size, color=color)
    prefix_w = font_bold.text_length(prefix, fontsize=font_size)
    page.insert_text(pymupdf.Point(39.14 + prefix_w, 287.0), f"{full_name},", fontfile=poppins_reg, fontsize=font_size, color=color)

    # Line 6: ID No value in a slightly smaller, refined font size (9.8 pt) next to "ID No:"
    if tnv_id:
        id_font_file = poppins_med if os.path.exists(poppins_med) else poppins_reg
        page.insert_text(pymupdf.Point(76.5, 301.8), tnv_id, fontfile=id_font_file, fontsize=9.8, color=(0.1, 0.1, 0.1))

    doc.save(output_path)
    print(f"Appointment PDF generated successfully at: {output_path}")

if __name__ == '__main__':
    if len(sys.argv) > 2:
        out = sys.argv[1]
        try:
            u = json.loads(sys.argv[2])
        except Exception:
            u = {}
    elif len(sys.argv) == 2:
        out = sys.argv[1]
        u = {
            'full_name': 'Dhivakar B',
            'gender': 'male',
            'role': 'District President',
            'district_name': 'Cuddalore',
            'phone': '8610430800',
            'email': 'dhivakarb.aiml2025@citchennai.net',
            'tnv_id': 'TNV-CUD-0001',
            'address': '139,F,Block 5 ,Type 1 , Neyveli ,\n139,F',
            'date_str': '2026-10-28'
        }
    else:
        out = 'scratch/Tamil_Nadu_Volunteers_Appointment_Letter.pdf'
        u = {
            'full_name': 'Dhivakar B',
            'gender': 'male',
            'role': 'District President',
            'district_name': 'Cuddalore',
            'phone': '8610430800',
            'email': 'dhivakarb.aiml2025@citchennai.net',
            'tnv_id': 'TNV-CUD-0001',
            'address': '139,F,Block 5 ,Type 1 , Neyveli ,\n139,F',
            'date_str': '2026-10-28'
        }
    generate_appointment_pdf(out, u)
