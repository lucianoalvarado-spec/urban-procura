"use client";

// Último recurso: solo se monta si el layout raíz mismo falla en renderizar. Reemplaza
// TODO el documento (html/body incluidos), así que usa estilos inline en vez de clases
// de Tailwind/variables de globals.css — si el layout raíz se rompió, no hay garantía
// de que esas hojas de estilo hayan llegado a cargar.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#eef1ec", color: "#1c2b33" }}>
        <div style={{ maxWidth: 480, margin: "96px auto", textAlign: "center", padding: "0 24px" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>Algo salió mal</h1>
          <p style={{ color: "#47575f", marginTop: 8, lineHeight: 1.5 }}>
            Ocurrió un error inesperado cargando Urban Procura. Intenta de nuevo — si persiste,
            recarga la página desde el navegador.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 16,
              background: "#b8410f",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 18px",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
