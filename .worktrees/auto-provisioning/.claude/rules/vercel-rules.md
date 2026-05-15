# Vercel / Next.js Rules

**Framework:** Next.js 16.2.0 with Turbopack
**Deployed at:** geo.heypearl.io

- The `middleware` file convention is deprecated in this version — use `proxy` instead (existing middleware.ts is grandfathered, do not create new ones)
- Always run `npm run build` before pushing — type errors fail the Vercel build silently with just "exit code 1"
- Stripe SDK: `apiVersion` must match the version string exported by the installed `stripe` package — check with `node -e "require('stripe').LATEST_API_VERSION |> console.log"` or omit the field entirely
- API route handlers must not crash at import time if env vars are missing — instantiate SDK clients inside the handler function, not at module scope, if they depend on env vars
- Cron jobs are defined in `vercel.json` — the main queue processor runs every 15 minutes at `/api/cron`
- Deploy command: `/opt/homebrew/bin/vercel --prod`
