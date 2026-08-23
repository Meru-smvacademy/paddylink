import { NextResponse, type NextRequest } from 'next/server';
import { isAdminSession } from '@/lib/adminAuth';
import { recordQualityCheck, SANE_MIN, SANE_MAX } from '@/lib/adminQuality';

/**
 * POST /admin/api/quality — record or edit a moisture check. Form-posted
 * from the quality desk panel; redirects back so the desk stays JS-free.
 *
 * Fields: listing_id (uuid) · moisture (0–99.9, one decimal) · checked_by
 * (required, ≤80) · checked_on (YYYY-MM-DD, today or earlier IST) ·
 * confirm_range ('1' required when moisture is outside 5.0–40.0).
 *
 * The out-of-range confirm is a server round-trip: the first attempt
 * bounces back with the typed values in the query string and the panel
 * re-renders with an explicit confirm checkbox.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MOISTURE_RE = /^\d{1,2}(\.\d)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NAME = 80;

/** Today's date in IST — the field team's clock, not the server's. */
function todayIst(): string {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

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
  const moistureRaw = String(form.get('moisture') ?? '').trim();
  const checkedBy = String(form.get('checked_by') ?? '').trim();
  const checkedOn = String(form.get('checked_on') ?? '').trim();
  const confirmRange = String(form.get('confirm_range') ?? '') === '1';

  if (!UUID_RE.test(listingId)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  // Bounce back to the panel, optionally carrying the typed values so a
  // validation failure never costs the field team a re-type.
  const back = (flash: string, keep = false) => {
    const params = new URLSearchParams({ sel: listingId, flash });
    if (keep) {
      params.set('m', moistureRaw);
      params.set('n', checkedBy);
      params.set('d', checkedOn);
    }
    return NextResponse.redirect(new URL(`/admin/quality?${params}`, request.url), 303);
  };

  if (!MOISTURE_RE.test(moistureRaw)) return back('bad_moisture', true);
  const moisture = Number(moistureRaw);

  if (checkedBy.length < 1 || checkedBy.length > MAX_NAME) return back('need_checker', true);

  if (!DATE_RE.test(checkedOn) || Number.isNaN(Date.parse(`${checkedOn}T00:00:00Z`))) {
    return back('bad_date', true);
  }
  const today = todayIst();
  if (checkedOn > today) return back('future_date', true);

  // Sane-range guard: outside 5.0–40.0 needs the explicit confirm tick.
  if ((moisture < SANE_MIN || moisture > SANE_MAX) && !confirmRange) {
    return back('confirm_range', true);
  }

  // Today's check carries the real moment; a backdated one is stored at
  // 12:00 IST so no timezone rendering can shift it onto another date.
  const checkedAtIso =
    checkedOn === today ? new Date().toISOString() : `${checkedOn}T12:00:00+05:30`;

  const result = await recordQualityCheck(listingId, moisture, checkedBy, checkedAtIso, {
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    userAgent: request.headers.get('user-agent'),
  });

  if (!result.ok) {
    console.error('[admin/quality] record failed:', result.error);
    return back(result.error === 'not_active' ? 'not_active' : 'error', true);
  }
  return back(result.overwrote ? 'updated' : 'recorded');
}
