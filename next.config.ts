import type { NextConfig } from "next";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // The admin product form no longer posts image bytes: the browser
      // compresses each photo and uploads it straight to Supabase Storage over
      // a signed URL, and the submission carries only storage paths.
      //
      // This used to say 90mb, which was misleading — the hosting platform caps
      // a serverless function's request body at around 4.5MB regardless of what
      // Next's own parser is told to allow, so large submissions were rejected
      // at the edge before this setting was ever consulted. Keep this small: if
      // a form ever needs more, that is a sign it is about to hit the real cap.
      bodySizeLimit: "1mb",
    },
  },
  images: {
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
