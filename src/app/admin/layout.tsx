import type { Metadata } from 'next';

/**
 * /admin root layout — metadata only. The desk chrome lives in the (desks)
 * group layout; /admin/login renders the full-screen CEO-approved frame with
 * no chrome at all.
 */

export const metadata: Metadata = {
  title: 'PaddyLink Admin',
  // Never in a search index; the proxy also sets X-Robots-Tag on every
  // /admin response. Nothing public links here.
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
