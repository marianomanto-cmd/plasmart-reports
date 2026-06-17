/**
 * Fondo "aurora" del tema Reactor Neon: tres blobs esmeralda/lima
 * difuminados que flotan lento + una grilla futurista enmascarada.
 * Fijo detrás de todo el contenido (z-0); el contenido va en z-10.
 * Decorativo → aria-hidden. Las animaciones respetan
 * prefers-reduced-motion vía globals.css.
 */
export function AuroraBackground() {
  return (
    <div className="aurora" aria-hidden="true">
      <div className="aurora__blob aurora__blob--a" />
      <div className="aurora__blob aurora__blob--b" />
      <div className="aurora__blob aurora__blob--c" />
      <div className="aurora__veil" />
      <div className="aurora__grid" />
    </div>
  );
}
