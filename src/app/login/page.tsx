import type { Metadata } from 'next';
import Login from '@/components/Login';

export const metadata: Metadata = {
  title: 'ಪ್ರವೇಶಿಸಿ / Login — PaddyLink',
  description:
    'Choose your door: farmers list paddy and see their listings; buyers browse listings and unlock contacts.',
};

export default function LoginPage() {
  return <Login />;
}
