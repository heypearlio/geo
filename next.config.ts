import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.pearlos.ai" }],
        destination: "https://pearlos.ai/:path*",
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Proxy Sentry requests through /monitoring to avoid ad-blockers
  tunnelRoute: "/monitoring",

  // Suppress non-CI build output
  silent: !process.env.CI,

  // Upload wider set of client source files for better stack traces
  widenClientFileUpload: true,

  // Source map uploads — add SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT
  // to Vercel env vars to enable readable stack traces in production.
  // Get auth token at: sentry.io/settings/auth-tokens/
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
