// The trust's tax and bank details, printed on receipts and shown on verification
// pages. One place for them, so receipts, emails and pages always agree.
//
// Set them in the environment (Vercel → Settings → Environment Variables) to change
// them without a code change. The defaults are the values the portal used before.
// NOTE: an 80G registration number normally begins with the trust's PAN; the two
// defaults below do not match each other, so confirm both with the trust's
// auditor and set ORG_TRUST_PAN / ORG_80G_REG.

const env = process.env;

module.exports = {
  TRUST_NAME: env.ORG_TRUST_NAME || 'TAMILNADU VOLUNTEERS TRUST',
  TRUST_PAN: env.ORG_TRUST_PAN || 'AAETT5126E',
  REG_80G: env.ORG_80G_REG || 'AAATT4509NF20214',
  TAX_BENEFIT: 'Eligible for 50% deduction under Section 80G of the Income Tax Act, 1961',
  UPI_VPA: env.ORG_UPI_VPA || '9791126662.1@hdfc',
  BANK: env.ORG_BANK || 'HDFC Bank, CIT Nagar, Chennai',
  WEBSITE: env.ORG_WEBSITE || 'www.tamilnaduvolunteers.org'
};
