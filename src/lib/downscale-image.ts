/**
 * Reduce una imagen en el navegador antes de mandarla al servicio de
 * descripción.
 *
 * Una foto de celular pesa varios MB; el modelo de visión la reescala de todos
 * modos, así que enviarla entera solo suma segundos de espera y costo. A 1024 px
 * de lado mayor y JPEG 0.8 el resultado ronda los 150 KB sin perder detalle
 * relevante para describir la caja.
 */
const MAX_SIDE = 1024;
const QUALITY = 0.8;

export async function downscaleToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo procesar la imagen.");

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", QUALITY);
}
