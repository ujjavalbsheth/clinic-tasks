# White Way Dental — Task Tracker

**Status: Final — v1.0.** Build-verified and locked for deployment. Any further changes should be tracked as a new version rather than edited in place, so this build stays a known-good reference point.

Patient-linked task assignment and tracking for the White Way Dental team. Next.js + Supabase (Postgres). Staff open a URL on their phone, sign in once with a shared passcode, and see their work.

---

## What's in the box

```
supabase-schema.sql        Run once in Supabase. Creates all tables and seeds your team.
lib/supabase.js            Server-side database client (service role key, never exposed).
lib/format.js              Task codes, plain-language due dates, shared constants.
middleware.js              Passcode gate on every route.
app/api/auth/              Sign in, sign out.
app/api/staff/             Staff list.
app/api/patients/          Patient lookup and creation.
app/api/tasks/             List, filter, create tasks.
app/api/tasks/[id]/        Read one task, update status/priority/assignee, add notes, delete.
app/page.jsx               Dashboard: search + filters + task list.
app/new/page.jsx           Assign a new task.
app/task/[id]/page.jsx     Task detail: change status, add notes, reassign.
app/login/page.jsx         Passcode screen.
app/globals.css            Full styling.
```

---

## Setup — about 20 minutes, all in the browser

### 1. Create the database

1. Go to **supabase.com**, sign up, click **New project**.
2. Name it `clinic-tasks`. Choose the **Mumbai (ap-south-1)** region — closest to Ahmedabad, so pages load faster.
3. Set a database password and save it somewhere safe.
4. Wait about two minutes for the project to finish provisioning.
5. In the left sidebar open **SQL Editor → New query**.
6. Paste the entire contents of `supabase-schema.sql` and click **Run**.

You should see "Success. No rows returned." Open **Table Editor** and confirm you have four tables: `staff`, `patients`, `tasks`, `task_notes` — with your five team members already in `staff`.

### 2. Collect your keys

In Supabase go to **Project Settings → API** and copy two values:

- **Project URL** — looks like `https://abcdefgh.supabase.co`
- **service_role** secret key — the long one under "Project API keys"

The service_role key bypasses all security rules. It goes on the server only. Never paste it into a chat, a repo, or any file that ends up in the browser.

### 3. Put the code on GitHub

1. Go to **github.com/new**, create a private repo called `clinic-tasks`.
2. On the empty repo page choose **uploading an existing file**.
3. Drag in the whole unzipped project folder's contents. Commit.

### 4. Deploy on Vercel

1. Go to **vercel.com**, sign in with GitHub, click **Add New → Project**.
2. Import `clinic-tasks`. Leave the framework preset as Next.js.
3. Before deploying, open **Environment Variables** and add three:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | your Project URL from step 2 |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service_role key from step 2 |
   | `CLINIC_PASSCODE` | any passcode you'll share with staff |

4. Click **Deploy**. Two minutes later you get a live URL.

### 5. Get it onto staff phones

Send everyone the same URL — it works two ways from one deployment, no separate build needed:

- **As a website.** Anyone opens the URL in any browser (phone, laptop, tablet) and it just works, with the browser address bar visible.
- **As an installable app.** On the phone, open the URL in Chrome (Android) or Safari (iPhone), then **Add to Home Screen** (Android/Chrome may prompt **Install app** automatically). It launches full-screen with its own icon and no browser chrome, backed by `public/manifest.json` and the icons in `public/`.

They enter the passcode once and stay signed in for 30 days, whichever way they open it.

**Swapping the icon.** The clay-and-cream "AS" mark in `public/icon-192.png` / `icon-512.png` / `apple-touch-icon.png` is a placeholder. Drop in your own square PNGs at the same filenames (192×192, 512×512, 180×180) to replace it — no other changes needed.

---

## Running it locally (optional)

Only needed if you want to change the code and preview before deploying. Requires Node.js 18+.

```bash
npm install
cp .env.example .env.local     # then fill in your three real values
npm run dev
```

Open `http://localhost:3000`.

If you'd rather not install anything, edit files directly on GitHub — every commit auto-deploys to Vercel, and you can preview there.

---

## Day-to-day notes

**Adding or removing staff.** Supabase → Table Editor → `staff` → Insert row. To remove someone, set `active` to false rather than deleting — their name stays attached to past tasks.

**Changing the passcode.** Vercel → Settings → Environment Variables → edit `CLINIC_PASSCODE` → Redeploy. Everyone signs in again with the new one.

**Backups.** Supabase's free tier keeps daily backups for 7 days. For anything you'd hate to lose, Table Editor → `tasks` → Export as CSV, monthly.

**Costs.** Supabase free tier and Vercel Hobby both handle a clinic this size comfortably. Expect ₹0/month until you're well past 50,000 tasks.

---

## What this is not

This is an internal workflow tool, not a clinical record system. Notes are visible to everyone with the passcode. Keep clinical findings in your case record sheets, and keep task notes operational — "called, no answer," "lab confirmed Thursday." That separation also keeps you clear of any argument that a shared-passcode tool is holding treatment records.

---

## Sensible next additions

- WhatsApp or SMS nudge when a High-priority task passes its deadline
- "My day" view filtered to the signed-in person, opening by default
- Per-staff completion counts for the month
- Link tasks to a patient's full history from the patient record
