/**
 * Privacy check: what can the anon key actually read?
 *
 * The anon key ships inside the client bundle, so anything it can read is
 * public in practice. This asserts the privacy law:
 *
 *   anon may read ONLY public.listings_browse (and the non-personal
 *   reference schema, per CEO ruling).
 *   anon must have ZERO read access to the person-bearing tables.
 *
 * Read-only — writes nothing, and needs only the anon key.
 *
 *   node supabase/audit/verify-anon-access.mjs            # report
 *   node supabase/audit/verify-anon-access.mjs --json     # machine-readable
 *
 * Exit code 1 if the law is violated, so this can gate CI later.
 */

import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL_ || !ANON) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(2);
}

/** Person-bearing or internal: anon must never read these. */
const FORBIDDEN = [
  'farmers',
  'buyers',
  'buyer_documents',
  'unlocks',
  'audit_log',
  'otp_log',
  'payments',
  'token_ledger',
  'buyer_wallets',
  'listings',
  'config',
  'disputes',
  'listing_removals',
  'notification_queue',
  'notification_templates',
  'reconciliation_runs',
  'webhook_events',
];

/**
 * What anon is allowed to read: the masked listing view, plus the three
 * reference views (district / taluk / variety names — a map of Karnataka,
 * no personal data, per CEO ruling). Added by migration 005.
 */
const ALLOWED = ['listings_browse', 'ref_districts', 'ref_taluks', 'ref_varieties'];

async function probe(table) {
  const res = await fetch(`${URL_}/rest/v1/${table}?select=*`, {
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });
  const range = res.headers.get('content-range');
  const rows = range && range.includes('/') ? range.split('/')[1] : '0';
  // A Range header makes PostgREST answer 206 Partial Content on success.
  // Both 200 and 206 mean the anon role could read; only 401/403 is blocked.
  const readable = res.status === 200 || res.status === 206;
  return { table, status: res.status, readable, rowsVisible: rows === '*' ? 0 : Number(rows) };
}

const results = await Promise.all([...FORBIDDEN, ...ALLOWED].map(probe));
const byName = Object.fromEntries(results.map((r) => [r.table, r]));

const violations = [];
for (const t of FORBIDDEN) {
  const r = byName[t];
  // 401/403 means the privilege is gone — the desired end state.
  // 200 with 0 rows means RLS is filtering but the grant still stands.
  if (r.readable) {
    violations.push({
      table: t,
      severity: r.rowsVisible > 0 ? 'LEAKING DATA' : 'grant still present',
      rowsVisible: r.rowsVisible,
    });
  }
}
for (const t of ALLOWED) {
  if (!byName[t].readable) {
    violations.push({ table: t, severity: 'BROKEN — public browsing must work', rowsVisible: 0 });
  }
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ project: URL_, results, violations }, null, 2));
} else {
  console.log(`\nanon-access check against ${URL_}\n`);
  for (const r of results) {
    const allowed = ALLOWED.includes(r.table);
    const ok = allowed ? r.readable : !r.readable;
    const note = !r.readable
      ? 'blocked'
      : allowed
        ? `readable — ${r.rowsVisible} row(s), as intended`
        : r.rowsVisible > 0
          ? `readable — ${r.rowsVisible} ROW(S) EXPOSED`
          : 'grant present (RLS filtering)';
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${r.table.padEnd(24)} HTTP ${r.status}  ${note}`);
  }
  console.log(
    violations.length
      ? `\n${violations.length} violation(s):\n` +
          violations.map((v) => `  - ${v.table}: ${v.severity}`).join('\n') + '\n'
      : '\nPrivacy law holds: anon reads listings_browse and nothing else.\n',
  );
}

process.exit(violations.length ? 1 : 0);
