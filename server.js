// server.js — Express server for Render deployment
// Serves the static wedding site + handles /api/rsvp POST

const express    = require("express");
const nodemailer = require("nodemailer");
const path       = require("path");
const guests     = require("./data/guests.json");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Lowercase + collapse whitespace for loose name matching */
function normalize(str) {
  return str.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Find guest: exact match first, then loose contains match */
function findGuest(submittedName) {
  const norm  = normalize(submittedName);
  const exact = guests.find((g) => normalize(g.name) === norm);
  if (exact) return exact;
  return (
    guests.find(
      (g) =>
        norm.includes(normalize(g.name)) ||
        normalize(g.name).includes(norm)
    ) || null
  );
}

// ── Email HTML builders ───────────────────────────────────────────────────────

function hostEmailHTML({ guestName, email, attendance }) {
  const badge =
    attendance === "in-person"
      ? `<span style="background:#667686;color:#fff;padding:4px 14px;border-radius:20px;font-size:13px;">🏛️ In-Person</span>`
      : `<span style="background:#97adc2;color:#fff;padding:4px 14px;border-radius:20px;font-size:13px;">💻 Via Zoom</span>`;

  return `
<div style="font-family:'Inter',Arial,sans-serif;max-width:540px;margin:0 auto;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
  <div style="background:#667686;padding:28px 32px;text-align:center;">
    <h1 style="color:#fff;font-family:Georgia,serif;margin:0;font-size:26px;">New RSVP Received 💌</h1>
    <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Jet &amp; Jev — June 29, 2026</p>
  </div>
  <div style="padding:28px 32px;">
    <table style="width:100%;border-collapse:collapse;font-size:15px;">
      <tr>
        <td style="padding:10px 0;color:#878787;width:38%;">Guest Name</td>
        <td style="padding:10px 0;font-weight:600;color:#595d5c;">${guestName}</td>
      </tr>
      <tr style="border-top:1px solid #f0f0f0;">
        <td style="padding:10px 0;color:#878787;">Email</td>
        <td style="padding:10px 0;color:#595d5c;">${email}</td>
      </tr>
      <tr style="border-top:1px solid #f0f0f0;">
        <td style="padding:10px 0;color:#878787;">Attendance</td>
        <td style="padding:10px 0;">${badge}</td>
      </tr>
    </table>
  </div>
  <div style="background:#f8f9fa;padding:14px 32px;font-size:12px;color:#aaa;text-align:center;">
    Sent automatically from your wedding RSVP system.
  </div>
</div>`;
}

function guestConfirmEmailHTML({ guestName, attendance, table, category }) {
  const isInPerson = attendance === "in-person";
  const firstName  = guestName.split(" ")[0];

  const seatBlock = isInPerson
    ? `
    <div style="background:#f0f4f8;border-radius:10px;padding:22px 24px;margin:24px 0;text-align:center;">
      <p style="margin:0 0 6px;color:#878787;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your Assigned Seat</p>
      <p style="margin:0;font-family:Georgia,serif;font-size:36px;font-weight:700;color:#667686;">Table ${table || "TBA"}</p>
      ${category ? `<p style="margin:6px 0 0;color:#97adc2;font-size:13px;">${category}</p>` : ""}
      <div style="margin-top:18px;">
        <img
          src="https://placehold.co/480x280/e8eff5/667686?text=Seating+Chart+Preview%0A(Final+chart+coming+soon)"
          alt="Seating Chart" style="width:100%;border-radius:8px;border:1px solid #d1d1d1;">
        <p style="font-size:11px;color:#bbb;margin:8px 0 0;font-style:italic;">
          A finalised seating chart will be sent closer to the date.
        </p>
      </div>
    </div>`
    : `
    <div style="background:#f0f4f8;border-radius:10px;padding:22px 24px;margin:24px 0;text-align:center;">
      <p style="margin:0 0 8px;color:#878787;font-size:12px;text-transform:uppercase;letter-spacing:1px;">How to Join</p>
      <p style="margin:0;font-size:16px;color:#595d5c;">💻 You're joining <strong>via Zoom</strong>!</p>
      <p style="margin:10px 0 0;font-size:13px;color:#878787;">
        A Zoom link will be emailed to you before the event. Keep an eye on your inbox!
      </p>
    </div>`;

  return `
<div style="font-family:'Inter',Arial,sans-serif;max-width:540px;margin:0 auto;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
  <div style="background:#667686;padding:32px;text-align:center;">
    <p style="color:rgba(255,255,255,0.65);margin:0 0 8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;">You're Invited</p>
    <h1 style="color:#fff;font-family:Georgia,serif;margin:0;font-size:32px;">Jet &amp; Jev</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">June 29, 2026 • Maple Grove Manor, Manila</p>
  </div>
  <div style="padding:32px;">
    <h2 style="font-family:Georgia,serif;color:#667686;font-size:22px;margin:0 0 8px;">
      See you there, ${firstName}! 🎉
    </h2>
    <p style="color:#878787;font-size:15px;margin:0 0 20px;">
      Your RSVP has been confirmed. We're so excited to celebrate with you!
    </p>
    ${seatBlock}
    <div style="border-top:1px solid #f0f0f0;padding-top:20px;font-size:14px;color:#878787;line-height:1.9;">
      <p style="margin:0;">📅 <strong>Date:</strong> Monday, June 29, 2026</p>
      <p style="margin:0;">📍 <strong>Venue:</strong> Maple Grove Manor, 123 Garden Boulevard, Manila</p>
      <p style="margin:0;">⏰ <strong>Ceremony starts:</strong> 2:30 PM</p>
    </div>
  </div>
  <div style="background:#667686;padding:20px 32px;text-align:center;">
    <p style="color:rgba(255,255,255,0.9);font-family:Georgia,serif;font-style:italic;margin:0;font-size:15px;">
      "Made with love — Jev &amp; Jet"
    </p>
  </div>
</div>`;
}

function notOnListEmailHTML({ guestName }) {
  const firstName = guestName.split(" ")[0];
  return `
<div style="font-family:'Inter',Arial,sans-serif;max-width:540px;margin:0 auto;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
  <div style="background:#667686;padding:32px;text-align:center;">
    <h1 style="color:#fff;font-family:Georgia,serif;margin:0;font-size:28px;">Jet &amp; Jev</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">June 29, 2026 • Maple Grove Manor, Manila</p>
  </div>
  <div style="padding:32px;">
    <h2 style="font-family:Georgia,serif;color:#667686;font-size:20px;margin:0 0 16px;">
      Thank you for your RSVP, ${firstName}!
    </h2>
    <p style="color:#595d5c;font-size:15px;line-height:1.8;margin:0 0 14px;">
      We truly appreciate your warm wishes and the love you've shown for our special day. 💙
    </p>
    <p style="color:#595d5c;font-size:15px;line-height:1.8;margin:0 0 14px;">
      Unfortunately, we have a limited number of seats at our venue and our guest list has already been finalised. We hope you understand — this was a very difficult decision for us.
    </p>
    <p style="color:#595d5c;font-size:15px;line-height:1.8;margin:0;">
      We hope to celebrate with you another time soon. Your support and love mean everything to us!
    </p>
    <div style="background:#f8f9fa;border-radius:8px;padding:16px 20px;margin:24px 0;font-style:italic;color:#878787;font-size:14px;text-align:center;">
      "Though you may not be in the room, you are always in our hearts." 💛
    </div>
  </div>
  <div style="background:#667686;padding:20px 32px;text-align:center;">
    <p style="color:rgba(255,255,255,0.9);font-family:Georgia,serif;font-style:italic;margin:0;font-size:15px;">
      "Made with love — Jev &amp; Jet"
    </p>
  </div>
</div>`;
}

// ── RSVP API endpoint ─────────────────────────────────────────────────────────

app.post("/api/rsvp", async (req, res) => {
  const { name, email, attendance } = req.body;

  if (!name || !email || !attendance) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Guest list check
  const guest    = findGuest(name);
  const isOnList = !!guest;

  // Email transporter (uses env vars set in Render dashboard)
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const HOST_EMAIL = "mallows3124@gmail.com";

  try {
    if (isOnList) {
      const { table, category } = guest;

      // 1. Notify host
      await transporter.sendMail({
        from:    `"Jet & Jev Wedding" <${process.env.GMAIL_USER}>`,
        to:      HOST_EMAIL,
        subject: `💌 New RSVP: ${name} (${attendance === "in-person" ? "In-Person" : "Via Zoom"})`,
        html:    hostEmailHTML({ guestName: name, email, attendance }),
      });

      // 2. Confirm to guest
      await transporter.sendMail({
        from:    `"Jet & Jev Wedding" <${process.env.GMAIL_USER}>`,
        to:      email,
        subject: `✅ RSVP Confirmed — Jet & Jev's Wedding, June 29, 2026`,
        html:    guestConfirmEmailHTML({ guestName: name, attendance, table, category }),
      });

      return res.json({ success: true, onList: true, table, category });

    } else {
      // Not on list — email guest politely
      await transporter.sendMail({
        from:    `"Jet & Jev Wedding" <${process.env.GMAIL_USER}>`,
        to:      email,
        subject: `Thank you for your RSVP — Jet & Jev's Wedding`,
        html:    notOnListEmailHTML({ guestName: name }),
      });

      // Notify host of unlisted attempt
      await transporter.sendMail({
        from:    `"Jet & Jev Wedding" <${process.env.GMAIL_USER}>`,
        to:      HOST_EMAIL,
        subject: `⚠️ RSVP attempt from unlisted guest: ${name}`,
        html:    hostEmailHTML({ guestName: `${name} ⚠️ (NOT ON GUEST LIST)`, email, attendance }),
      });

      return res.json({ success: true, onList: false });
    }

  } catch (err) {
    console.error("Email error:", err.message);
    return res.status(500).json({ error: "Failed to send email", detail: err.message });
  }
});

// ── Catch-all: serve index.html for any unmatched route ──────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Wedding RSVP server running on port ${PORT}`);
});
