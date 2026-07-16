# DEPLOY GUIDE: ChatKu + Tepi Full Stack Application
**Target:** Production-ready deployment on Cloudflare Workers + Pages
**Author:** Automated Deployment Guide
**Version:** 1.0 - 2025-07-16

---

## QUICK SUMMARY

### What This Deploy Does
- Migrate authentication from Supabase to Cloudflare D1 native (OTP flow, no Google OAuth)
- Deploy **Tepi** (static site + API) via Cloudflare Pages
- Deploy **ChatKu** (mobile backend) via Cloudflare Workers
- Setup email via Resend (3,000/month free tier)
- Full subdomain management, payments, user applications workflow

### Time Required
- Initial setup: 45-60 minutes
- First deploy: ~8-12 minutes
- Testing: 10-15 minutes

### Cost Overview (First Month)
- Cloudflare Workers: $0 (free plan, first 100K requests)
- Cloudflare Pages: $0
- Resend: $0 (3,000 emails/month free)
- Domain `.my.id`: $0 (already existing)

---

## PREREQUISITES

### 🔑 Required Accounts & Keys

#### 1. Cloudflare Account
- [cloudflare.com](https://cloudflare.com)
- Need both **Cloudflare Workers** and **Cloudflare Pages**
- Access to dashboard: [dashboard.cloudflare.com](https://dashboard.cloudflare.com)

#### 2. GitHub Account
- [github.com](https://github.com)
- Two repositories:
  - `https://github.com/AraZharr/ChatKu` (mobile backend)
  - `https://github.com/AraZharr/tepi` (static site + API) ⚠️ **you are using this one**

#### 3. Resend Account
- [resend.com](https://resend.com)
- Create project → API Keys → Copy `RE_SEND_API_KEY`
- Optional: configure domain `noreply@tepi.my.id` (recommended for production)

#### 4. Turnstile (Cloudflare CAPTCHA)
- Access Turnstile dashboard: [challenges.cloudflare.com](https://challenges.cloudflare.com)
- Create site → Get `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`

#### 5. Environment Variables
Create these keys for your projects (replace with actual values):
```
AUTH_SECRET=*** rand -hex 32)
RESEND_API_KEY=your-r...-key
TURNSTILE_SECRET_KEY=your-t...-key
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key
NEXT_PUBLIC_APP_URL=https://tepi.workers.dev
ADMIN_USER_ID=your-user-uuid-from-d1
```

---

## PROJECT STRUCTURE

### Repository 1: `tepi` (Static + Server)
```
tepi/
├── app/                    # Next.js application
│   ├── [locale]/          # i18n routes
│   ├── api/              # API routes
│   ├── components/       # UI components
│   └── lib/             # Shared utilities
├── lib/                   # Shared libraries
│   ├── auth.ts           # Cloudflare native auth
│   ├── db.ts             # D1 database utilities
│   ├── email.ts          # Email sending (Resend)
│   ├── turnstile.ts      # CAPTCHA verification
│   └── users.ts          # User management
├── migrations/            # D1 migrations
│   ├── 0001_initial.sql  # Original users table
│   └── 0010_cf_auth.sql  # Auth migration (username, password, email_verified)
├── .env.example          # Environment template
├── cloudflare-env.d.ts   # TypeScript interfaces
├── next.config.ts        # Next.js config
└── wrangler.toml        # Cloudflare Workers config
```

### Repository 2: `ChatKu` (Mobile Backend)
```
ChatKu/
├── server/              # Hono server
│   ├── src/
│   │   ├── routes/     # API routes
│   │   ├── middleware/ # Auth middleware
│   │   └── config/     # Environment config
├── package.json
├── wrangler.jsonc       # Cloudflare Workers config
└── migrations/
    └── 0001_initial.sql # D1 schema for ChatKu
```

---

## DEPLOYMENT STEPS

### Phase 1: GitHub Actions Setup

#### Step 1.1: Configure GitHub Secrets

For **ChatKu** repository:
1. Go to `https://github.com/AraZharr/ChatKu/settings/secrets-and-variables/actions`
2. Add these secrets:
   - `CLOUDFLARE_API_TOKEN` (Cloudflare API token with Workers/ Pages permissions)
   - `CLOUDFLARE_ACCOUNT_ID` (your Cloudflare account ID)
   - `CLOUDFLARE_ZONE_ID` (your domain zone ID)
   - `CLOUDFLARE_API_TOKEN` (for DNS management)

For **Tepi** repository:
1. Go to `https://github.com/AraZharr/tepi/settings/secrets-and-variables/actions`
2. Add these secrets:
   - `AUTH_SECRET` (generated with `openssl rand -hex 32`)
   - `RESEND_API_KEY` (from Resend dashboard)
   - `TURNSTILE_SECRET_KEY`
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `NEXT_PUBLIC_APP_URL` (will be updated after first deploy)
   - `ADMIN_USER_ID` (get from D1 after first user creation)

#### Step 1.2: GitHub Workflow File

In `tepi/.github/workflows/` create `backend-deploy.yml`:

```yaml
name: Deploy ChatKu Backend

on:
  workflow_dispatch:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: '**/package-lock.json'

      - name: Install Dependencies
        run: npm ci

      - name: Type Check
        run: npx tsc --noEmit

      - name: Cloudflare Workers Login
        run: npxwrangler login

      - name: Deploy to Cloudflare Workers
        run: |
          npx wrangler deploy --config wrangler.jsonc
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Update NEXT_PUBLIC_APP_URL
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://$GITHUB_REPO_NAME.workers.dev;" .env.example
          git add .env.example
          git commit -m "Update NEXT_PUBLIC_APP_URL after deploy"
          git push
        env:
          GITHUB_REPO_NAME: ${{ github.repository }}
```

#### Step 1.3: Update ChatKu Workflow (Optional)

For faster CI, update ChatKu workflow to use environment variables from Tepi deploy.

---

## DEPLOYMENT STEPS

### Phase 2: Cloudflare Configuration

#### Step 2.1: D1 Database Setup

**For Tepi:**
1. Go to [Cloudflare D1](https://dash.cloudflare.com/?account=61ab4b716cac58107abb06ba8619d7e6&d1/database/list)
2. Click "Create Database"
3. Database ID: `ba5ea207-393f-478b-9f69-9a3f2568e03c` ⚠️ **Update in wrangler.toml**
4. Execute migrations:
   - Copy `tepi/migrations/0001_initial.sql` → Console → Execute
   - Copy `tepi/migrations/0010_cf_auth.sql` → Console → Execute

**For ChatKu:**
1. Same D1 dashboard → "Create Database"
2. Database ID: `b6acb9e2-9685-4407-8f47-d069e81e0435` ⚠️ **Update in wrangler.jsonc**
3. Execute migration:
   - Copy `ChatKu/server/migrations/0001_initial.sql` → Console → Execute

#### Step 2.2: Pages Deployment

**For Tepi:**
1. Go to [Cloudflare Pages](https://pages.cloudflare.com)
2. Connect GitHub repository: `AraZharr/tepi`
3. Build command: `npm run build`
4. Output directory: `.next`
5. Environment Variables:
   ```
   AUTH_SECRET=***
   RESEND_API_KEY=***
   TURNSTILE_SECRET_KEY=your-t...cret
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site
   NEXT_PUBLIC_APP_URL=https://tepi.workers.dev
   ADMIN_USER_ID=your-admin-uuid
   ```
6. Target environment: Production

#### Step 2.3: Workers Deployment

**For ChatKu:**
1. Go to [Cloudflare Workers](https://workers.cloudflare.com)
2. Connect GitHub repository: `AraZharr/ChatKu`
3. Build command: `npm run build`
4. Entry point: `server/src/index.ts`
5. Service bindings:
   ```json
   {
     "name": "chatku-server",
     "bindings": [
       {
         "name": "DB",
         "type": "d1",
         "database_id": "b6acb9e2-9685-4407-8f47-d069e81e0435"
       }
     ]
   }
   ```

### Phase 3: Post-Deploy Setup

#### Step 3.1: Resend Domain Configuration

1. Go to [Resend](https://resend.com)
2. Domains → Add domain `tepi.my.id`
3. DNS records:
   ```
   v=spf1 include:_spf.resend.com ~all
   @ IN TXT v=spf1 include:_spf.resend.com ~all
   @.domainkey IN MX 10 inbound.mx.resendmail.com
   ```

#### Step 3.2: Turnstile Configuration

1. Go to [Turnstile](https://challenges.cloudflare.com)
2. Add site: domain `tepi.my.id`
3. Site key → Copy to `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
4. Secret key → Copy to `TURNSTILE_SECRET_KEY`

#### Step 3.3: Environment Variables Update

After successful Pages deploy, update environment variables:

**For both repositories:**
```
NEXT_PUBLIC_APP_URL=https://tepi.pages.dev
```

**For Tepi only:**
```
NEXT_PUBLIC_ROOT_DOMAIN=tepi.my.id
```

---

## VERIFICATION & TESTING

### Step 4.1: Website Testing

#### 1. Local Development (Optional)
```bash
# In tepi folder
npm run dev

# Visit http://localhost:3000
```

#### 2. Live Site Testing
- **Homepage:** `https://tepi.pages.dev`
- **Login Page:** `https://tepi.pages.dev/[locale]/login`
- **Register Page:** `https://tepi.pages.dev/[locale]/register`
- **Dashboard:** `https://tepi.pages.dev/dashboard`

#### 3. API Testing
- **Auth API:** `https://tepi.pages.dev/api/auth`
- **OTP API:** `https://tepi.pages.dev/api/auth/otp`
- **Subdomains API:** `https://tepi.pages.dev/api/user/subdomains`

### Step 4.2: ChatKu Backend Testing

#### 1. Workers Health Check
```bash
curl -X GET "https://chatku-server.workers.dev/"
# Expected: {"status": "ok", "service": "chatku"}
```

#### 2. Database Operations
```bash
# Test user registration
curl -X POST "https://chatku-server.workers.dev/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password": "***","username":"testuser","full_name":"Test User"}'
```

---

## TROUBLESHOOTING COMMON ISSUES

### Issue 1: "Next Public App URL Not Set"
**Error:** `NEXT_PUBLIC_APP_URL not defined in environment`
**Solution:**
1. Check GitHub Actions logs for deployment failures
2. Verify environment variables set correctly in Cloudflare Pages
3. Update `.env.example` manually if needed:
   ```bash
   sed -i 's|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://your-url.workers.dev;|' .env.example
   ```

### Issue 2: "OTP Sending Failed"
**Error:** "Failed to send OTP email"
**Solution:**
1. Verify `RESEND_API_KEY` is correct
2. Check Resend quota (3,000/month free)
3. Ensure email `to` address is valid
4. Verify Turnstile CAPTCHA validation

### Issue 3: "Database Migration Failed"
**Error:** "SQLITE_ERROR: table users already exists"
**Solution:**
1. Use `IF NOT EXISTS` in migration SQL
2. Check if migration already ran
3. Verify D1 database is fresh/clean

### Issue 4: "Authentication Issues"
**Error:** "User not found" or "Invalid credentials"
**Solution:**
1. Check `AUTH_SECRET` consistency between frontend and backend
2. Verify session token format
3. Check D1 user table structure

---

## DEPLOYMENT MAINTENANCE

### Regular Tasks

#### Monthly
```bash
# Check Resend email quota
# (automatic via Resend dashboard)

# Verify D1 database usage
# via Cloudflare D1 dashboard
```

#### Quarterly
```bash
# Update dependencies
npm update

# Clean up unused migrations
# Remove old migration files
```

#### Security
```bash
# Rotate sensitive keys
# 1. Generate new AUTH_SECRET
# 2. Regenerate RESEND_API_KEY
# 3. Update env variables in Cloudflare
```

### Monitoring
1. Set up Cloudflare Workers observability:
   - Request logs
   - Error tracking
   - Performance metrics

2. Set up Resend delivery notifications

### Backup Strategy
1. Export D1 database periodically
2. Keep backup of GitHub repository
3. Store sensitive keys securely (not in version control)

---

## QUICK START CHECKLIST

### Before Starting
- [ ] Cloudflare account with Workers/Pages permissions
- [ ] GitHub account with both repositories
- [ ] Resend account with API key
- [ ] Turnstile account with site/secret keys
- [ ] Domain `tepi.my.id` if needed

### During Setup
- [ ] Generate `AUTH_SECRET`
- [ ] Set all environment variables in GitHub Actions
- [ ] Execute both D1 migrations
- [ ] Configure Pages for Tepi
- [ ] Configure Workers for ChatKu
- [ ] Set up Resend domain
- [ ] Configure Turnstile
- [ ] Run GitHub Actions workflow

### After Deployment
- [ ] Test login/register flow
- [ ] Test API endpoints
- [ ] Verify email OTP
- [ ] Check Turnstile CAPTCHA
- [ ] Update `NEXT_PUBLIC_APP_URL`
- [ ] Verify subdomain management
- [ ] Test payment flow

---

## HELP & SUPPORT

### Issues
1. Check GitHub Actions logs for detailed error
2. Verify Cloudflare dashboard for deployment status
3. Check Resend dashboard for email delivery status
4. Review browser console for client-side errors

### Contact
For deployment issues, provide:
- GitHub Actions log output
- Cloudflare dashboard screenshots
- Error messages (exact text)
- Environment variable status

---

**Generated on:** 2025-07-16
**Author:** Automated Deployment Guide
**For:** AraZharr Development Team
**Last Updated:** 2025-07-16
```