/**
 * Neat Nest & Nourish — lead handler (Cloudflare Pages Function)
 * Route: /api/lead
 *
 * The Neat Nest site is hosted on SHOPIFY; this endpoint is the Resend relay it
 * POSTs to (cross-origin), so it returns JSON + CORS instead of redirecting.
 * Adapted from the ShopMora reference (Purrap / Rick's).
 *
 * RULES (unchanged from the reference):
 *  - NEVER fake success. A failed send returns success:false + an error, sets
 *    X-Lead-Error, and logs. A lost lead must be loud.
 *  - Cloudflare edge trap: a Pages Function returning any 5xx has its body/headers
 *    REPLACED by Cloudflare's generic page. So upstream mail failures return 424
 *    (Failed Dependency) — 4xx passes through untouched.
 *
 * Env (Cloudflare Pages > Settings > Variables and secrets):
 *   RESEND_API_KEY (Secret), LEAD_TO, LEAD_FROM
 */

const ALLOWED_ORIGINS = [
  'https://neatnestnourish.com',
  'https://www.neatnestnourish.com',
  'https://x5mmee-ha.myshopify.com'
];

const FORMS = {
  estimate: {
    required: ['name', 'email'],
    subject: function (d) {
      return 'New estimate request — ' + (d.name || 'Website') + (d.service ? ' (' + d.service + ')' : '');
    },
    auto: true,
    autoSubject: 'Thank you from Neat Nest & Nourish',
    autoBody: function (d) {
      return 'Hi ' + (d.name || 'there') + ',\n\n' +
        'Thank you for your interest in Neat Nest & Nourish. We have your estimate request and will ' +
        'reply personally, usually within one business day.\n\n' +
        'For anything urgent, call or text 774-234-7307.\n\n' +
        '— Neat Nest & Nourish\nneatnestnourish.com';
    }
  },
  review: {
    required: ['reviewer', 'review', 'rating'],
    subject: function (d) {
      return 'New review (' + (d.rating || '') + ') — ' + (d.reviewer || 'Anonymous');
    },
    auto: false,
    lead: 'This review was submitted from the website and is NOT published. Reply to approve before adding it to the Reviews section.'
  }
};

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s == null ? '' : s).trim());
}
function cors(origin) {
  var h = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
  if (origin && ALLOWED_ORIGINS.indexOf(origin) !== -1) h['Access-Control-Allow-Origin'] = origin;
  return h;
}
function json(body, status, origin, detail) {
  var headers = Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, cors(origin));
  if (detail) headers['X-Lead-Error'] = String(detail).replace(/[\r\n]+/g, ' ').slice(0, 300);
  return new Response(JSON.stringify(body), { status: status, headers: headers });
}

async function sendViaResend(env, payload) {
  var res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  var text = await res.text();
  if (!res.ok) throw new Error('Resend ' + res.status + ': ' + text.slice(0, 200));
  return text;
}

export function onRequestOptions(context) {
  var origin = context.request.headers.get('Origin');
  return new Response(null, { status: 204, headers: cors(origin) });
}

export async function onRequestPost(context) {
  var origin = context.request.headers.get('Origin');
  try {
    var env = context.env || {};
    if (!env.RESEND_API_KEY || !env.LEAD_TO || !env.LEAD_FROM) {
      return json({ success: false, error: 'Our form is misconfigured on our end.' }, 424, origin, 'missing RESEND_API_KEY / LEAD_TO / LEAD_FROM');
    }

    var data;
    try {
      var ct = context.request.headers.get('content-type') || '';
      data = ct.indexOf('application/json') !== -1
        ? await context.request.json()
        : Object.fromEntries(await context.request.formData());
    } catch (e) {
      return json({ success: false, error: 'We could not read that submission.' }, 400, origin, 'parse: ' + e.message);
    }

    // Honeypot — pretend success, send nothing.
    if (String(data._honey || '').trim()) return json({ success: true }, 200, origin);

    var form = FORMS[data._form] || FORMS.estimate;

    var missing = form.required.filter(function (f) { return !String(data[f] == null ? '' : data[f]).trim(); });
    if (missing.length) return json({ success: false, error: 'Please fill in: ' + missing.join(', ') + '.' }, 400, origin, 'missing: ' + missing.join(','));
    if (form.required.indexOf('email') !== -1 && !isEmail(data.email)) {
      return json({ success: false, error: 'That email address does not look right.' }, 400, origin, 'bad email');
    }

    var clean = {};
    Object.keys(data).forEach(function (k) { if (k.charAt(0) !== '_') clean[k] = data[k]; });

    // --- the notification IS the lead ---
    try {
      var rows = Object.keys(clean).map(function (k) {
        return '<tr><td style="padding:8px 14px;border:1px solid #d9cdb8;font-weight:600;text-transform:capitalize">' +
          esc(k.replace(/_/g, ' ')) + '</td><td style="padding:8px 14px;border:1px solid #d9cdb8">' + esc(clean[k]) + '</td></tr>';
      }).join('');
      await sendViaResend(env, {
        from: env.LEAD_FROM,
        to: [env.LEAD_TO],
        reply_to: isEmail(data.email) ? String(data.email).trim() : env.LEAD_TO,
        subject: form.subject(data),
        html: '<div style="font-family:system-ui,sans-serif;color:#1e2417">' +
          (form.lead ? '<p style="color:#9b5c38;font-weight:600">' + esc(form.lead) + '</p>' : '') +
          '<h2 style="font-family:Georgia,serif">New ' + esc(data._form || 'estimate') + ' submission</h2>' +
          '<table style="border-collapse:collapse;margin:16px 0">' + rows + '</table>' +
          '<p style="color:#6b6357;font-size:12px">' + esc(new Date().toISOString()) + '</p></div>'
      });
    } catch (e) {
      console.error('lead: NOTIFICATION FAILED', e && e.message);
      return json({ success: false, error: 'We could not deliver that just now.' }, 424, origin, e && e.message);
    }

    // --- autoresponse: courtesy only, never blocks the lead ---
    if (form.auto && isEmail(data.email)) {
      try {
        await sendViaResend(env, {
          from: env.LEAD_FROM,
          to: [String(data.email).trim()],
          reply_to: env.LEAD_TO,
          subject: form.autoSubject,
          text: form.autoBody(data)
        });
      } catch (e) {
        console.error('lead: AUTORESPONSE FAILED (lead still captured)', e && e.message);
      }
    }

    return json({ success: true }, 200, origin);
  } catch (e) {
    console.error('lead: UNHANDLED', e && e.stack);
    return json({ success: false, error: 'Something broke on our end.' }, 424, origin, 'unhandled: ' + (e && e.message));
  }
}

export async function onRequestGet(context) {
  var url = new URL(context.request.url);
  if (url.searchParams.get('selftest') === '1') {
    var env = context.env || {};
    if (!env.RESEND_API_KEY || !env.LEAD_TO || !env.LEAD_FROM) {
      return new Response('SELFTEST FAIL: missing RESEND_API_KEY / LEAD_TO / LEAD_FROM', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    try {
      var out = await sendViaResend(env, {
        from: env.LEAD_FROM, to: [env.LEAD_TO],
        subject: 'Neat Nest lead endpoint self-test',
        text: 'Self-test OK at ' + new Date().toISOString()
      });
      return new Response('SELFTEST OK: ' + out, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    } catch (e) {
      return new Response('SELFTEST FAIL: ' + (e && e.message), { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
  }
  return new Response('Neat Nest lead endpoint is alive. POST only.', { status: 405, headers: { 'Content-Type': 'text/plain', Allow: 'POST' } });
}
