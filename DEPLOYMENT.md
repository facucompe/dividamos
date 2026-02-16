# Deployment Guide

Follow these steps to deploy Dividamos without a database using GitHub as storage and Vercel as hosting.

## Prerequisites

- GitHub account
- Vercel account (free) - sign up at [vercel.com](https://vercel.com) using your GitHub account

## Step 1: Create GitHub Personal Access Token

Your app will use GitHub to store the expense data in `data/expenses.json`.

1. Go to **GitHub Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
   - Direct link: https://github.com/settings/tokens

2. Click **"Generate new token"** → **"Generate new token (classic)"**

3. Configure the token:
   - **Note**: `Dividamos App`
   - **Expiration**: Choose your preference (recommend 90 days or No expiration)
   - **Scopes**: Check **`repo`** (Full control of private repositories)
     - This gives access to read and write to your repository

4. Click **"Generate token"**

5. **IMPORTANT**: Copy the token immediately and save it somewhere safe
   - Format: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - You won't be able to see it again!

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub

2. Click **"Add New..."** → **"Project"**

3. **Import your repository**:
   - Find `facucompe/dividamos` in the list
   - Click **"Import"**

4. **Configure Project**:
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build` (auto-filled)
   - **Output Directory**: `.next` (auto-filled)

5. **Add Environment Variables**:
   Click "Environment Variables" and add:

   | Name | Value |
   |------|-------|
   | `GITHUB_TOKEN` | Your token from Step 1 (starts with `ghp_`) |
   | `GITHUB_REPO` | `facucompe/dividamos` |

6. Click **"Deploy"**

7. Wait 2-3 minutes for the build to complete

8. Your app is live! 🎉
   - Vercel will provide a URL like: `dividamos-xxx.vercel.app`

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - What's your project's name? dividamos
# - In which directory is your code located? ./
# - Auto-detected settings? Yes

# Add environment variables
vercel env add GITHUB_TOKEN
# Paste your token when prompted

vercel env add GITHUB_REPO
# Enter: facucompe/dividamos

# Deploy to production
vercel --prod
```

## Step 3: Verify Deployment

1. Open your Vercel URL

2. Create a group and add some friends

3. Add an expense

4. Check your GitHub repository:
   - Go to https://github.com/facucompe/dividamos
   - Navigate to `data/expenses.json`
   - You should see your data stored there!

## Step 4: Set Up Custom Domain (Optional)

1. In Vercel Dashboard, go to your project

2. Click **"Settings"** → **"Domains"**

3. Add your custom domain:
   - Enter your domain name
   - Follow Vercel's DNS configuration instructions
   - Wait for DNS propagation (up to 48 hours)

## How It Works

- **No Database**: All data is stored in `data/expenses.json` in your GitHub repo
- **Automatic Saves**: Every change (adding friends, expenses, etc.) commits to GitHub
- **Persistence**: Your data survives across deployments
- **Version Control**: All changes are tracked in git history
- **Free Hosting**: Vercel free tier is sufficient for this app

## Troubleshooting

### "Failed to save data" error

**Cause**: GitHub token is missing or invalid

**Fix**:
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Verify `GITHUB_TOKEN` and `GITHUB_REPO` are set correctly
3. If token expired, create a new one (Step 1) and update the environment variable
4. Redeploy the app

### "API rate limit exceeded"

**Cause**: Too many API calls to GitHub

**Fix**:
- GitHub allows 5000 requests/hour with authentication
- This should be more than enough for normal usage
- If you hit the limit, wait an hour or upgrade your GitHub plan

### Data not persisting

**Cause**: Environment variables not set

**Fix**:
1. Ensure both `GITHUB_TOKEN` and `GITHUB_REPO` are set in Vercel
2. Format for `GITHUB_REPO`: `username/repo` (no https://, no .git)
3. After adding variables, redeploy the app

### Build fails on Vercel

**Cause**: TypeScript or build errors

**Fix**:
1. Test locally first: `npm run build`
2. Fix any errors shown
3. Commit and push fixes
4. Vercel will automatically redeploy

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | `ghp_abc123...` |
| `GITHUB_REPO` | Repository in username/repo format | `facucompe/dividamos` |

## Security Notes

- Never commit `.env.local` to git (already in `.gitignore`)
- Keep your GitHub token secret
- The token has write access to your repo, so protect it
- Consider setting token expiration for security
- Rotate tokens periodically

## Updating the App

When you make changes:

```bash
# Make your changes
# Commit them
git add .
git commit -m "Your changes"
git push origin main

# Vercel will automatically detect the push and redeploy!
```

## Need Help?

- Vercel Docs: https://vercel.com/docs
- GitHub API Docs: https://docs.github.com/en/rest
- Next.js Docs: https://nextjs.org/docs

---

**Your app is now deployed! 🚀**

Share your Vercel URL with friends and start splitting expenses!
