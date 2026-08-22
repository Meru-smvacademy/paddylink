import type { Metadata } from 'next';
import OtpFlow from '@/components/OtpFlow';

export const metadata: Metadata = {
  title: 'ಖರೀದಿದಾರ ಪ್ರವೇಶ / Buyer login — PaddyLink',
  description: 'ನಿಮ್ಮ ಮೊಬೈಲ್ ನಂಬರ್ ಮತ್ತು OTP ಮೂಲಕ ಪ್ರವೇಶಿಸಿ.',
};

export default function LoginBuyerPage() {
  return <OtpFlow door="buyer" />;
}
