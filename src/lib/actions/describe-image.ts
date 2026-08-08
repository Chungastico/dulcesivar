"use server";

import { requireAdmin } from "@/lib/auth";

/**
 * Sugiere una descripción de venta a partir de la foto del producto.
 *
 * La sugerencia se devuelve al formulario para que se edite antes de guardar:
 * el tono de venta lo pone la dueña del catálogo, no el modelo. Nunca se
 * guarda sola.
 *
 * La imagen llega ya reducida desde el navegador (ver downscale-image): mandar
 * la foto original de varios MB sería lento y se cobraría de más sin mejorar el
 * resultado, porque el modelo la reescala igual.
 */

/**
 * Modelo elegido midiendo: con la misma foto y prompt, Luna cobró 313 tokens de
 * entrada contra los 1391 de Gemini Flash (6.6x más caro) y describió mejor.
 */
const MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-5.6-luna";

/**
 * Respaldo para cuando el principal devuelve vacío.
 *
 * Luna razona antes de responder, y esos tokens salen del mismo presupuesto que
 * la respuesta: se midieron entre 31 y 72 tokens de razonamiento para la misma
 * tarea, así que una foto cargada puede consumir el cupo y dejar el texto en
 * blanco. Mistral no razona, por lo que no tiene ese modo de fallo.
 */
const FALLBACK_MODEL = "mistralai/mistral-small-3.2-24b-instruct";

/**
 * Holgado a propósito. La respuesta ronda los 70 tokens; el resto es colchón
 * para el razonamiento. A este precio, subirlo no se nota en la factura y
 * evita el fallo por presupuesto agotado.
 */
const MAX_TOKENS = 600;
const TIMEOUT_MS = 25_000;

/**
 * La foto es de un pedido ya entregado. Todo lo que la hace única a ESE pedido
 * sobra en un catálogo, porque el siguiente comprador lo pedirá distinto:
 *   - la personalización (un nombre grabado, una dedicatoria, una fecha);
 *   - el adorno de esa entrega (el moño, el papel, el relleno);
 *   - y el color, que se elige por encargo: ese globo azul puede salir rojo.
 *
 * Lo único estable entre unidades es QUÉ artículos van dentro. El prompt se
 * limita a eso.
 */
const PROMPT = [
  "Eres quien redacta el catálogo de DulceSivar, una tienda salvadoreña de",
  "regalos armados.",
  "Escribe UNA sola oración de venta en español neutro de El Salvador, de 15 a",
  "25 palabras, sobre el regalo de la foto.",
  "",
  "NOMBRA los artículos principales que van dentro (peluche, chocolates,",
  "globo, termo, vaso, taza, flores, tarjeta, caja).",
  "",
  "NO menciones NINGÚN color. El color se elige por encargo y cambia en cada",
  "pedido, así que decirlo desinforma a quien lee el catálogo.",
  "Tampoco menciones nombres propios, dedicatorias, fechas ni texto escrito",
  "sobre nada; ni moños, lazos, papel o relleno; ni la palabra «personalizado»",
  "más de una vez.",
  "",
  "Ejemplo CORRECTO: «Caja de regalo con peluche, chocolates y globo, un",
  "detalle encantador para sorprender a quien más quieres.»",
  "Ejemplo INCORRECTO: «Caja de regalo con peluche café, chocolates y globo",
  "azul con dedicatoria, y moño azul.»",
  "",
  "No inventes precios, marcas ni cantidades que no se vean con claridad.",
  "No empieces con «Esta imagen muestra» ni describas el fondo ni la mesa.",
  "Responde únicamente con la oración, sin comillas.",
].join(" ");

export type DescribeResult = { description?: string; error?: string };

type Attempt = { text?: string; error?: string; finish?: string };

/** Algunos proveedores devuelven el contenido troceado en vez de como string. */
function readContent(message: unknown): string {
  if (!message || typeof message !== "object") return "";
  const content = (message as { content?: unknown }).content;

  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "string"
          ? part
          : ((part as { text?: string })?.text ?? ""),
      )
      .join("");
  }
  return "";
}

async function callModel(
  apiKey: string,
  model: string,
  imageDataUrl: string,
  signal: AbortSignal,
): Promise<Attempt> {
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
            { type: "text", text: PROMPT },
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
    const detail = await response.text();
    return { error: `El servicio respondió ${response.status}. ${detail.slice(0, 120)}` };
  }

  const data = await response.json();
  const choice = data?.choices?.[0];
  const text = readContent(choice?.message).trim();

  return { text, finish: choice?.finish_reason };
}

export async function suggestDescription(
  imageDataUrl: string,
): Promise<DescribeResult> {
  await requireAdmin();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { error: "Falta OPENROUTER_API_KEY en el servidor." };
  if (!imageDataUrl.startsWith("data:image/")) {
    return { error: "La imagen no es válida." };
  }

  // Corta la espera si OpenRouter se cuelga: sin esto el botón giraría para
  // siempre. Cubre ambos intentos.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let attempt = await callModel(apiKey, MODEL, imageDataUrl, controller.signal);

    // Vacío no es un error del servicio, así que no basta con propagarlo:
    // se reintenta con el modelo que no razona antes de rendirse.
    if (!attempt.error && !attempt.text && MODEL !== FALLBACK_MODEL) {
      console.warn(
        `[describe-image] ${MODEL} devolvió vacío (finish=${attempt.finish}); reintentando con ${FALLBACK_MODEL}`,
      );
      attempt = await callModel(
        apiKey,
        FALLBACK_MODEL,
        imageDataUrl,
        controller.signal,
      );
    }

    if (attempt.error) return { error: attempt.error };

    if (!attempt.text) {
      return {
        error:
          "Ningún modelo pudo describir esta foto. Escribe la descripción a mano.",
      };
    }

    // El modelo a veces envuelve la frase en comillas pese al prompt.
    return { description: attempt.text.replace(/^["“”']|["“”']$/g, "") };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { error: "El servicio tardó demasiado. Intenta de nuevo." };
    }
    return { error: "No se pudo contactar el servicio de descripción." };
  } finally {
    clearTimeout(timer);
  }
}
