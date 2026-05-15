# Deploy Checklist

Run before ANY deployment or marking a task done.

- Run `npm run build` locally and fix ALL errors before committing
- Check that every env var referenced in new code exists in Vercel (production + preview + development)
- If adding a new npm package, run `npm install [package]` before writing code that imports it
- If using an SDK (stripe, resend, supabase), check the apiVersion string matches the installed package — never hardcode a version, import it from the package or omit it to use the default
- After changing any API route, run the build before committing — type errors on Vercel waste deploy cycles
- New env vars go in `.env.local` AND Vercel via `printf 'value' | vercel env add KEY production` (use printf, never echo — echo appends \n and silently breaks APIs)
