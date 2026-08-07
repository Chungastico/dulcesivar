"use server";

import { requireAdmin } from "@/lib/auth";

/**
 * Propone qué etiquetas de clasificación le corresponden a un regalo, mirando
 * su foto.
 *
 * No pretende acertar siempre: es una primera pasada para que la clienta
 * corrija en vez de marcar veinte casillas desde cero. Por eso la interfaz las
 * muestra como sugeridas y no como decididas.
 */

const MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-5.6-luna";
const FALLBACK_MODEL = "mistralai/mistral-small-3.2-24b-instruct";
const MAX_TOKENS = 900;
const TIMEOUT_MS = 30_000;

export type TagGroupInput = {
  slug: string;
  name: string;
  values: { slug: string; name: string }[];
};

export type SuggestTagsResult = {
  /** Slugs de valores propuestos, por eje. */
  picked?: Record<string, string[]>;
  error?: string;
};

function buildPrompt(groups: TagGroupInput[]): string {
  const catalogo = groups
    .map(
      (g) =>
        `${g.slug} (${g.name}): ${g.values.map((v) => v.slug).join(", ")}`,
    )
    .join("\n");

  return [
    "Clasificas regalos armados de una tienda salvadoreña mirando su foto.",
    "",
    "Estas son las categorías disponibles y sus opciones válidas:",
    catalogo,
    "",
    "Devuelve SOLO un objeto JSON donde cada clave sea el nombre de una",
    "categoría y su valor un arreglo con las opciones que apliquen.",
    'Ejemplo de formato: {"ocasion":["cumpleanos"],"tipo-caja":["morning-box"]}',
    "",
    "Reglas:",
    "- Usa únicamente los identificadores listados arriba, tal cual están escritos.",
    "- Marca solo lo que se vea o se deduzca con confianza razonable.",
    "- Si una categoría no aplica o no estás seguro, omítela o déjala vacía.",
    "- En «contenido» marca lo que veas dentro de la caja (flores, globos,",
    "  peluche, chocolates, vaso o taza, licor, semillas).",
    "- No expliques nada. Responde solo el JSON, sin bloques de código.",
  ].join("\n");
}

/** Extrae el JSON aunque el modelo lo envuelva en texto o en ```json. */
function parseJsonObject(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function readContent(message: unknown): string {
  if (!message || typeof message !== "object") return "";
  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p) =>
        typeof p === "string" ? p : ((p as { text?: string })?.text ?? ""),
      )
      .join("");
  }
  return "";
}

async function callModel(
  apiKey: string,
  model: string,
  prompt: string,
  imageDataUrl: string,
  signal: AbortSignal,
): Promise<{ text?: string; error?: string }> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 402) {
      return { error: "La cuenta de OpenRouter se quedó sin saldo." };
    }
    return { error: `El servicio respondió ${response.status}.` };
  }

  const data = await response.json();
  return { text: readContent(data?.choices?.[0]?.message).trim() };
}

export async function suggestTags(
  imageDataUrl: string,
  groups: TagGroupInput[],
): Promise<SuggestTagsResult> {
  await requireAdmin();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { error: "Falta OPENROUTER_API_KEY en el servidor." };
  if (!imageDataUrl.startsWith("data:image/")) {
    return { error: "La imagen no es válida." };
  }
  if (groups.length === 0) return { picked: {} };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const prompt = buildPrompt(groups);

  try {
    let attempt = await callModel(
      apiKey,
      MODEL,
      prompt,
      imageDataUrl,
      controller.signal,
    );

    if (!attempt.error && !attempt.text && MODEL !== FALLBACK_MODEL) {
      attempt = await callModel(
        apiKey,
        FALLBACK_MODEL,
        prompt,
        imageDataUrl,
        controller.signal,
      );
    }

    if (attempt.error) return { error: attempt.error };
    if (!attempt.text) {
      return { error: "El modelo no devolvió nada. Marca las etiquetas a mano." };
    }

    const parsed = parseJsonObject(attempt.text);
    if (!parsed) {
      return { error: "No se entendió la respuesta. Marca las etiquetas a mano." };
    }

    // Se descarta todo lo que no exista en la taxonomía real: el modelo a veces
    // inventa identificadores plausibles, y aceptarlos marcaría etiquetas que
    // no existen o, peor, dejaría pasar basura a la base.
    const picked: Record<string, string[]> = {};
    for (const group of groups) {
      const valid = new Set(group.values.map((v) => v.slug));
      const raw = parsed[group.slug];
      const list = Array.isArray(raw) ? raw : [];
      const kept = list
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim().toLowerCase())
        .filter((v) => valid.has(v));
      if (kept.length) picked[group.slug] = [...new Set(kept)];
    }

    return { picked };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { error: "El servicio tardó demasiado. Intenta de nuevo." };
    }
    return { error: "No se pudo contactar el servicio." };
  } finally {
    clearTimeout(timer);
  }
}
