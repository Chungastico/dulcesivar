import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-neutral-50 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">Dulce Sivar</h1>
        <p className="mt-1 text-sm text-neutral-500">Panel de administración</p>
      </div>
      <SignIn />
    </main>
  );
}
