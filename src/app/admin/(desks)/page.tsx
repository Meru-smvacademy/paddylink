import { redirect } from 'next/navigation';
import { requireAdminPage } from '@/lib/adminAuth';
import { adminLanding } from '@/lib/adminSession';

/* /admin has no content of its own — it forwards each role to its own front
   door (admin → KYC desk, staff → quality desk). The proxy has already
   bounced unauthenticated visitors to login. */
export default async function AdminIndex() {
  const role = await requireAdminPage();
  redirect(adminLanding(role));
}
