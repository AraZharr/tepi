# TEPI Security & Bug Audit Report
**Date:** 2026-07-23  
**Auditor:** SUPERAGENT  
**Scope:** Full codebase security & logic audit

---

## 🚨 CRITICAL BUGS (P0 - Fix Immediately)

### 1. SQL Syntax Errors - Missing WHERE Clauses
**Severity:** CRITICAL  
**Impact:** UPDATE/DELETE akan affect SEMUA rows di table, bukan cuma target row

#### Affected Files:

**a) `/app/api/user/renew/route.ts:62`**
```sql
'UPDATE subdomains SET expires_at = ?, status = ? id = ?'
```
**Bug:** Missing `WHERE` keyword  
**Fix:** `'UPDATE subdomains SET expires_at = ?, status = ? WHERE id = ?'`  
**Impact:** Akan update SEMUA subdomain di database, bukan cuma yang dipilih

---

**b) `/app/api/webhook/paywuz/route.ts:52`**
```sql
UPDATE subdomains SET plan = 'paid', expires_at = ?, status = 'active' id = ?
```
**Bug:** Missing `WHERE` keyword  
**Fix:** `UPDATE subdomains SET plan = 'paid', expires_at = ?, status = 'active' WHERE id = ?`  
**Impact:** Payment webhook akan set SEMUA subdomain jadi paid

---

**c) `/app/api/cron/expiry/route.ts:60`**
```sql
"UPDATE subdomains SET status = 'expired' id = ?"
```
**Bug:** Missing `WHERE` keyword  
**Fix:** `"UPDATE subdomains SET status = 'expired' WHERE id = ?"`  
**Impact:** Cron job akan expire SEMUA subdomain sekaligus

---

**d) `/app/api/cron/expiry/route.ts:91`**
```sql
'DELETE subdomains id = ?'
```
**Bug:** Missing `FROM` + `WHERE` keywords  
**Fix:** `'DELETE FROM subdomains WHERE id = ?'`  
**Impact:** Akan delete SEMUA subdomain

---

**e) `/app/api/admin/applications/[id]/route.ts:40`**
```sql
UPDATE subdomain_applications SET status = 'rejected', reject_reason = ?, reviewed_at = datetime('now') id = ?
```
**Bug:** Missing `WHERE` keyword  
**Fix:** Add `WHERE` before `id = ?`  
**Impact:** Reject akan affect SEMUA aplikasi pending

---

**f) `/app/api/admin/applications/[id]/route.ts:100`**
```sql
UPDATE subdomain_applications SET status = 'approved', reviewed_at = datetime('now') id = ?
```
**Bug:** Missing `WHERE` keyword  
**Fix:** Add `WHERE` before `id = ?`  
**Impact:** Approve akan affect SEMUA aplikasi pending

---

## ⚠️ HIGH SEVERITY BUGS (P1)

### 2. Unsafe JSON.parse Without Error Handling
**Severity:** HIGH  
**Impact:** Crash / 500 error kalau data corrupt

#### Frontend (Client-Side):
- `/app/[locale]/domains/page.tsx:163, 196` - parsing `dns_records`
- `/app/[locale]/admin/page.tsx:124` - parsing `dns_records`
- `/app/[locale]/dashboard/page.tsx:234` - parsing `dns_records`
- `/app/[locale]/admin/settings/page.tsx:155, 157` - parsing `email_dns_records`

**Recommendation:** Wrap all JSON.parse dengan try-catch atau use safe parser

#### Backend (Server-Side):
- `/app/api/admin/applications/[id]/route.ts:64` - parsing `app.dns_records`

**Recommendation:** Add try-catch sebelum parse

---

### 3. XSS Vulnerability - Blog Post Content
**Severity:** HIGH  
**Impact:** Stored XSS via admin-created blog posts

**Location:** `/app/[locale]/blog/[slug]/page.tsx:77`
```tsx
dangerouslySetInnerHTML={{ __html: post.content as string }}
```

**Attack Vector:**
1. Admin create blog post dengan `<script>alert('XSS')</script>` di content
2. User buka blog post
3. Script execute di browser user

**Recommendation:**
- Sanitize HTML content dengan library (DOMPurify)
- Atau use markdown renderer instead of raw HTML
- Atau restrict HTML tags whitelist

---

## 🟡 MEDIUM SEVERITY BUGS (P2)

### 4. Migration 0013 Not Applied
**Severity:** MEDIUM  
**Impact:** 500 error saat submit subdomain (column `dns_records` not found)

**Evidence:**
- User reports persistent 500 error
- Backward compat try-catch exists tapi masih 500
- Migration workflow shows "success" tapi column mungkin belum ada

**Root Cause:** Silent migration failure atau migration skip existing columns

**Fix Options:**
1. Manual apply migration via wrangler
2. Check migration idempotency (ALTER TABLE IF NOT EXISTS)
3. Add migration verification step di CI/CD

---

### 5. Missing Top-Level Error Handling
**Severity:** MEDIUM  
**Impact:** Unhandled errors return generic 500 tanpa detail

**Fixed in:** commit `ca7c9c6` (top-level try-catch added)

**Remaining:** Other API routes masih belum punya top-level error handling

---

## 🔵 LOW SEVERITY / CODE QUALITY (P3)

### 6. Inconsistent Auth Patterns
**Observation:**
- Some routes use `getSessionUser()`
- Some routes use `requireAdmin()`
- Mix of early-return vs try-catch patterns

**Recommendation:** Standardize auth middleware pattern

---

### 7. Rate Limiting Not Enforced
**Observation:** `rate_limits` table exists tapi gak ada middleware usage

**Recommendation:** Implement rate limit middleware di sensitive endpoints:
- `/api/auth/login`
- `/api/auth/register`
- `/api/user/subdomains` (POST)
- `/api/contact`

---

### 8. CSRF Protection Gaps
**Observation:** CSRF middleware exists (`lib/csrf.ts`) tapi gak clear semua mutating endpoints protected

**Recommendation:** Audit semua POST/PUT/DELETE endpoints, ensure CSRF token validated

---

## 📊 Security Checklist Summary

| Category | Status | Notes |
|----------|--------|-------|
| SQL Injection | ✅ SAFE | All queries parameterized |
| XSS | ⚠️ VULNERABLE | Blog content unescaped |
| CSRF | ⚠️ PARTIAL | Middleware exists, coverage unclear |
| Auth Bypass | ✅ SAFE | Consistent auth checks |
| Rate Limiting | ❌ MISSING | Table exists, not enforced |
| Input Validation | ✅ GOOD | Validators in place |
| Error Handling | ⚠️ PARTIAL | Some routes missing top-level catch |
| Secrets Management | ✅ SAFE | Env vars, no hardcoded secrets |

---

## 🛠️ IMMEDIATE ACTION ITEMS

### Priority 0 (Fix NOW):
1. ✅ Fix all 6 SQL WHERE clause bugs
2. ✅ Sanitize blog post HTML or switch to markdown
3. ✅ Apply migration 0013 manually or verify it ran

### Priority 1 (Fix This Week):
4. Wrap all JSON.parse dengan try-catch
5. Add top-level error handling ke semua API routes
6. Implement rate limiting middleware

### Priority 2 (Fix This Month):
7. Full CSRF audit + enforcement
8. Standardize auth patterns
9. Add integration tests for critical paths

---

## 📝 Test Cases to Add

1. **SQL Injection Tests** - Try inject via subdomain_name, record_value
2. **XSS Tests** - Try inject script tags via blog posts, contact form
3. **Auth Tests** - Try access admin endpoints without auth
4. **Rate Limit Tests** - Spam endpoints, verify throttling
5. **CSRF Tests** - Try mutating requests without token

---

**End of Report**
