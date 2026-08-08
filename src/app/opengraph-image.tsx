import { ImageResponse } from "next/og";

import { site } from "@/lib/site";

/**
 * La imagen que se ve cuando alguien pega un enlace del sitio en WhatsApp.
 *
 * Al vivir en la raíz de `app/`, la heredan todas las páginas que no definan
 * la suya: el catálogo y cada producto sí ponen su foto real, el resto cae
 * aquí. Se genera con las mismas variables de la marca, así que no hay un PNG
 * que actualizar a mano cuando cambie el eslogan.
 */
export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#025940",
          color: "#F2E6C2",
          fontSize: 32,
        }}
      >
        {/* Franja de marca, en el orden del logo. */}
        <div style={{ display: "flex", gap: 12, marginBottom: 48 }}>
          <div style={{ width: 120, height: 14, background: "#C2D914" }} />
          <div style={{ width: 60, height: 14, background: "#1FBFA2" }} />
          <div style={{ width: 30, height: 14, background: "#F28F16" }} />
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 92,
            fontWeight: 700,
            color: "#FFFFFF",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          {site.name}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 44,
            lineHeight: 1.25,
            maxWidth: 900,
          }}
        >
          Regalos personalizados y grabado láser en El Salvador
        </div>

        <div
          style={{
            display: "flex",
            marginTop: "auto",
            fontSize: 28,
            color: "#C2D914",
          }}
        >
          Cajas armadas a mano · Nombre grabado · Entrega a domicilio
        </div>
      </div>
    ),
    size,
  );
}
