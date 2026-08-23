import { NextResponse, type NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/adminAuth';
import { decideBuyerKyc } from '@/lib/adminKyc';

/**
 * POST /admin/api/kyc — the KYC decision. Form-posted from the buyer detail
 * panel; redirects back to the desk so the whole flow works without client
 * JS.
 *
 * Fields: buyer_id (uuid) · decision ('approve' | 'reject') · reason
 * (required for reject — an internal note, never shown to the buyer).
 *
 * Auth: the proxy already gated /admin/api/*, and this handler checks the
 * session again itself. The service-role write happens only after both.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REASON = 500;

export async function POST(request: NextRequest) {
  // Admin-only decision — staff have no KYC authority. Re-checked here behind
  // the proxy gate.
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'expected_form_data' }, { status: 400 });
  }

  const buyerId = String(form.get('buyer_id') ?? '');
  const decision = String(form.get('decision') ?? '');
  const reason = String(form.get('reason') ?? '').trim();

  if (!UUID_RE.test(buyerId) || (decision !== 'approve' && decision !== 'reject')) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const back = (flash: string) =>
    NextResponse.redirect(
      new URL(`/admin/buyers?sel=${buyerId}&flash=${flash}`, request.url),
      303,
    );

  // The reject reason is REQUIRED — a rejection with no note is not a
  // reviewable decision. Enforced here, not just in the form.
  if (decision === 'reject' && reason.length === 0) return back('need_reason');
  if (reason.length > MAX_REASON) return back('reason_too_long');

  const result = await decideBuyerKyc(buyerId, decision, decision === 'reject' ? reason : null, {
    // Best-effort context for audit_log; absent locally, set by Vercel in prod.
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    userAgent: request.headers.get('user-agent'),
  });

  if (!result.ok) {
    console.error('[admin/kyc] decision failed:', result.error);
    return back('error');
  }
  return back(decision === 'approve' ? 'approved' : 'rejected');
}
