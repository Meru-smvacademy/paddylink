import { redirect } from 'next/navigation';

/* /admin has no content of its own — the KYC desk is the portal's front
   door. The proxy has already bounced unauthenticated visitors to login. */
export default function AdminIndex() {
  redirect('/admin/buyers');
}
