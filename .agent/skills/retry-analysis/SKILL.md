---
name: retry-analysis
description: >
  Retry a failed Voice DNA Snapshot analysis for a specific user via the admin
  endpoint. Use when user says "retry failed analysis", "re-run snapshot", or
  "analysis failed". Looks up user by email, verifies samples exist, calls the
  admin retry API, and reports results including email delivery status.
  Do NOT use for generating new profiles or general admin queries.
metadata:
  version: "1.0.0"
  author: emmanuel
allowed-tools: Bash, Read, Grep
---

# Admin Retry Voice DNA Analysis

Re-runs the Voice DNA Snapshot analysis for a user whose initial analysis failed.

## Usage

```
/retry-analysis user@example.com
```

## Steps

### 1. Look up the user

Query the Supabase `profiles` table to find the user by email and confirm they exist.

**Replace `USER_EMAIL_HERE` with the actual email address:**

```bash
npx tsx -e "
(async () => {
  const dotenv = await import('dotenv');
  dotenv.config({ path: '.env.local' });
  const { createClient } = await import('@supabase/supabase-js');
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await c.from('profiles').select('id, email').eq('email', 'USER_EMAIL_HERE').single();
  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
  console.log(JSON.stringify(data, null, 2));
})();
"
```

Save the returned `id` for the next step.

### 2. Check sample count

Verify the user has samples. **Replace `USER_ID_HERE` with the ID from step 1:**

```bash
npx tsx -e "
(async () => {
  const dotenv = await import('dotenv');
  dotenv.config({ path: '.env.local' });
  const { createClient } = await import('@supabase/supabase-js');
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { count, error } = await c.from('samples').select('*', { count: 'exact', head: true }).eq('user_id', 'USER_ID_HERE');
  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
  console.log('Sample count:', count);
})();
"
```

If count is 0, the user has no samples to analyze.

### 3. Call the admin retry endpoint

**Replace `USER_EMAIL_HERE` with the actual email address:**

First, extract the INTERNAL_API_KEY:
```bash
grep "INTERNAL_API_KEY" .env.local | cut -d'=' -f2
```

Then call the endpoint (replace `YOUR_KEY_HERE` with the key from above):

**Try localhost first (if dev server is running):**
```bash
curl -s -X POST http://localhost:3000/api/admin/retry-analysis \
  -H "Authorization: Bearer YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"userEmail":"USER_EMAIL_HERE"}'
```

**Or use production (if localhost fails):**
```bash
curl -s -X POST https://www.mywritingtwin.com/api/admin/retry-analysis \
  -H "Authorization: Bearer YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"userEmail":"USER_EMAIL_HERE"}'
```

### 4. Interpret the result

**Success response:**
```json
{
  "success": true,
  "snapshot": {
    "overallStyle": "...",
    "dimensionScores": {...}
  }
}
```

**Error responses:**

| Error | Meaning | Action |
|-------|---------|--------|
| `401 Unauthorized` | Invalid or missing API key | Check INTERNAL_API_KEY in .env.local |
| `404 User not found` | Email doesn't exist in profiles | Verify email spelling |
| `400 No samples found` | User has no writing samples | User needs to upload samples first |
| `529 Overloaded` | Anthropic API is overloaded | **Retry in 5-10 minutes** - transient issue |
| `500 Server error` | Analysis failed | Check server logs for details |

### 5. Report result

If successful:
- Show the `overallStyle` summary
- Confirm the snapshot email was sent to the user
- The user should receive the email within 1-2 minutes

If failed with 529 Overloaded:
- Explain this is a temporary Anthropic API capacity issue
- Suggest retrying in 5-10 minutes
- The user's data is safe, just needs to wait for API availability

## Important Notes

- The endpoint automatically sends the snapshot email to the user on success
- Failed API requests do NOT charge the user or consume retries
- The 529 Overloaded error is transient - just retry later
- All generated snapshots are stored in `voice_dna_snapshots` table

## Troubleshooting

**tsx command fails with "Top-level await" error:**
- ✓ Fixed in this version - uses async IIFE wrapper

**"supabaseUrl is required" error:**
- Check that `.env.local` exists and has `NEXT_PUBLIC_SUPABASE_URL`
- Verify the dotenv import is working

**curl returns empty response:**
- Check if dev server is running (try production URL instead)
- Verify INTERNAL_API_KEY is correct

**"Overloaded" error persists after 30+ minutes:**
- This is unusual - check Anthropic API status page
- Consider using a different time of day (off-peak hours)
