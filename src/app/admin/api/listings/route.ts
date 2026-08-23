import { NextResponse, type NextRequest } from 'next/server';
import { isAdminSession } from '@/lib/adminAuth';
import { decideListing } from '@/lib/adminListings';

/**
 * POST /admin/api/listings — the listing decision. Form-posted from the
 * listings desk; redirects back so the flow needs no client JS.
 *
 * Fields: listing_id (uuid) · decision ('approve' → active | 'reject' →
 * removed) · reason (required for reject — internal note into audit_log).
 *
 * Auth: proxy gate plus this handler's own session check, as everywhere in
 * /admin.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REASON = 500;

export async function POST(request: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'expected_form_data' }, { status: 400 });
  }

  const listingId = String(form.get('listing_id') ?? '');
  const decision = String(form.get('decision') ?? '');
  const reason = String(form.get('reason') ?? '').trim();

  if (!UUID_RE.test(listingId) || (decision !== 'approve' && decision !== 'reject')) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const back = (flash: string) =>
    NextResponse.redirect(
      new URL(`/admin/listings?sel=${listingId}&flash=${flash}`, request.url),
      303,
    );

  if (decision === 'reject' && reason.length === 0) return back('need_reason');
  if (reason.length > MAX_REASON) return back('reason_too_long');

  const result = await decideListing(
    listingId,
    decision,
    decision === 'reject' ? reason : null,
    {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      userAgent: request.headers.get('user-agent'),
    },
  );

  if (!result.ok) {
    console.error('[admin/listings] decision failed:', result.error);
    return back(result.error.startsWith('not_allowed_from_') ? 'not_allowed' : 'error');
  }
  return back(decision === 'approve' ? 'approved' : 'rejected');
}
