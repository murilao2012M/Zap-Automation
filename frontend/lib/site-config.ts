const contactWhatsApp = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? "";
const legalEmail = process.env.NEXT_PUBLIC_LEGAL_EMAIL ?? "";
const demoUrl = process.env.NEXT_PUBLIC_DEMO_URL ?? "";

function normalizePhoneNumber(value: string): string {
  return value.replace(/[^\d]/g, "");
}

export function buildWhatsAppUrl(phoneNumber?: string, message?: string): string | null {
  if (!phoneNumber) return null;
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return null;

  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${normalized}${query}`;
}

export const sitePublicConfig = {
  contactWhatsApp,
  legalEmail,
  demoUrl,
};
