import { SignOutButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

import { Sidebar } from "@/components/admin/sidebar";
import { getAdminUser } from "@/lib/auth";

/**
 * Shell del panel admin y puerta de entrada de todas sus páginas.
 *
 * Dos comprobaciones distintas, con respuestas distintas:
 *   1. Sin sesión -> al login (no es un error, solo falta identificarse).
 *   2. Con sesión pero otro correo -> acceso denegado (identificarse de nuevo
 *      no ayuda; hace falta LA cuenta).
 *
 * Vive dentro del route group (protected) a propósito: /admin/sign-in queda
 * fuera de este layout, si no la pantalla de login heredaría este gate y
 * mostraría "acceso denegado" sin dejar iniciar sesión nunca.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();

  const user = await getAdminUser();
  if (!user) return <AccessDenied />;

  return (
    <div className="flex min-h-screen flex-col bg-surface lg:flex-row">
      <Sidebar
        userSlot={
          <>
            <UserButton />
            <span className="truncate text-xs text-white/70">
              {user.primaryEmailAddress?.emailAddress}
            </span>
          </>
        }
      />

      <main className="w-full flex-1 px-5 py-8 lg:px-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

function AccessDenied() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface p-6 text-center">
      <h1 className="text-xl font-semibold text-brand-green">
        Esta cuenta no tiene acceso
      </h1>
      <p className="max-w-sm text-sm text-ink-muted">
        El panel de administración está restringido a una sola cuenta. Si crees
        que es un error, inicia sesión con el correo del administrador.
      </p>
      <SignOutButton redirectUrl="/admin/sign-in">
        <button className="mt-2 rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Cerrar sesión
        </button>
      </SignOutButton>
    </main>
  );
}
