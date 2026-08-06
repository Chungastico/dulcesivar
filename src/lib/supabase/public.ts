import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Cliente público de Supabase (publishable key).
 *
 * Respeta las políticas RLS: solo puede leer productos y líneas activos.
 * Es el que usa el catálogo público. Seguro de usar en el navegador.
 */
export const supabasePublic = createClient<Database>(
  publicEnv.supabaseUrl,
  publicEnv.supabasePublishableKey,
  {
    auth: {
      // El catálogo no tiene sesiones de Supabase Auth: la autenticación es Clerk.
      persistSession: false,
    },
  },
);

/** URL pública de una imagen guardada en el bucket de productos. */
export function productImageUrl(storagePath: string): string {
  return supabasePublic.storage
    .from("product-images")
    .getPublicUrl(storagePath).data.publicUrl;
}
