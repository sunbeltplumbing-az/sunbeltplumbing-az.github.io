# Sunbelt Plumbing Website

Official website + admin panel for Sunbelt Plumbing (Arizona ROC #344103).

**Live site:** https://sunbeltplumbing-az.github.io/
**Admin panel:** https://sunbeltplumbing-az.github.io/admin/

---

## Stack

- **Frontend:** Plain HTML5 / CSS3 / vanilla JavaScript (no build step)
- **Hosting:** GitHub Pages (free tier)
- **Database + Auth + Storage:** Supabase (free tier)
- **Forms:** Formspree (free tier)
- **Fonts:** Google Fonts (Manrope + Inter)
- **Chat:** Facebook Messenger (m.me link)
- **Uptime pin:** UptimeRobot (keeps Supabase free tier warm)

---

## Project Structure

```
sunbelt-plumbing/
├── index.html              → Home
├── services/index.html     → Services
├── pricing/index.html      → Public price list
├── gallery/index.html      → Gallery (reads from Supabase)
├── quote/index.html        → Quote form (Formspree)
├── contact/index.html      → Contact page
├── 404.html
├── admin/                  → Admin panel
│   ├── index.html          → Login
│   ├── dashboard.html
│   ├── gallery.html
│   ├── testimonials.html
│   ├── settings.html
│   └── js/admin.js
├── css/
│   ├── style.css           → Public site
│   └── admin.css           → Admin panel
├── js/
│   ├── script.js           → Nav toggle, FB widget
│   ├── supabase-client.js  → Shared Supabase init
│   └── content-loader.js   → Public pages read from Supabase
├── images/                 → Logos, service photos, favicon
├── supabase-setup.sql      → One-shot schema + RLS + seed
├── ADMIN_GUIDE.md          → Client-facing guide
└── README.md
```

---

## Setup (developer)

### 1. Clone and serve locally

```bash
git clone https://github.com/sunbeltplumbing-az/sunbeltplumbing-az.github.io.git
cd sunbeltplumbing-az.github.io
python3 -m http.server 8000
# Visit http://localhost:8000/
```

### 2. Configure Supabase

1. Create a Supabase project (region: `us-west-2` / Oregon).
2. Open **SQL Editor** → paste contents of `supabase-setup.sql` → Run.
3. Create Storage bucket named `gallery` (public, 5 MB limit, allow image/jpeg, image/png, image/webp).
4. Add Storage policies (shown at the bottom of the SQL file).
5. Copy the **Project URL** and **anon public key** from Settings → API.
6. Paste them into `js/supabase-client.js`.

### 3. Grant Princess admin access

Supabase → Authentication → Users → Invite user → enter Princess's business email. She'll receive a magic link to log in at `/admin/`.

### 4. Configure Formspree

Update the `action` attribute on the form in `quote/index.html` to your Formspree endpoint.

### 5. UptimeRobot ping (keep Supabase warm)

Supabase free tier pauses after 7 days of inactivity. Use UptimeRobot (free) to hit a Supabase-backed URL every 5 days. Example:

```
GET https://YOUR-PROJECT.supabase.co/rest/v1/gallery?select=id&limit=1
Header: apikey: YOUR_ANON_KEY
```

---

## Deployment

Every push to `main` auto-deploys via GitHub Pages (~30–60 seconds).

**Best practice:** when multiple files change together, push a single commit with everything — piecemeal edits via the GitHub web UI can create version mismatches.

---

## Admin Panel

Protected by Supabase Auth (magic link email, no password). Pages:

- **Gallery** — upload, caption, reorder, delete photos
- **Testimonials** — add / edit / delete customer reviews
- **Business Info** — phone, email, hours, service area, ROC number

Row Level Security enforces: public gets read-only access to active rows; authenticated users get full CRUD.

Non-technical client-facing guide is in **`ADMIN_GUIDE.md`**.

---

## Brand

- **Primary blue:** `#0a2540`, `#0f4c81`
- **Accent gold:** `#f5b720`, `#e8a317`
- **Fonts:** Manrope (display), Inter (body)
- **Logo:** yellow droplet + waves on transparent background

---

## Contact

- **Client contact:** Princess Bell Grafil — via Messenger
- **Owner:** Shan — primary plumber
- **Phone:** (480) 527-5385
- **Email:** shan@sunbeltplumbingaz.com
- **Service area:** Arizona City & Casa Grande · Phoenix to Tucson
- **License:** Arizona ROC #344103
- **Developer:** RDahunan IT Services

---

## License

All rights reserved. Proprietary — not for redistribution.
