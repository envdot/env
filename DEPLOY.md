# Deploy env to GitHub Pages (Web-Based)

## Step 1: Create the Repository

1. Go to **github.com/envdot**
2. Click the green **"New"** button (or go to github.com/new)
3. Repository name: `env`
4. Make it **Public**
5. Click **Create repository**

---

## Step 2: Upload Site Files

1. On your new empty repo page, click **"uploading an existing file"**
2. Drag and drop these files:
   - `index.html`
   - `changelog.html`
   - `CNAME`
3. Commit message: `Initial site`
4. Click **Commit changes**

---

## Step 3: Enable GitHub Pages

1. Go to **Settings** (tab at the top of your repo)
2. Scroll down to **Pages** in the left sidebar
3. Under "Source", select:
   - Branch: **main**
   - Folder: **/ (root)**
4. Click **Save**
5. Under "Custom domain", enter: `dotenv.id`
6. Click **Save**

---

## Step 4: Configure DNS (at your domain registrar)

Add these DNS records for `dotenv.id`:

### A Records (for apex domain)
```
Type: A
Host: @
Points to: 185.199.108.153

Type: A
Host: @
Points to: 185.199.109.153

Type: A
Host: @
Points to: 185.199.110.153

Type: A
Host: @
Points to: 185.199.111.153
```

### CNAME Record (for www - optional)
```
Type: CNAME
Host: www
Points to: envdot.github.io
```

Wait 5-30 minutes for DNS to propagate, then check **"Enforce HTTPS"** in GitHub Pages settings.

---

## Step 5: Upload the DMG (Release)

After you build the app on your Mac:

1. Go to your repo: **github.com/envdot/env**
2. Click **Releases** (right sidebar)
3. Click **Create a new release**
4. Tag: `v1.0.0`
5. Title: `v1.0.0`
6. Description: `Initial release`
7. Drag your `env.dmg` file into the upload area
8. Click **Publish release**

The download button on your site will automatically link to:
`https://github.com/envdot/env/releases/latest/download/env.dmg`

---

## Building the DMG (on your Mac)

```bash
cd env-app
chmod +x build.sh
./build.sh

# Install create-dmg if needed
brew install create-dmg

# Create the DMG
create-dmg \
  --volname "env" \
  --window-pos 200 120 \
  --window-size 600 400 \
  --icon-size 100 \
  --icon "env.app" 150 200 \
  --app-drop-link 450 200 \
  "env.dmg" \
  "build/env.app"
```

---

## Final URLs

| What | URL |
|------|-----|
| Landing page | https://dotenv.id |
| Changelog | https://dotenv.id/changelog.html |
| Download | https://github.com/envdot/env/releases/latest/download/env.dmg |
| Docs | https://env.mintlify.app |
| GitHub | https://github.com/envdot/env |
