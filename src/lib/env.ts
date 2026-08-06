/**
 * Acceso centralizado a variables de entorno.
 * Falla temprano y con un mensaje claro si falta alguna, en vez de reventar
 * con un "undefined" a mitad de una consulta.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Revisa tu archivo .env.local (usa .env.local.example como referencia).`,
    );
  }
  return value;
}

/** Variables públicas: se inlinean en el bundle del navegador. */
export const publicEnv = {
  supabaseUrl: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  supabasePublishableKey: required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
};

/**
 * Variables privadas. Solo deben leerse desde código de servidor.
 * Importar este objeto desde un Client Component provocará un error de build.
 */
export function serverEnv() {
  return {
    supabaseSecretKey: required(
      "SUPABASE_SECRET_KEY",
      process.env.SUPABASE_SECRET_KEY,
    ),
    adminEmail: required("ADMIN_EMAIL", process.env.ADMIN_EMAIL).toLowerCase(),
  };
}
