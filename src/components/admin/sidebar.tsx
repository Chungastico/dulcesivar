"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = {
  href: "/admin" | "/admin/catalogo" | "/admin/categorias";
  label: string;
  icon: React.ReactNode;
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Panel", icon: <IconHome /> },
  { href: "/admin/catalogo", label: "Catálogo", icon: <IconBox /> },
  { href: "/admin/categorias", label: "Categorías", icon: <IconTag /> },
];

export function Sidebar({ userSlot }: { userSlot: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Barra superior: solo en móvil, donde el sidebar se oculta. */}
      <div className="flex items-center gap-3 border-b border-line bg-brand-green px-4 py-3 text-white lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="rounded-md p-1.5 hover:bg-white/10"
        >
          <IconMenu />
        </button>
        <span className="font-semibold">Dulces Sivar</span>
      </div>

      {open ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-brand-green transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/admin" className="flex flex-col" onClick={() => setOpen(false)}>
            <span className="text-lg font-semibold text-white">
              Dulces Sivar
            </span>
            <span className="text-xs text-brand-lime">Panel de administración</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <IconClose />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={() => setOpen(false)} />
          ))}
        </nav>

        <div className="flex flex-col gap-3 border-t border-white/15 px-5 py-4">
          <Link
            href="/catalogo"
            target="_blank"
            className="text-sm text-white/80 hover:text-white"
          >
            Ver catálogo público ↗
          </Link>
          <div className="flex items-center gap-2">{userSlot}</div>
        </div>
      </aside>
    </>
  );
}

function NavLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  // "/admin" solo se marca activo en coincidencia exacta; si no, quedaría
  // encendido en todas las subrutas del panel a la vez.
  const active =
    item.href === "/admin"
      ? pathname === "/admin"
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
        active
          ? "bg-white/15 font-medium text-white"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      {/* Barra lima a la izquierda: el estado activo no depende solo del
          cambio de fondo, que es sutil sobre verde oscuro. */}
      <span
        aria-hidden
        className={`h-5 w-0.5 rounded-full ${active ? "bg-brand-lime" : "bg-transparent"}`}
      />
      {item.icon}
      {item.label}
    </Link>
  );
}

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconHome() {
  return (
    <svg {...iconProps}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg {...iconProps}>
      <path d="M21 8v8a2 2 0 0 1-1 1.7l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.7l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function IconTag() {
  return (
    <svg {...iconProps}>
      <path d="M20.6 13.6 13.6 20.6a2 2 0 0 1-2.8 0l-7.4-7.4A2 2 0 0 1 2.8 12V4.8A2 2 0 0 1 4.8 2.8H12a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 3Z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg {...iconProps} width={22} height={22}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg {...iconProps} width={20} height={20}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
