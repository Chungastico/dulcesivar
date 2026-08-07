"use server";

import { requireAdmin } from "@/lib/auth";

/**
 * Sugiere una descripción de venta a partir de la foto del producto.
 *
 * La sugerencia se devuelve al formulario para que se edite antes de guardar:
 * el tono de venta lo pone la dueña del catálogo, no el modelo. Nunca se
 * guarda sola.
 *
 * La imagen llega ya reducida desde el navegador (ver product-form): mandar la
 * foto original de 8 MB sería lento y se cobraría de más sin mejorar el
 * resultado, porque el modelo la reescala igual.
 */

/**
 * Elegido midiendo, no por hoja de precios: con la misma foto y el mismo
 * prompt, Luna cobró 313 tokens de entrada contra los 1391 de Gemini Flash
 * (6.6x más caro) y describió mejor lo que se ve. Mistral Small 3.2 es más
 * rápido y barato con calidad pareja, si algún día importa la latencia.
 * Configurable por entorno para poder cambiarlo sin tocar código.
 */
const MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-5.6-luna";
const TIMEOUT_MS = 25_000;

const PROMPT = [
  "Eres quien redacta el catálogo de Dulces Sivar, una tienda salvadoreña de",
  "regalos armados (cajas de regalo con dulces, flores, globos y artículos",
  "personalizados).",
  "Describe la foto en UNA sola oración de venta, en español neutro de El",
  "Salvador, máximo 25 palabras.",
  "No inventes precios, marcas ni cantidades que no se vean claramente.",
  "No empieces con «Esta imagen muestra» ni describas el fondo.",
  "Responde únicamente con la oración, sin comillas.",
].join(" ");

export type DescribeResult = { description?: string; error?: string };

export async function suggestDescription(
  imageDataUrl: string,
): Promise<DescribeResult> {
  await requireAdmin();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { error: "Falta OPENROUTER_API_KEY en el servidor." };
  }

  if (!imageDataUrl.startsWith("data:image/")) {
    return { error: "La imagen no es válida." };
  }

  // Corta la espera si OpenRouter se cuelga: sin esto el botón se quedaría
  // girando indefinidamente.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 120,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: PROMPT },
                { type: "image_url", image_url: { url: imageDataUrl } },
              ],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      // 402 es el caso realista aquí: la llave de OpenRouter tiene saldo fijo.
      if (response.status === 402) {
        return { error: "La cuenta de OpenRouter se quedó sin saldo." };
      }
      return {
        error: `El servicio respondió ${response.status}. ${detail.slice(0, 120)}`,
      };
    }

    const data = await response.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;

    if (!text?.trim()) {
      return { error: "El modelo no devolvió texto. Intenta de nuevo." };
    }

    // El modelo a veces envuelve la frase en comillas pese al prompt.
    return { description: text.trim().replace(/^["“”']|["“”']$/g, "") };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { error: "El servicio tardó demasiado. Intenta de nuevo." };
    }
    return { error: "No se pudo contactar el servicio de descripción." };
  } finally {
    clearTimeout(timer);
  }
}
