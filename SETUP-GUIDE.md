# Chronos — Setup Guide (Complete Beginner Edition)

This guide will walk you through getting Chronos running on the internet so you can use it from your phone and computer, with all your data synced. It should take about 20–30 minutes.

You'll set up 3 free services:
1. **Supabase** — stores your data in the cloud (free)
2. **GitHub** — stores your code (free)
3. **Vercel** — puts your app on the internet (free)

---

## What You'll Need

- A computer with internet access
- An email address
- That's it!

---

## Step 1: Install Node.js

Node.js is what runs the app on your computer during development.

1. Go to **https://nodejs.org**
2. Click the big green **"LTS"** download button
3. Run the installer — just click "Next" through everything
4. To verify it worked, open **Terminal** (Mac) or **Command Prompt** (Windows):
   ```
   node --version
   ```
   You should see something like `v20.x.x`. If you do, you're good!

---

## Step 2: Set Up Supabase (Your Database)

Supabase is where your calendar data lives so it syncs between devices.

1. Go to **https://supabase.com** and click **"Start your project"**
2. Sign up with your GitHub account (or email)
3. Click **"New Project"**
   - **Name:** `chronos`
   - **Database Password:** Pick something strong and save it somewhere
   - **Region:** Pick the one closest to you
   - Click **"Create new project"** and wait ~2 minutes

4. Once ready, go to **Project Settings** (gear icon in the left sidebar) → **API**
5. You'll see two values. **Copy these somewhere — you'll need them soon:**
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public key** — a long string starting with `eyJ...`

---

## Step 3: Create the Database Table

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Open the file `supabase-schema.sql` from this project folder
4. Copy the ENTIRE contents and paste it into the SQL editor
5. Click **"Run"** (or press Cmd+Enter / Ctrl+Enter)
6. You should see "Success. No rows returned" — that's perfect!

---

## Step 4: Set Up the Project on Your Computer

1. Download and unzip this project folder (if you haven't already)
2. Open **Terminal** (Mac) or **Command Prompt** (Windows)
3. Navigate to the project folder:
   ```
   cd path/to/chronos-app
   ```
   (Tip: on Mac, you can type `cd ` then drag the folder into Terminal)

4. Install the dependencies:
   ```
   npm install
   ```
   This downloads all the code libraries the app needs. Wait for it to finish.

5. Create your environment file:
   ```
   cp .env.example .env
   ```
   (On Windows: `copy .env.example .env`)

6. Open the `.env` file in any text editor (Notepad, TextEdit, VS Code, etc.) and replace the placeholder values with your Supabase values from Step 2:
   ```
   VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
   ```
   Save the file.

7. Test it locally:
   ```
   npm run dev
   ```
   Open **http://localhost:5173** in your browser. You should see the Chronos login screen!
   - Create an account with your email and password
   - Check your email for a confirmation link, click it
   - Sign in — you're running locally!

   Press `Ctrl+C` in Terminal to stop the server when done testing.

---

## Step 5: Put Your Code on GitHub

GitHub stores your code so Vercel can deploy it.

1. Go to **https://github.com** and create a free account (or sign in)
2. Click the **"+"** button (top right) → **"New repository"**
   - **Repository name:** `chronos-app`
   - Keep it **Public** (or Private, either works)
   - Do NOT check "Add a README file"
   - Click **"Create repository"**

3. GitHub will show you some commands. In your Terminal (inside the chronos-app folder), run these one by one:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/chronos-app.git
   git push -u origin main
   ```
   (Replace `YOUR-USERNAME` with your actual GitHub username)

   If it asks you to sign in, follow the prompts.

---

## Step 6: Deploy to the Internet with Vercel

This makes your app accessible from any device.

1. Go to **https://vercel.com** and click **"Sign Up"** → sign in with GitHub
2. Click **"Add New Project"**
3. Find and select your **chronos-app** repository
4. Before clicking deploy, click **"Environment Variables"** and add these two:
   - **Name:** `VITE_SUPABASE_URL` → **Value:** your Supabase URL
   - **Name:** `VITE_SUPABASE_ANON_KEY` → **Value:** your Supabase anon key
5. Click **"Deploy"** and wait ~1-2 minutes
6. When it's done, Vercel gives you a URL like **`https://chronos-app.vercel.app`**

**That's your app! Open that URL on your phone and computer — same data everywhere.**

---

## Step 7: Install on Your Phone (Optional but Recommended)

Since Chronos is a PWA (Progressive Web App), you can install it like a native app:

### iPhone / iPad:
1. Open your Vercel URL in **Safari**
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"**

### Android:
1. Open your Vercel URL in **Chrome**
2. Tap the **three dots menu** (top right)
3. Tap **"Add to Home screen"** or **"Install app"**

Now it appears as an app icon on your home screen and opens fullscreen!

---

## How the Sync Works

- When you make changes (add a block, check a habit, etc.), the app waits 800ms then saves to Supabase
- When you open the app on another device, it loads the latest data from Supabase
- Both devices always see the same data
- Your data is private — Row Level Security means only YOU can see your data

---

## Troubleshooting

**"npm: command not found"**
→ Node.js didn't install properly. Re-download from nodejs.org and reinstall.

**"git: command not found"**
→ Install Git from https://git-scm.com/downloads

**Login not working / "Invalid login credentials"**
→ Make sure you confirmed your email (check spam folder). Supabase sends a confirmation link.

**App loads but data doesn't save**
→ Double-check your `.env` values match your Supabase dashboard exactly. Make sure you ran the SQL schema (Step 3).

**Vercel deploy fails**
→ Make sure you added BOTH environment variables in Vercel's settings. Check that your code pushed to GitHub correctly.

**Want a custom domain?**
→ In Vercel, go to your project → Settings → Domains. You can add a custom domain or use a free `.vercel.app` subdomain.

---

## Updating the App

If you make changes to the code later:

```
git add .
git commit -m "Updated something"
git push
```

Vercel will automatically redeploy within a minute. Both your phone and desktop will get the update next time you open the app.

---

Enjoy your Chronos setup! 🎯
