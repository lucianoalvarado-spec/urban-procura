import type {
  NivelMatch,
  PreferenciasProveedor,
  Proceso,
  ResultadoMatch,
  Proveedor,
} from "@/lib/data/types";

// Módulo 4 — Matching Inteligente.
// Heurística simple y explicable a propósito: el usuario debe poder ver
// exactamente qué sumó y qué faltó, no solo un número.

const PESOS = {
  region: 20,
  rubro: 20,
  monto: 20,
  entidad: 15,
  palabraClave: 10,
  tipoProcedimiento: 5,
  experiencia: 10,
};

// Umbrales de compatibilidad, únicos y explícitos para todo el producto — Dashboard,
// Explorador, Comparador y Ranking nunca recalculan el nivel por su cuenta: todos pasan
// por computeMatch() y consumen el `nivel` ya resuelto aquí, así que ajustar estos dos
// números basta para cambiar el corte en toda la app de forma consistente.
export const UMBRALES_MATCH: { alto: number; medio: number } = { alto: 70, medio: 40 };

function nivelDeScore(score: number): NivelMatch {
  if (score >= UMBRALES_MATCH.alto) return "alto";
  if (score >= UMBRALES_MATCH.medio) return "medio";
  return "bajo";
}

export function computeMatch(
  proceso: Proceso,
  proveedor: Proveedor,
  preferencias: PreferenciasProveedor = proveedor.preferencias
): ResultadoMatch {
  const coincidencias: string[] = [];
  const faltantes: string[] = [];
  let score = 0;

  if (preferencias.regionesObjetivo.includes(proceso.region)) {
    score += PESOS.region;
    coincidencias.push(`Región objetivo: ${proceso.region}`);
  } else {
    faltantes.push(`Fuera de tus regiones objetivo (proceso en ${proceso.region})`);
  }

  if (preferencias.rubros.includes(proceso.categoria)) {
    score += PESOS.rubro;
    coincidencias.push(`Rubro de interés: ${proceso.categoria}`);
  } else {
    faltantes.push(`Rubro no priorizado en tus preferencias (${proceso.categoria})`);
  }

  if (proceso.montoReferencial === null) {
    // La entidad no publicó un valor referencial: ni premia ni penaliza el match.
  } else if (
    proceso.montoReferencial >= preferencias.montoMinimo &&
    proceso.montoReferencial <= preferencias.montoMaximo
  ) {
    score += PESOS.monto;
    coincidencias.push("Monto dentro de tu rango preferido");
  } else if (proceso.montoReferencial > preferencias.montoMaximo) {
    faltantes.push("Monto referencial supera tu máximo preferido");
  } else {
    faltantes.push("Monto referencial por debajo de tu mínimo preferido");
  }

  if (preferencias.entidadesObjetivo.includes(proceso.entidad)) {
    score += PESOS.entidad;
    coincidencias.push(`Entidad objetivo: ${proceso.entidad}`);
  } else {
    faltantes.push("Entidad no está en tu lista de entidades objetivo");
  }

  const textoProceso = `${proceso.objeto} ${proceso.descripcion}`.toLowerCase();
  const palabraEncontrada = preferencias.palabrasClave.find((palabra) =>
    textoProceso.includes(palabra.toLowerCase())
  );
  if (palabraEncontrada) {
    score += PESOS.palabraClave;
    coincidencias.push(`Coincide con tu palabra clave "${palabraEncontrada}"`);
  } else {
    faltantes.push("No coincide con tus palabras clave configuradas");
  }

  if ((preferencias.tiposProcedimiento as string[]).includes(proceso.tipoProcedimiento)) {
    score += PESOS.tipoProcedimiento;
    coincidencias.push(`Tipo de procedimiento preferido: ${proceso.tipoProcedimiento}`);
  } else {
    faltantes.push(`Tipo de procedimiento distinto a tus preferidos (${proceso.tipoProcedimiento})`);
  }

  const experienciaRelevante = proveedor.experiencia
    .filter((exp) => exp.especialidad === proceso.categoria)
    .reduce((total, exp) => total + exp.monto, 0);

  if (proceso.experienciaMinimaRequerida <= 0) {
    // La fuente no publica un mínimo de experiencia exigido (típico en datos live) —
    // no sumamos ni descontamos, sería fabricar un criterio que no existe.
  } else if (experienciaRelevante >= proceso.experienciaMinimaRequerida) {
    score += PESOS.experiencia;
    coincidencias.push("Cumples la experiencia mínima requerida en esta especialidad");
  } else if (experienciaRelevante > 0) {
    faltantes.push(
      `Experiencia acumulada en ${proceso.categoria} (S/ ${experienciaRelevante.toLocaleString("es-PE")}) no alcanza el mínimo exigido`
    );
  } else {
    faltantes.push(`Sin experiencia registrada en ${proceso.categoria}`);
  }

  return {
    score,
    nivel: nivelDeScore(score),
    coincidencias,
    faltantes,
  };
}
