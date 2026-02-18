// server.js — Express server for Render deployment
// FAST RESPONSE: Emails sent in background, doesn't slow down the UI

const express    = require("express");
const nodemailer = require("nodemailer");
const path       = require("path");
const fs         = require("fs");
const guests     = require("./data/guests.json");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(str) {
  return str.toLowerCase().replace(/\s+/g, " ").trim();
}

function findGuest(submittedName) {
  const norm  = normalize(submittedName);
  const exact = guests.find((g) => normalize(g.name) === norm);
  if (exact) return exact;
  return guests.find((g) => 
    norm.includes(normalize(g.name)) || normalize(g.name).includes(norm)
  ) || null;
}

/** Get seat image URL - looks for /public/seat-images/{name}.jpg */
function getSeatImageUrl(guestName) {
  const filename = guestName.toLowerCase().replace(/\s+/g, "-") + ".jpg";
  const filepath = path.join(__dirname, "public", "seat-images", filename);
  
  if (fs.existsSync(filepath)) {
    return `/seat-images/${filename}`;
  }
  
  // Default placeholder
  return "https://placehold.co/600x400/e8eff5/667686?text=Table+Seating+%F0%9F%A5%82%0A(Chart+coming+soon)";
}

// ── Email HTML ────────────────────────────────────────────────────────────────

function hostEmailHTML({ guestName, email, attendance }) {
  const badge = attendance === "in-person"
    ? `<span style="background:#667686;color:#fff;padding:4px 14px;border-radius:20px;font-size:13px;">🏛️ In-Person</span>`
    : `<span style="background:#97adc2;color:#fff;padding:4px 14px;border-radius:20px;font-size:13px;">💻 Via Zoom</span>`;

  return `
<div style="font-family:'Inter',Arial,sans-serif;max-width:540px;margin:0 auto;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
  <div style="background:#667686;padding:28px 32px;text-align:center;">
    <h1 style="color:#fff;font-family:Georgia,serif;margin:0;font-size:26px;">New RSVP 💌</h1>
    <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Jet &amp; Jev — June 29, 2026</p>
  </div>
  <div style="padding:28px 32px;">
    <table style="width:100%;border-collapse:collapse;font-size:15px;">
      <tr><td style="padding:10px 0;color:#878787;width:38%;">Guest</td><td style="padding:10px 0;font-weight:600;color:#595d5c;">${guestName}</td></tr>
      <tr style="border-top:1px solid #f0f0f0;"><td style="padding:10px 0;color:#878787;">Email</td><td style="padding:10px 0;color:#595d5c;">${email}</td></tr>
      <tr style="border-top:1px solid #f0f0f0;"><td style="padding:10px 0;color:#878787;">Attendance</td><td style="padding:10px 0;">${badge}</td></tr>
    </table>
  </div>
  <div style="background:#f8f9fa;padding:14px 32px;font-size:11px;color:#aaa;text-align:center;">
    Auto-sent from wedding RSVP system
  </div>
</div>`;
}

function guestConfirmEmailHTML({ guestName, attendance, table, category, seatImageUrl, renderUrl }) {
  const isInPerson = attendance === "in-person";
  const firstName  = guestName.split(" ")[0];
  
  const fullImageUrl = seatImageUrl.startsWith("http") ? seatImageUrl : renderUrl + seatImageUrl;

  const seatBlock = isInPerson ? `
    <div style="background:#f0f4f8;border-radius:10px;padding:22px 24px;margin:24px 0;text-align:center;">
      <p style="margin:0 0 6px;color:#878787;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your Assigned Seat</p>
      <p style="margin:0;font-family:Georgia,serif;font-size:36px;font-weight:700;color:#667686;">Table ${table || "TBA"}</p>
      ${category ? `<p style="margin:6px 0 0;color:#97adc2;font-size:13px;">${category}</p>` : ""}
      <div style="margin-top:18px;">
        <img src="${fullImageUrl}" alt="Seat Assignment" style="width:100%;max-width:600px;border-radius:8px;border:1px solid #d1d1d1;">
        <p style="font-size:11px;color:#bbb;margin:8px 0 0;font-style:italic;">Your seating assignment</p>
      </div>
    </div>` : `
    <div style="background:#f0f4f8;border-radius:10px;padding:22px 24px;margin:24px 0;text-align:center;">
      <p style="margin:0 0 8px;color:#878787;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Joining Online</p>
      <p style="margin:0;font-size:16px;color:#595d5c;">💻 You're joining <strong>via Zoom</strong>!</p>
      <p style="margin:10px 0 0;font-size:13px;color:#878787;">Zoom link will be sent closer to the event.</p>
    </div>`;

  return `
<div style="font-family:'Inter',Arial,sans-serif;max-width:540px;margin:0 auto;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
  <div style="background:#667686;padding:32px;text-align:center;">
    <p style="color:rgba(255,255,255,0.65);margin:0 0 8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;">You're Invited</p>
    <h1 style="color:#fff;font-family:Georgia,serif;margin:0;font-size:32px;">Jet &amp; Jev</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">June 29, 2026 • Maple Grove Manor, Manila</p>
  </div>
  <div style="padding:32px;">
    <h2 style="font-family:Georgia,serif;color:#667686;font-size:22px;margin:0 0 8px;">See you there, ${firstName}! 🎉</h2>
    <p style="color:#878787;font-size:15px;margin:0 0 20px;">Your RSVP confirmed. We're excited to celebrate with you!</p>
    ${seatBlock}
    <div style="border-top:1px solid #f0f0f0;padding-top:20px;font-size:14px;color:#878787;line-height:1.9;">
      <p style="margin:0;">📅 <strong>Date:</strong> Monday, June 29, 2026</p>
      <p style="margin:0;">📍 <strong>Venue:</strong> Maple Grove Manor, Manila</p>
      <p style="margin:0;">⏰ <strong>Ceremony:</strong> 2:30 PM</p>
    </div>
  </div>
  <div style="background:#667686;padding:20px 32px;text-align:center;">
    <p style="color:rgba(255,255,255,0.9);font-family:Georgia,serif;font-style:italic;margin:0;font-size:15px;">"Made with love — Jev &amp; Jet"</p>
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
    <h2 style="font-family:Georgia,serif;color:#667686;font-size:20px;margin:0 0 16px;">Thank you, ${firstName}!</h2>
    <p style="color:#595d5c;font-size:15px;line-height:1.8;margin:0 0 14px;">We truly appreciate your warm wishes and love. 💙</p>
    <p style="color:#595d5c;font-size:15px;line-height:1.8;margin:0 0 14px;">Unfortunately, we have limited seats and our guest list is finalized. We hope you understand.</p>
    <p style="color:#595d5c;font-size:15px;line-height:1.8;margin:0;">We hope to celebrate with you another time soon!</p>
    <div style="background:#f8f9fa;border-radius:8px;padding:16px 20px;margin:24px 0;font-style:italic;color:#878787;font-size:14px;text-align:center;">
      "Though you may not be in the room, you are always in our hearts." 💛
    </div>
  </div>
  <div style="background:#667686;padding:20px 32px;text-align:center;">
    <p style="color:rgba(255,255,255,0.9);font-family:Georgia,serif;font-style:italic;margin:0;font-size:15px;">"Made with love — Jev &amp; Jet"</p>
  </div>
</div>`;
}

// ── Async email sender ────────────────────────────────────────────────────────

async function sendEmailsAsync(params) {
  console.log("📧 Starting email send...");
  
  // Verify credentials are loaded
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.error("❌ GMAIL_USER or GMAIL_PASS not set in environment variables!");
    console.error("   GMAIL_USER:", process.env.GMAIL_USER ? "✅ Set" : "❌ Missing");
    console.error("   GMAIL_PASS:", process.env.GMAIL_PASS ? "✅ Set" : "❌ Missing");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const HOST_EMAIL = "mallows3124@gmail.com";

  try {
    if (params.type === "confirmed") {
      const { guestName, email, attendance, table, category, seatImageUrl, renderUrl } = params;

      await transporter.sendMail({
        from:    `"Jet & Jev Wedding" <${process.env.GMAIL_USER}>`,
        to:      HOST_EMAIL,
        subject: `💌 RSVP: ${guestName} (${attendance === "in-person" ? "In-Person" : "Zoom"})`,
        html:    hostEmailHTML({ guestName, email, attendance }),
      });
      console.log(`  ✅ Host email sent to ${HOST_EMAIL}`);

      await transporter.sendMail({
        from:    `"Jet & Jev Wedding" <${process.env.GMAIL_USER}>`,
        to:      email,
        subject: `✅ RSVP Confirmed — Jet & Jev, June 29, 2026`,
        html:    guestConfirmEmailHTML({ guestName, attendance, table, category, seatImageUrl, renderUrl }),
      });
      console.log(`  ✅ Guest email sent to ${email}`);

      console.log(`✅ ALL EMAILS SENT for: ${guestName}`);

    } else if (params.type === "not-listed") {
      const { guestName, email, attendance } = params;

      await transporter.sendMail({
        from:    `"Jet & Jev Wedding" <${process.env.GMAIL_USER}>`,
        to:      email,
        subject: `Thank you for your RSVP — Jet & Jev`,
        html:    notOnListEmailHTML({ guestName }),
      });
      console.log(`  ✅ Polite decline email sent to ${email}`);

      await transporter.sendMail({
        from:    `"Jet & Jev Wedding" <${process.env.GMAIL_USER}>`,
        to:      HOST_EMAIL,
        subject: `⚠️ Unlisted RSVP: ${guestName}`,
        html:    hostEmailHTML({ guestName: `${guestName} ⚠️ (NOT ON LIST)`, email, attendance }),
      });
      console.log(`  ✅ Alert email sent to host`);

      console.log(`⚠️ UNLISTED GUEST: ${guestName}`);
    }
  } catch (err) {
    console.error("❌ EMAIL SEND FAILED!");
    console.error("   Error type:", err.name);
    console.error("   Error message:", err.message);
    console.error("   Full error:", err);
  }
}

// ── RSVP API ──────────────────────────────────────────────────────────────────

app.post("/api/rsvp", async (req, res) => {
  const { name, email, attendance } = req.body;
  
  console.log("=".repeat(60));
  console.log("🎯 RSVP ENDPOINT HIT");
  console.log("   Name:", name);
  console.log("   Email:", email);
  console.log("   Attendance:", attendance);
  console.log("=".repeat(60));

  if (!name || !email || !attendance) {
    console.log("❌ Missing fields!");
    return res.status(400).json({ error: "Missing fields" });
  }

  const guest    = findGuest(name);
  const isOnList = !!guest;
  
  console.log("🔍 Guest lookup result:", isOnList ? "FOUND" : "NOT FOUND");
  if (isOnList) {
    console.log("   Guest:", guest.name);
    console.log("   Table:", guest.table);
    console.log("   Category:", guest.category);
  }
  
  const renderUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

  // ⚡ RESPOND IMMEDIATELY
  if (isOnList) {
    const { table, category } = guest;
    const seatImageUrl = getSeatImageUrl(guest.name);
    
    res.json({ success: true, onList: true, table, category });
    
    // 📧 NOW SEND EMAILS (after response sent)
    console.log("📧 About to send emails...");
    try {
      await sendEmailsAsync({ 
        type: "confirmed", 
        guestName: name, 
        email, 
        attendance, 
        table, 
        category, 
        seatImageUrl, 
        renderUrl 
      });
      console.log("✅ Email sending completed");
    } catch (err) {
      console.error("❌ Email sending failed:", err.message);
    }

  } else {
    res.json({ success: true, onList: false });
    
    // 📧 NOW SEND EMAILS (after response sent)
    console.log("📧 About to send NOT-LISTED emails...");
    try {
      await sendEmailsAsync({ 
        type: "not-listed", 
        guestName: name, 
        email, 
        attendance 
      });
      console.log("✅ Email sending completed");
    } catch (err) {
      console.error("❌ Email sending failed:", err.message);
    }
  }
});

// ── Serve index.html for all routes ──────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📧 Gmail: ${process.env.GMAIL_USER || '(not set)'}`);
  console.log(`🌐 URL: ${process.env.RENDER_EXTERNAL_URL || 'localhost'}`);
});
