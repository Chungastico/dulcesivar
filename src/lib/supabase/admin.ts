import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Cliente administrativo de Supabase (secret key).
 *
 * IGNORA las políticas RLS: puede leer y escribir todo. Solo debe usarse
 * detrás de `requireAdmin()` en Server Actions y Route Handlers del panel.
 *
 * El import de "server-only" hace que el build falle si algún día este archivo
 * termina importado desde un Client Component.
 */
export function supabaseAdmin() {
  return createClient<Database>(
    publicEnv.supabaseUrl,
    serverEnv().supabaseSecretKey,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
