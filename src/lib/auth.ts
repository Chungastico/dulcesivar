import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import { serverEnv } from "@/lib/env";

/**
 * Control de acceso al panel admin.
 *
 * El middleware solo garantiza que haya una sesión de Clerk iniciada. Cualquiera
 * puede crearse una cuenta, así que la puerta real es esta: el correo verificado
 * del usuario debe coincidir con ADMIN_EMAIL.
 *
 * Se comprueba aquí (servidor) y no en el cliente, porque una comprobación en el
 * navegador se puede saltar.
 */

/** El usuario de Clerk actual, si su correo verificado es el del admin. */
export async function getAdminUser() {
  const user = await currentUser();
  if (!user) return null;

  const { adminEmail } = serverEnv();

  // Solo cuenta el correo primario, y solo si está verificado: si no exigimos
  // verificación, cualquiera podría registrarse escribiendo el correo del admin.
  const primary = user.primaryEmailAddress;
  const isVerified = primary?.verification?.status === "verified";
  const matches = primary?.emailAddress?.toLowerCase() === adminEmail;

  return isVerified && matches ? user : null;
}

/** True si hay sesión y es la del admin. */
export async function isAdmin(): Promise<boolean> {
  return (await getAdminUser()) !== null;
}

/**
 * Exige sesión de admin. Úsalo al inicio de cada página del panel y de cada
 * Server Action que escriba datos: el layout protege las páginas, pero las
 * acciones se invocan por su cuenta y nadie más las cubre.
 *
 * Distingue los dos casos a propósito:
 *   - Sin sesión -> redirige al login. No es un error: las páginas del panel se
 *     renderizan en paralelo con su layout, así que si esto lanzara, cada
 *     visita anónima ensuciaría los logs con un stack trace.
 *   - Con sesión pero otro correo -> lanza. Aquí sí es una anomalía: el layout
 *     ya debería haber mostrado "acceso denegado", y llegar hasta acá significa
 *     que alguien invocó la acción por fuera de la UI.
 */
export async function requireAdmin() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) redirectToSignIn();

  const user = await getAdminUser();
  if (!user) {
    throw new Error("No autorizado: se requiere la cuenta de administrador.");
  }
  return user;
}
