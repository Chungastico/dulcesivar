"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function ProductGallery({
  images,
  base,
  alt,
}: {
  images: { storage_path: string }[];
  base: string;
  alt: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomedIn, setZoomedIn] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  const active = images[activeIndex];

  useEffect(() => {
    if (!zoomOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [zoomOpen]);

  if (!active) return null;

  const openZoom = () => {
    setZoomedIn(false);
    setZoomOpen(true);
  };

  const toggleZoomedIn = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomedIn) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setOrigin(`${x}% ${y}%`);
    }
    setZoomedIn((z) => !z);
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={openZoom}
        className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl border border-line bg-brand-cream/40"
        aria-label="Ampliar imagen"
      >
        <Image
          src={`${base}/${active.storage_path}`}
          alt={alt}
          fill
          unoptimized
          sizes="(max-width: 1024px) 100vw, 480px"
          className="object-cover"
          priority
        />
        <span className="absolute bottom-2 right-2 rounded-full bg-black/50 p-2 text-white opacity-0 transition group-hover:opacity-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
          </svg>
        </span>
      </button>

      {images.length > 1 ? (
        <ul className="grid grid-cols-4 gap-2">
          {images.map((img, i) => (
            <li key={img.storage_path}>
              <button
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`relative block aspect-square w-full overflow-hidden rounded-lg border bg-brand-cream/40 transition ${
                  i === activeIndex ? "border-brand-green ring-2 ring-brand-green/40" : "border-line hover:border-brand-teal"
                }`}
                aria-label={`Ver imagen ${i + 1}`}
                aria-current={i === activeIndex}
              >
                <Image
                  src={`${base}/${img.storage_path}`}
                  alt=""
                  fill
                  unoptimized
                  sizes="120px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {zoomOpen ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onClick={() => !zoomedIn && setZoomOpen(false)}
        >
          <div className="flex items-center justify-between gap-2 p-3">
            {images.length > 1 ? (
              <p className="text-sm text-white/70">
                {activeIndex + 1} / {images.length}
              </p>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoomOpen(false);
              }}
              className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
              aria-label="Cerrar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div
            className={`relative flex-1 touch-pinch-zoom ${zoomedIn ? "overflow-auto" : "overflow-hidden"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              onClick={toggleZoomedIn}
              className={`flex min-h-full items-center justify-center ${zoomedIn ? "cursor-zoom-out" : "cursor-zoom-in"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- necesita tamaño natural para el zoom, no el modo `fill` de next/image */}
              <img
                src={`${base}/${active.storage_path}`}
                alt={alt}
                className="max-w-none select-none transition-transform duration-200"
                style={{
                  transformOrigin: origin,
                  transform: zoomedIn ? "scale(2.5)" : "scale(1)",
                  maxWidth: zoomedIn ? "none" : "100vw",
                  maxHeight: zoomedIn ? "none" : "100dvh",
                  width: zoomedIn ? "100vw" : "auto",
                  height: zoomedIn ? "auto" : "100dvh",
                  objectFit: "contain",
                }}
                draggable={false}
              />
            </div>
          </div>

          {images.length > 1 ? (
            <div
              className="flex gap-2 overflow-x-auto p-3"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, i) => (
                <button
                  key={img.storage_path}
                  type="button"
                  onClick={() => {
                    setActiveIndex(i);
                    setZoomedIn(false);
                  }}
                  className={`relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md border-2 transition ${
                    i === activeIndex ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                  aria-label={`Ver imagen ${i + 1}`}
                >
                  <Image
                    src={`${base}/${img.storage_path}`}
                    alt=""
                    fill
                    unoptimized
                    sizes="56px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
