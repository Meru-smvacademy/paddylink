import type { Metadata } from 'next';
import OtpFlow from '@/components/OtpFlow';
import { getReferenceData } from '@/lib/reference';

export const metadata: Metadata = {
  title: 'ರೈತ ಪ್ರವೇಶ / Farmer login — PaddyLink',
  description: 'ನಿಮ್ಮ ಮೊಬೈಲ್ ನಂಬರ್ ಮತ್ತು OTP ಮೂಲಕ ಪ್ರವೇಶಿಸಿ.',
};

/* Reference data is read on the server so the listing form renders with its
   district, taluk and variety dropdowns already populated — no loading state
   in front of a farmer. It changes only when operations expand, so it is
   revalidated hourly rather than on every request. */
export const revalidate = 3600;

export default async function LoginFarmerPage() {
  const reference = await getReferenceData();
  return <OtpFlow door="farmer" reference={reference} />;
}
