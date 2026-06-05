// ─── Config ──────────────────────────────────────────────────────────────
const TEST_MODE = false;                           // ⚠️ flip to true to re-enable [TEST] banner/prefix
const TEST_ROWS = [12, 13];                        // rows to limit to in TEST_MODE (and used by sendRsvpQrTest)

const RSVP_SHEET_NAME = 'SeatingAssignment-QRCode'; // exact tab name (switch to prod responses tab for full send)
const CHECKIN_SHEET_NAME = 'Check-ins';

const COL = {
  TIMESTAMP: 1, NAME: 2, PHONE: 3, ATTENDEES: 4, EMAIL: 5,
  SEATING_TYPE: 6, KIDS: 7, ASSIGNED_ROW: 8, SEAT_ASSIGNMENT: 9, QR: 10,
};

const EVENT_SUBJECT = TEST_MODE
  ? '[TEST] Your Ticket — Vid. Sri Abhishek Raghuram Concert, June 7'
  : 'Your Ticket — Vid. Sri Abhishek Raghuram Concert, June 7';

// Zelle recipient — change to the actual Zelle-registered email/phone.
const ZELLE_RECIPIENT = 'raagasudhasabha@gmail.com';

// ─── Web app entry point ─────────────────────────────────────────────────

function doGet(e) {
  ensureCheckinSheet();

  if (e && e.parameter && e.parameter.action) {
    return handleApi_(e.parameter);
  }

  return HtmlService.createHtmlOutputFromFile('checkin')
    .setTitle(TEST_MODE ? 'Concert Check-in [TEST]' : 'Concert Check-in')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  ensureCheckinSheet();
  return handleApi_(e && e.parameter ? e.parameter : {});
}

function handleApi_(p) {
  const action = String(p.action || '').toLowerCase();
  let result;
  try {
    if (action === 'status') {
      result = getStatus(p.email);
    } else if (action === 'stats') {
      result = getStats();
    } else if (action === 'checkin') {
      result = recordCheckin(
        p.email,
        Number(p.count) || 1,
        p.override === 'true' || p.override === '1',
        p.notes || ''
      );
    } else {
      result = { ok: false, message: `Unknown action: ${action}` };
    }
  } catch (err) {
    result = { ok: false, message: String((err && err.message) || err) };
  }

  if (p.callback) {
    const safe = String(p.callback).replace(/[^a-zA-Z0-9_$]/g, '');
    return ContentService.createTextOutput(safe + '(' + JSON.stringify(result) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json_(result);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Sheet helpers ───────────────────────────────────────────────────────

function rsvpSheet_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(RSVP_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Tab "${RSVP_SHEET_NAME}" not found. Check the spelling in RSVP_SHEET_NAME.`);
  }
  return sheet;
}

function ensureCheckinSheet() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(CHECKIN_SHEET_NAME);
  if (sheet) return sheet;

  sheet = ss.insertSheet(CHECKIN_SHEET_NAME);
  const headers = [
    'Scan Timestamp', 'Email', 'Name',
    'People In (this scan)', 'Party Size',
    'Seat Assignment', 'Override', 'Notes',
  ];
  sheet.appendRow(headers);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length)
       .setFontWeight('bold').setBackground('#6B1F2A').setFontColor('#F4ECDD');
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 220);
  sheet.setColumnWidth(3, 180);
  sheet.setColumnWidth(6, 180);
  return sheet;
}

function testRowEmails_() {
  const rsvp = rsvpSheet_();
  return TEST_ROWS
    .map(row => String(rsvp.getRange(row, COL.EMAIL).getValue()).toLowerCase().trim())
    .filter(e => e);
}

// ─── Check-in lookup + record ────────────────────────────────────────────

function getStatus(scanned) {
  const needle = String(scanned || '').toLowerCase().trim();
  if (!needle) return { found: false, message: 'Empty scan' };

  if (TEST_MODE) {
    const allowed = testRowEmails_();
    if (!allowed.includes(needle)) {
      return {
        found: false,
        message: `TEST MODE — only rows ${TEST_ROWS.join(', ')} can be checked in (${allowed.join(', ')}).`,
        scanned,
      };
    }
  }

  const rsvp = rsvpSheet_();
  const lastRow = rsvp.getLastRow();
  if (lastRow < 2) return { found: false, message: 'No registrants in sheet' };

  const data = rsvp.getRange(2, 1, lastRow - 1, COL.QR).getValues();
  const match = data.find(r => String(r[COL.EMAIL - 1]).toLowerCase().trim() === needle);
  if (!match) return { found: false, message: 'Not in registration list', scanned };

  const email           = match[COL.EMAIL - 1];
  const name            = match[COL.NAME - 1] || 'Guest';
  const partySize       = Math.max(1, Number(match[COL.ATTENDEES - 1]) || 1);
  const seatAssignment  = match[COL.SEAT_ASSIGNMENT - 1] || '';
  const seatingType     = match[COL.SEATING_TYPE - 1] || '';
  const phone           = match[COL.PHONE - 1] || '';

  const log = ensureCheckinSheet();
  const logLastRow = log.getLastRow();
  let alreadyIn = 0;
  const prior = [];
  if (logLastRow >= 2) {
    log.getRange(2, 1, logLastRow - 1, 7).getValues().forEach(r => {
      if (String(r[1]).toLowerCase().trim() === needle) {
        const n = Number(r[3]) || 0;
        alreadyIn += n;
        prior.push({
          time: Utilities.formatDate(new Date(r[0]), Session.getScriptTimeZone(), "h:mm a"),
          count: n,
          override: !!r[6],
        });
      }
    });
  }

  const remaining = Math.max(0, partySize - alreadyIn);
  let state;
  if (alreadyIn === 0)    state = 'new';
  else if (remaining > 0) state = 'partial';
  else                    state = 'full';

  return {
    found: true, state,
    email, name, phone, partySize, alreadyIn, remaining,
    seatAssignment, seatingType, prior,
    suggestion: remaining > 0 ? remaining : 1,
  };
}

function recordCheckin(email, count, override, notes) {
  const status = getStatus(email);
  if (!status.found) return { ok: false, message: status.message || 'Email not found' };

  const n = Math.max(1, Math.floor(Number(count) || 1));
  if (n > status.remaining && !override) {
    return {
      ok: false,
      message: `Would exceed party size (${status.alreadyIn + n} > ${status.partySize}). Tick Override to allow.`,
    };
  }

  ensureCheckinSheet().appendRow([
    new Date(), email, status.name, n, status.partySize,
    status.seatAssignment, override ? 'YES' : '', notes || '',
  ]);

  const updated = getStatus(email);
  return {
    ok: true,
    message: `Checked in ${n} for ${status.name}`,
    name: status.name,
    seatAssignment: status.seatAssignment,
    partySize: status.partySize,
    nowCheckedIn: updated.alreadyIn,
    remaining: updated.remaining,
  };
}

// ─── Live stats ──────────────────────────────────────────────────────────

function getStats() {
  const log = ensureCheckinSheet();
  const logLast = log.getLastRow();
  let attendeesIn = 0;
  const partiesIn = new Set();
  if (logLast >= 2) {
    log.getRange(2, 1, logLast - 1, 4).getValues().forEach(r => {
      attendeesIn += Number(r[3]) || 0;
      const e = String(r[1]).toLowerCase().trim();
      if (e) partiesIn.add(e);
    });
  }

  const rsvp = rsvpSheet_();
  const rsvpLast = rsvp.getLastRow();
  let expected = 0, parties = 0;
  if (rsvpLast >= 2) {
    rsvp.getRange(2, COL.ATTENDEES, rsvpLast - 1, 1).getValues().forEach(r => {
      const n = Number(r[0]) || 0;
      if (n > 0) { expected += n; parties++; }
    });
  }

  return { attendeesIn, partiesIn: partiesIn.size, expected, parties, testMode: TEST_MODE };
}

// ─── Email sending ───────────────────────────────────────────────────────

function sendRsvpQrTest() {
  let sent = 0, errors = [];
  TEST_ROWS.forEach(row => {
    try {
      sendRsvpEmail_(row);
      sent++;
      Utilities.sleep(400);
    } catch (e) {
      errors.push(`Row ${row}: ${e.message}`);
    }
  });
  Logger.log(`Test send — sent: ${sent}, skipped: ${errors.length}`);
  errors.forEach(e => Logger.log(e));
  return { sent, skipped: errors.length, errors };
}

function sendAllRsvpEmails() {
  if (TEST_MODE) {
    Logger.log(`⚠️ TEST_MODE on — sending only to rows ${TEST_ROWS.join(', ')}.`);
    return sendRsvpQrTest();
  }

  const rsvp = rsvpSheet_();
  const lastRow = rsvp.getLastRow();
  if (lastRow < 2) return { sent: 0, skipped: 0 };

  const quota = MailApp.getRemainingDailyQuota();
  Logger.log(`Daily email quota remaining: ${quota}`);
  if (lastRow - 1 > quota) {
    throw new Error(`Need to send ${lastRow - 1} emails but only ${quota} left in today's quota. Send in batches.`);
  }

  let sent = 0, skipped = 0, errors = [];
  for (let r = 2; r <= lastRow; r++) {
    try {
      sendRsvpEmail_(r);
      sent++;
      Utilities.sleep(400);
    } catch (e) {
      skipped++;
      errors.push(`Row ${r}: ${e.message}`);
    }
  }
  Logger.log(`Sent: ${sent} · Skipped: ${skipped}`);
  errors.forEach(e => Logger.log(e));
  return { sent, skipped, errors };
}

// ─── Batched send (use to work around the 100/day Gmail quota) ───────────
// Edit BATCH_START / BATCH_END, then run sendRsvpEmailsBatch().
// Example: today  → BATCH_START = 2,  BATCH_END = 91   (90 emails)
//          tomorrow → BATCH_START = 92, BATCH_END = 180 (89 emails)
const BATCH_START = 92;
const BATCH_END   = 180;

// ─── Send to a specific list of rows ─────────────────────────────────────
// Edit ROWS_TO_SEND, then run sendSelectedRows().
const ROWS_TO_SEND = [32, 67];

function sendSelectedRows() {
  if (TEST_MODE) {
    throw new Error('TEST_MODE is on. Set TEST_MODE = false before running sendSelectedRows.');
  }
  let sent = 0, errors = [];
  ROWS_TO_SEND.forEach(row => {
    try {
      sendRsvpEmail_(row);
      sent++;
      Utilities.sleep(400);
    } catch (e) {
      errors.push(`Row ${row}: ${e.message}`);
    }
  });
  Logger.log(`sendSelectedRows — sent: ${sent}, skipped: ${errors.length}`);
  errors.forEach(e => Logger.log(e));
  return { sent, skipped: errors.length, errors };
}

function sendRsvpEmailsBatch() {
  if (TEST_MODE) {
    throw new Error('TEST_MODE is on. Set TEST_MODE = false before running a batch send.');
  }
  return sendRsvpEmailsRange(BATCH_START, BATCH_END);
}

function sendRsvpEmailsRange(startRow, endRow) {
  const rsvp = rsvpSheet_();
  const lastRow = rsvp.getLastRow();
  const start = Math.max(2, Number(startRow) || 2);
  const end   = Math.min(lastRow, Number(endRow) || lastRow);
  if (end < start) return { sent: 0, skipped: 0, errors: [`Empty range: ${start}..${end}`] };

  const need  = end - start + 1;
  const quota = MailApp.getRemainingDailyQuota();
  Logger.log(`Range rows ${start}..${end} (${need} emails). Daily quota remaining: ${quota}.`);
  if (need > quota) {
    throw new Error(`Need ${need} emails but only ${quota} left in today's quota. Shrink the range.`);
  }

  let sent = 0, skipped = 0, errors = [];
  for (let r = start; r <= end; r++) {
    try {
      sendRsvpEmail_(r);
      sent++;
      Utilities.sleep(400);
    } catch (e) {
      skipped++;
      errors.push(`Row ${r}: ${e.message}`);
    }
  }
  Logger.log(`Range ${start}..${end} — Sent: ${sent} · Skipped: ${skipped}`);
  errors.forEach(e => Logger.log(e));
  return { sent, skipped, errors };
}

function sendRsvpEmail_(row) {
  const rsvp = rsvpSheet_();
  const d = rsvp.getRange(row, 1, 1, COL.QR).getValues()[0];
  const fullName       = d[COL.NAME - 1] || 'Guest';
  const attendees      = d[COL.ATTENDEES - 1] || 1;
  const email          = d[COL.EMAIL - 1];
  const seatingType    = d[COL.SEATING_TYPE - 1] || '';
  const seatAssignment = d[COL.SEAT_ASSIGNMENT - 1] || '';
  if (!email) throw new Error(`No email at ${RSVP_SHEET_NAME}!E${row}`);

  Logger.log(`Sending to: "${email}"  (tab: ${RSVP_SHEET_NAME}, row ${row}, name: ${fullName})`);

  const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(email)}&size=400&ecLevel=H&margin=2`;
  const qrBlob = UrlFetchApp.fetch(qrUrl).getBlob().setName('rsvp-qr.png');

  const firstName = firstNameOf_(fullName);
  const seat = parseSeat_(seatAssignment);

  MailApp.sendEmail({
    to: email,
    subject: EVENT_SUBJECT,
    name: 'Raaga Sudha Sabha',
    replyTo: 'info@raagasudhasabha.org',
    htmlBody: rsvpEmailHtml_({
      firstName, attendees, seatingType,
      row: seat.row, seat: seat.seat,
    }),
    inlineImages: { qrcode: qrBlob },
  });
}

// ─── Helpers used by the email template ─────────────────────────────────

function firstNameOf_(fullName) {
  const parts = String(fullName || 'Guest').trim().split(/\s+/);
  return parts[0] || 'Guest';
}

function parseSeat_(seatAssignment) {
  const s = String(seatAssignment || '');
  const m = s.match(/Row:\s*(\S+)\s*Seat:\s*(.+)$/i);
  if (m) return { row: m[1].trim(), seat: m[2].trim() };
  return { row: '?', seat: '?' };
}

function escapeHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Email HTML template ────────────────────────────────────────────────

function rsvpEmailHtml_({ firstName, attendees, seatingType, row, seat }) {
  const fn  = escapeHtml_(firstName);
  const att = escapeHtml_(attendees);
  const stp = escapeHtml_(seatingType);
  const r   = escapeHtml_(row);
  const s   = escapeHtml_(seat);
  const z   = escapeHtml_(ZELLE_RECIPIENT);

  const testBanner = TEST_MODE
    ? `<tr>
         <td style="background:#FFF8E1;border-left:4px solid #F57F17;padding:12px 20px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5D4037;">
           <strong>This is a TEST email.</strong> Sent during setup; not all registrants have been emailed yet.
         </td>
       </tr>` : '';

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:0;background-color:#FBF7EF;">
  <tr>
    <td align="center" style="padding:24px 12px;">

      <!-- Card -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #ECE3D2;font-family:Georgia,'Times New Roman',serif;">

        ${testBanner}

        <!-- Header -->
        <tr>
          <td style="background-color:#7B1E1E;padding:22px 28px;text-align:center;">
            <div style="font-size:22px;font-weight:bold;color:#F6E7C1;letter-spacing:0.5px;">Raaga Sudha Sabha</div>
            <div style="font-size:12px;color:#E9C97F;margin-top:4px;letter-spacing:2px;text-transform:uppercase;">Your Concert Ticket</div>
          </td>
        </tr>

        <!-- Greeting + confirmation -->
        <tr>
          <td style="padding:28px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;color:#333333;">
            <p style="margin:0 0 12px 0;font-size:16px;">Dear <strong>Rasika</strong>,</p>
            <p style="margin:0;font-size:15px;line-height:1.6;color:#444444;">We&rsquo;re delighted to welcome you to our Grand Inaugural Concert. Your registration is complete and your RSVP is <strong style="color:#1E7B3C;">confirmed</strong> &mdash; this email, along with the QR Code below, is your ticket. We look forward to sharing this special evening of music with you.</p>
          </td>
        </tr>

        <!-- Event details -->
        <tr>
          <td style="padding:20px 28px 4px 28px;font-family:Arial,Helvetica,sans-serif;color:#333333;">
            <div style="font-size:18px;font-weight:bold;color:#7B1E1E;line-height:1.35;">Grand Inaugural Concert<br>Vid. Sri Abhishek Raghuram</div>
            <div style="font-size:15px;margin-top:10px;color:#444444;line-height:1.6;">
              Sunday, June 7, 2026 &middot; 4:00 PM PDT<br>
              Lakireddy Hall, Livermore Hindu Temple<br>
              1232 Arrowhead Ave., Livermore CA 94551
            </div>
          </td>
        </tr>

        <!-- Seat box -->
        <tr>
          <td style="padding:22px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FBF1DA;border:2px solid #C9A227;border-radius:10px;">
              <tr>
                <td style="padding:18px 22px;font-family:Arial,Helvetica,sans-serif;text-align:center;">
                  <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#8A6D1E;font-weight:bold;">Your Seating</div>
                  <div style="margin-top:10px;font-size:30px;font-weight:bold;color:#7B1E1E;line-height:1.2;">
                    Row ${r} &nbsp;&middot;&nbsp; Seat ${s}
                  </div>
                  <div style="margin-top:10px;font-size:14px;color:#5a4a2a;">
                    Attendees: <strong>${att}</strong> &nbsp;|&nbsp; ${stp}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- QR -->
        <tr>
          <td style="padding:4px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;text-align:center;color:#444444;">
            <p style="margin:0 0 14px 0;font-size:14px;line-height:1.5;">Please have this QR Code ready to show at check-in &mdash; a volunteer will scan it to welcome you in.</p>
            <img src="cid:qrcode" alt="Your entry QR code" width="180" height="180" style="display:inline-block;border:1px solid #ECE3D2;border-radius:8px;padding:8px;background:#ffffff;">
            <p style="margin:14px 0 0 0;font-size:13px;line-height:1.5;color:#7B1E1E;font-style:italic;">Kindly let us know if you are no longer attending so we can allocate your seat to a waitlisted Rasika.</p>
          </td>
        </tr>

        <!-- Special instructions -->
        <tr>
          <td style="padding:18px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF8F8;border-left:4px solid #7B1E1E;border-radius:6px;">
              <tr>
                <td style="padding:16px 20px;font-family:Arial,Helvetica,sans-serif;color:#444444;">
                  <div style="font-size:14px;font-weight:bold;color:#7B1E1E;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">A Few Things to Know Before You Arrive</div>
                  <p style="margin:0 0 10px 0;font-size:14px;line-height:1.6;">
                    <strong>Arrival window:</strong> Check-in opens at <strong>3:30 PM.</strong> Our front lobby has limited space, so we warmly request that you arrive <strong>no earlier than 3:30 PM and no later than 4:00 PM.</strong>
                  </p>
                  <p style="margin:0 0 10px 0;font-size:14px;line-height:1.6;">
                    <strong>Food:</strong> Please note that <strong>no food is permitted</strong> inside the auditorium.
                  </p>
                  <p style="margin:0 0 10px 0;font-size:14px;line-height:1.6;">
                    <strong>What to wear:</strong> Please dress comfortably and appropriately for the weather.
                  </p>
                  <p style="margin:0;font-size:14px;line-height:1.6;">
                    <strong>Running late?</strong> Not to worry. So we don&rsquo;t interrupt the artist or fellow guests, <strong>latecomers will be seated in between performances.</strong> Please wait at the entrance and a volunteer will guide you to your seat at the next break.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Donation -->
        <tr>
          <td style="padding:8px 28px 24px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#7B1E1E;border-radius:10px;">
              <tr>
                <td style="padding:22px 24px;font-family:Arial,Helvetica,sans-serif;text-align:center;color:#F6E7C1;">
                  <div style="font-size:16px;font-weight:bold;color:#F6E7C1;margin-bottom:8px;">Help us bring more music to our community</div>
                  <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:#EBD7AE;">
                    Raaga Sudha Sabha is a volunteer-run non-profit, and evenings like this are made possible entirely by the generosity of our community. If you&rsquo;d love to see more concerts and festivities like this one, we&rsquo;d be truly grateful for your support &mdash; every contribution helps us welcome more artists to our stage.
                  </p>
                  <div style="font-size:18px;font-weight:bold;color:#F6E7C1;margin-bottom:10px;">Send via Zelle to:</div>
                  <div style="display:inline-block;background-color:#C9A227;color:#3a2a08;font-size:22px;font-weight:bold;padding:14px 28px;border-radius:6px;letter-spacing:0.3px;">
                    raagasudhasabha@gmail.com
                  </div>
                  <div style="margin-top:14px;font-size:13px;color:#D8C290;line-height:1.5;">
                    Open the Zelle feature in your bank&rsquo;s mobile app and send to this email.
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>


        <!-- Footer -->
        <tr>
          <td style="background-color:#F3ECDD;padding:18px 28px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
            <p style="margin:0;font-size:13px;color:#6b6256;line-height:1.5;">
              Have a question? We&rsquo;re happy to help &mdash; simply reply to this email or write to
              <a href="mailto:info@raagasudhasabha.org" style="color:#7B1E1E;text-decoration:none;font-weight:bold;">info@raagasudhasabha.org</a>. We can&rsquo;t wait to see you there!
            </p>
            <p style="margin:8px 0 0 0;font-size:12px;color:#9b9486;">Raaga Sudha Sabha &middot; San Ramon, CA</p>
          </td>
        </tr>

      </table>
      <!-- /Card -->

    </td>
  </tr>
</table>`;
}
