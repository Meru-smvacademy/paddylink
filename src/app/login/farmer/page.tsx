import type { Metadata } from 'next';
import FarmerOtp from '@/components/FarmerOtp';

export const metadata: Metadata = {
  title: 'ರೈತ ಪ್ರವೇಶ / Farmer login — PaddyLink',
  description: 'ನಿಮ್ಮ ಮೊಬೈಲ್ ನಂಬರ್ ಮತ್ತು OTP ಮೂಲಕ ಪ್ರವೇಶಿಸಿ.',
};

export default function LoginFarmerPage() {
  return <FarmerOtp />;
}
