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
    // `proxy.ts` almacena las solicitudes en búfer antes de enviarlas a la
    // Server Action. Este límite supera el lote permitido por el formulario y
    // evita truncar el multipart antes de que Next procese las fotos.
    proxyClientMaxBodySize: "6mb",
    serverActions: {
      // Las fotos se comprimen en el navegador y el formulario limita el lote
      // a 4 MB para dejar margen al multipart.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
