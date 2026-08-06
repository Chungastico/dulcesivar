import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Antes se llamaba `middleware.ts`; Next 16 renombró la convención a `proxy.ts`.
 *
 * Aquí NO se decide quién entra. Clerk desaconseja proteger por coincidencia de
 * rutas (`createRouteMatcher`, ya deprecado): el path que ve el proxy puede
 * diverger de cómo Next resuelve la petición y dejar recursos alcanzables.
 *
 * Este archivo solo monta el contexto de sesión para que `auth()` funcione. El
 * control real vive junto al dato que protege:
 *   - src/app/admin/(protected)/layout.tsx  -> las páginas del panel
 *   - requireAdmin() en src/lib/auth.ts     -> cada Server Action
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    // Todas las rutas menos archivos estáticos e internos de Next.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Siempre en API y rutas de servidor.
    "/(api|trpc)(.*)",
  ],
};
