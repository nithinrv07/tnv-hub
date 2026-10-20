/**
 * TNV Hub Portal - Transactional Email Service
 * Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Sections 3, 6.1 Step 7)
 * 
 * Rules:
 * - Welcome email contains username and login link ONLY.
 * - NEVER contains the password.
 * - Email sending failure is logged and does NOT roll back registration.
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = Deno?.env?.get('RESEND_API_KEY') || process?.env?.RESEND_API_KEY;
  const fromEmail = Deno?.env?.get('EMAIL_FROM') || process?.env?.EMAIL_FROM || 'TNV Portal <noreply@tnvportal.org>';

  // If no Resend API key configured, run in mock / demo logging mode
  if (!apiKey || apiKey.startsWith('re_your_api_key')) {
    console.log(`[EMAIL MOCK SENDER] To: ${to} | Subject: "${subject}"`);
    console.log(`[EMAIL MOCK CONTENT]\n${text || html}\n----------------------`);
    return { success: true, id: `mock-email-${Date.now()}` };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: subject,
        html: html,
        text: text,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`Resend API error (${response.status}):`, errBody);
      return { success: false, error: errBody };
    }

    const data = await response.json();
    return { success: true, id: data.id };
  } catch (err: any) {
    console.error('Failed to send email:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends the Step 3 Welcome Email to a newly registered applicant.
 * Spec rule: Username and login link only. NEVER password.
 */
export async function sendWelcomeEmail(email: string, username: string, fullName: string): Promise<boolean> {
  const portalUrl = Deno?.env?.get('PORTAL_URL') || process?.env?.PORTAL_URL || 'https://portal.tnv.org';
  const loginUrl = `${portalUrl}/login`;

  const subject = 'Welcome to TNV Hub Portal - Registration Received';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a; margin-top: 0;">Welcome to TNV Hub Portal</h2>
      <p>Dear <strong>${fullName}</strong>,</p>
      <p>Thank you for submitting your volunteer registration with the TNV Hub. Your application is currently under review by our administrative team.</p>
      <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #475569;">Your Registered Username:</p>
        <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold; color: #0f172a;">${username}</p>
      </div>
      <p>You can check your application status at any time by logging in to the portal with your username and password:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Log in to Portal</a>
      </p>
      <p style="font-size: 13px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        For your security, your password is encrypted and never sent via email. If you did not create this account, please contact TNV Admin immediately.
      </p>
    </div>
  `;

  const text = `Welcome to TNV Hub Portal\n\nDear ${fullName},\n\nYour volunteer registration has been received and is under review.\n\nYour Username: ${username}\nLogin URL: ${loginUrl}\n\nFor security reasons, your password is never sent via email.`;

  const result = await sendEmail({ to: email, subject, html, text });
  return result.success;
}
