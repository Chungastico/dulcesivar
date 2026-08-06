import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    // Las fotos de producto se sirven desde el bucket público de Supabase.
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  experimental: {
    serverActions: {
      // Las imágenes se suben por Server Action; el default de 1 MB deja fuera
      // cualquier foto de celular.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
