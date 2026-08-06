import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Antes se llamaba `middleware.ts`; Next 16 renombró la convención a `proxy.ts`.
 *
 * Clerk solo custodia /admin. Todo el catálogo es público y no debe requerir
 * sesión: es lo que se comparte por link.
 *
 * Ojo: esto solo verifica que HAYA sesión. El filtro por correo del admin vive
 * en src/lib/auth.ts, porque este archivo corre en el edge y no tiene acceso
 * al correo verificado del usuario sin una llamada extra a la API.
 */
const isAdminRoute = createRouteMatcher([
  "/admin(.*)",
]);

// Las páginas de login/registro están dentro de /admin pero deben ser accesibles
// sin sesión; si no, no habría forma de iniciarla.
const isAuthRoute = createRouteMatcher([
  "/admin/sign-in(.*)",
  "/admin/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isAdminRoute(request) && !isAuthRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Todas las rutas menos archivos estáticos e internos de Next.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Siempre en API y rutas de servidor.
    "/(api|trpc)(.*)",
  ],
};
