import Link from "next/link";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

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
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-3">
          <Link href="/admin" className="font-semibold text-neutral-900">
            Dulces Sivar
            <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-500">
              admin
            </span>
          </Link>

          <nav className="flex items-center gap-5 text-sm text-neutral-600">
            <Link href="/admin/productos" className="hover:text-neutral-900">
              Productos
            </Link>
            <Link href="/admin/lineas" className="hover:text-neutral-900">
              Líneas
            </Link>
            <Link
              href="/catalogo"
              className="hover:text-neutral-900"
              target="_blank"
            >
              Ver catálogo ↗
            </Link>
            <UserButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}

function AccessDenied() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 p-6 text-center">
      <h1 className="text-xl font-semibold text-neutral-900">
        Esta cuenta no tiene acceso
      </h1>
      <p className="max-w-sm text-sm text-neutral-600">
        El panel de administración está restringido a una sola cuenta. Si crees
        que es un error, inicia sesión con el correo del administrador.
      </p>
      <SignOutButton redirectUrl="/admin/sign-in">
        <button className="mt-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700">
          Cerrar sesión
        </button>
      </SignOutButton>
    </main>
  );
}
