# Deploying Market Racer

## Prerequisites

- Node.js 18 or later
- npm 9 or later
- A GitHub account with access to this repository

---

## Vercel

### Option A — Vercel Dashboard (recommended)

1. Go to [vercel.com](https://vercel.com) and sign in.
2. Click **Add New… → Project**.
3. Under **Import Git Repository**, connect your GitHub account if not already connected.
4. Select the `inonkaikov-arch/-` repository.
5. Set the branch to `claude/fervent-goldberg-NSD4r` (or `main` after merging the PR).
6. Vercel will auto-detect Vite. Confirm these settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
7. Click **Deploy**.
8. Your game will be live at `https://<project-name>.vercel.app` in ~1 minute.

### Option B — Vercel CLI

```bash
# Install once
npm install -g vercel

# From the project root
npm run build
vercel --prod
```

Follow the prompts (link to existing project or create new). The `dist/` folder is deployed automatically.

### Redeployment

Every push to the connected branch triggers an automatic redeploy. No manual steps needed.

---

## Netlify

### Option A — Netlify Dashboard (recommended)

1. Go to [app.netlify.com](https://app.netlify.com) and sign in.
2. Click **Add new site → Import an existing project**.
3. Choose **Deploy with GitHub** and authorise Netlify.
4. Select the `inonkaikov-arch/-` repository.
5. Set the branch to `claude/fervent-goldberg-NSD4r` (or `main` after merging the PR).
6. Fill in the build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
7. Click **Deploy site**.
8. Your game will be live at `https://<random-name>.netlify.app` in ~1 minute.
9. Optionally rename the site under **Site configuration → Site details**.

### Option B — Netlify CLI

```bash
# Install once
npm install -g netlify-cli

# From the project root
npm run build
netlify deploy --prod --dir dist
```

On first run you will be prompted to log in and link or create a site.

### Option C — Drag and Drop (no account linking needed)

1. Run `npm run build` locally — this creates the `dist/` folder.
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
3. Drag the `dist/` folder onto the page.
4. The game is live immediately at a generated URL.

### Redeployment

Every push to the connected branch triggers an automatic redeploy. No manual steps needed.

---

## Build verification

Run these commands locally before deploying to confirm everything is healthy:

```bash
npm install          # install dependencies
npm run build        # TypeScript check + Vite production build → dist/
npm run preview      # serve dist/ locally at http://localhost:4173
```

Expected output from `npm run build`:

```
✓ 15 modules transformed.
dist/index.html                    ~0.5 kB
dist/assets/index-*.js          ~1,495 kB
✓ built in ~7s
```

---

## Notes

- The game is entirely client-side — no backend, no API keys, no environment variables required.
- The `dist/` folder is all that needs to be deployed; it contains a single HTML file and one JS bundle.
- Best score is stored in the player's browser `localStorage` and is not shared between devices.
