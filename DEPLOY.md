# 🎊 Jet & Jev Wedding — Render Deployment Guide

## Your Repo Structure (upload exactly this to GitHub)

```
your-repo/
├── server.js              ← Express server (the backend)
├── package.json           ← Dependencies
├── data/
│   └── guests.json        ← All 103 guests + table numbers
└── public/                ← Everything the browser sees
    ├── index.html
    ├── css/
    │   └── styles.css
    ├── js/
    │   └── script.js
    ├── images/            ← COPY from your original zip
    │   ├── BGG.jpeg
    │   ├── bg.jpg
    │   ├── cam.png
    │   ├── celeb.png
    │   ├── hearts.png
    │   ├── program.png
    │   ├── rings.png
    │   └── spag.png
    └── song/              ← COPY from your original zip
        └── blue (instrumental).mp3
```

---

## Step 1 — Gmail App Password (do this first!)

> Normal Gmail passwords won't work. You need an App Password.

1. Go to **myaccount.google.com** → **Security**
2. Make sure **2-Step Verification** is ON
3. Search for **"App Passwords"** and open it
4. Click **Create** → name it "Wedding RSVP" → click **Create**
5. **Copy the 16-character password** shown (e.g. `abcd efgh ijkl mnop`)
   — save it, you'll need it in Step 3

---

## Step 2 — Push to GitHub

1. Go to [github.com](https://github.com) → **New repository**
2. Name it anything (e.g. `jet-and-jev-wedding`)
3. Upload all the files above (drag & drop works fine)
4. Make sure the folder structure matches exactly

---

## Step 3 — Deploy on Render

1. Go to [render.com](https://render.com) → **New +** → **Web Service**
2. Click **Connect a repository** → select your GitHub repo
3. Fill in the settings:

   | Setting | Value |
   |---------|-------|
   | **Name** | `jet-and-jev-wedding` (or anything) |
   | **Region** | Singapore (closest to Manila) |
   | **Branch** | `main` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Instance Type** | `Free` |

4. Click **Advanced** → **Add Environment Variable** — add these TWO:

   | Key | Value |
   |-----|-------|
   | `GMAIL_USER` | `mallows3124@gmail.com` |
   | `GMAIL_PASS` | *(the 16-char App Password from Step 1)* |

5. Click **Create Web Service**
6. Wait ~2 minutes for the build to finish
7. Your site URL will be: `https://jet-and-jev-wedding.onrender.com`

---

## Step 4 — Test It

1. Open your Render URL
2. Scroll down → click **RSVP Now** → verify it scrolls to the RSVP section
3. Click **Yes** → choose **In-Person** → enter a name from the guest list + your email
4. Submit — you should receive:
   - ✅ Email at `mallows3124@gmail.com` with name, email, attendance type
   - ✅ Confirmation email to the guest with their table number
5. Try a name NOT on the list → they get a polite "limited capacity" email

---

## How Name Matching Works

The system is forgiving — guests don't need perfect spelling:
- `"jessa bacani"` → matches `"Jessa Bacani"` ✅ (case-insensitive)
- `"Jessa B"` → matches `"Jessa Bacani"` ✅ (partial match)
- `"John Smith"` → no match → polite capacity message ✅

---

## Later: Add Your Real Seating Chart Image

In `server.js`, find this line inside `guestConfirmEmailHTML`:
```
src="https://placehold.co/480x280/..."
```
Replace it with a link to your actual seating chart image.
(Upload the image to your GitHub repo under `public/images/seating-chart.jpg`
and the URL becomes `https://your-render-url.onrender.com/images/seating-chart.jpg`)

---

## Free Tier Notes

- Render's free tier **spins down after 15 mins of inactivity** — the first visit after idle takes ~30 seconds to wake up. This is normal.
- There is **no monthly credit limit** like Netlify — Render free tier is always available.
