export interface SeccionArticulo {
  subtitulo?: string;
  parrafos: string[];
}

export interface ArticuloBlog {
  slug: string;
  titulo: string;
  resumen: string;
  fecha: string; // ISO
  tiempoLectura: string;
  contenido: SeccionArticulo[];
}

export const ARTICULOS_BLOG: ArticuloBlog[] = [
  {
    slug: "que-es-el-rnp-y-como-saber-si-estas-habilitado",
    titulo: "Qué es el RNP y cómo saber si tu empresa está habilitada para contratar con el Estado",
    resumen:
      "El Registro Nacional de Proveedores es el primer filtro antes de poder presentarte a cualquier proceso de selección. Esto es lo que revisa una entidad cuando consulta tu RUC.",
    fecha: "2026-06-02",
    tiempoLectura: "5 min",
    contenido: [
      {
        parrafos: [
          "Antes de poder presentar una oferta en el SEACE, tu empresa necesita estar inscrita y habilitada en el Registro Nacional de Proveedores (RNP), a cargo del OSCE. No es un trámite opcional: es el requisito de entrada que cualquier entidad convocante verifica automáticamente al momento de admitir una oferta.",
        ],
      },
      {
        subtitulo: "Las cuatro capacidades del RNP",
        parrafos: [
          "El RNP no es una sola habilitación genérica — se organiza en capacidades independientes, y una empresa puede tener una, varias o todas activas al mismo tiempo:",
        ],
      },
      {
        parrafos: [
          "• Bienes: para vender productos al Estado (desde mobiliario hasta equipos médicos).",
          "• Servicios: para prestar servicios que no sean de consultoría de obra ni ejecución de obra.",
          "• Consultoría de obras: para elaborar expedientes técnicos, supervisar obras o hacer estudios de preinversión.",
          "• Ejecución de obras: para construir, siempre con una capacidad máxima de contratación asociada (un tope de monto acumulado que puedes tener en obras en simultáneo).",
        ],
      },
      {
        subtitulo: "Qué revisa una entidad cuando evalúa tu oferta",
        parrafos: [
          "Cuando calificas en un proceso, el comité de selección no solo mira si tienes RNP: revisa que esté vigente en la capacidad específica que exige la convocatoria, y — si se trata de una obra — que tu capacidad máxima de contratación libre alcance para el monto del proceso, descontando lo que ya tengas comprometido en otros contratos vigentes.",
          "Un RNP vencido, suspendido o en la capacidad equivocada es, en la práctica, la causa más común y más evitable de descalificación administrativa — no por falta de experiencia, sino por no haber revisado la vigencia antes de postular.",
        ],
      },
      {
        subtitulo: "Cómo verificarlo antes de postular",
        parrafos: [
          "El OSCE mantiene un buscador público de proveedores donde puedes consultar por RUC el estado de habilitación, las especialidades activas y la capacidad máxima de contratación vigente. Revisarlo antes — no después de haber armado toda la oferta — ahorra tiempo y evita descalificaciones evitables.",
        ],
      },
    ],
  },
  {
    slug: "etapas-de-un-proceso-de-seleccion-en-el-seace",
    titulo: "Las etapas de un proceso de selección en el SEACE, explicadas de principio a fin",
    resumen:
      "Convocatoria, registro de participantes, consultas, integración de bases, presentación de ofertas, buena pro. Qué pasa en cada etapa y qué puedes (o no) hacer en cada una.",
    fecha: "2026-06-16",
    tiempoLectura: "6 min",
    contenido: [
      {
        parrafos: [
          "Un proceso de selección publicado en el SEACE no es un solo evento — es una secuencia de etapas con plazos específicos, y participar bien significa saber qué se puede hacer (y qué ya no) en cada una.",
        ],
      },
      {
        subtitulo: "1. Convocatoria",
        parrafos: [
          "La entidad publica el proceso con sus bases (el documento que define requisitos, criterios de evaluación y condiciones del contrato). A partir de aquí arrancan todos los plazos siguientes.",
        ],
      },
      {
        subtitulo: "2. Registro de participantes",
        parrafos: [
          "Cualquier proveedor interesado debe registrarse formalmente como participante dentro de esta ventana. Sin registro, no puedes formular consultas ni presentar oferta — es un paso que se olvida con más frecuencia de la que debería, especialmente en procesos electrónicos donde el registro es un botón más en el sistema, no un trámite presencial.",
        ],
      },
      {
        subtitulo: "3. Formulación de consultas y observaciones",
        parrafos: [
          "Los participantes registrados pueden pedir aclaraciones sobre las bases o cuestionar requisitos que consideren restrictivos de la competencia. Esta etapa importa incluso si no tienes dudas: es tu única oportunidad de corregir un requisito mal redactado antes de que las bases queden cerradas.",
        ],
      },
      {
        subtitulo: "4. Absolución de consultas e integración de las bases",
        parrafos: [
          "La entidad responde las consultas y publica la versión final e integrada de las bases — la que realmente rige el proceso. Cualquier oferta debe prepararse contra esta versión, no contra la convocatoria original.",
        ],
      },
      {
        subtitulo: "5. Presentación de ofertas",
        parrafos: [
          "El momento de subir (o presentar físicamente, según el procedimiento) tu propuesta técnica y económica. En los procedimientos electrónicos esto tiene una ventana horaria estricta — llegar un minuto tarde generalmente significa quedar fuera, sin excepciones.",
        ],
      },
      {
        subtitulo: "6. Calificación, evaluación y otorgamiento de la buena pro",
        parrafos: [
          "El comité de selección revisa el cumplimiento de requisitos, califica las propuestas según los factores de evaluación de las bases, y otorga la buena pro al postor ganador. A partir de aquí empieza el plazo para apelaciones, y luego el consentimiento de la buena pro y la firma del contrato.",
        ],
      },
    ],
  },
  {
    slug: "errores-comunes-que-descalifican-una-oferta",
    titulo: "5 errores comunes que descalifican una oferta en una contratación pública",
    resumen:
      "La mayoría de descalificaciones no son por mala propuesta técnica — son por detalles administrativos que se revisan antes de siquiera llegar a evaluar el contenido.",
    fecha: "2026-07-01",
    tiempoLectura: "4 min",
    contenido: [
      {
        parrafos: [
          "Antes de evaluar el contenido de una propuesta, el comité de selección revisa el cumplimiento de requisitos formales. Esta primera revisión elimina más ofertas de las que debería — casi siempre por errores evitables, no por falta de capacidad real del proveedor.",
        ],
      },
      {
        subtitulo: "1. RNP no vigente en la capacidad exigida",
        parrafos: [
          "Ya lo mencionamos en el artículo sobre el RNP, pero merece repetirse: es, con diferencia, el motivo de descalificación administrativa más frecuente y más evitable.",
        ],
      },
      {
        subtitulo: "2. No registrarse como participante a tiempo",
        parrafos: [
          "Sin registro dentro del plazo, no hay oferta posible — sin importar qué tan buena sea la propuesta técnica que se tenía preparada.",
        ],
      },
      {
        subtitulo: "3. Experiencia mal sustentada, no experiencia insuficiente",
        parrafos: [
          "Con frecuencia el proveedor sí tiene la experiencia mínima requerida, pero no la sustenta con los documentos exactos que piden las bases (contratos, conformidades, actas de recepción) o los presenta incompletos. El comité no puede inferir experiencia que no está documentada tal como se exige.",
        ],
      },
      {
        subtitulo: "4. Errores de forma en la propuesta económica",
        parrafos: [
          "Montos que no coinciden entre el resumen y el detalle, ofertas sin firma donde se exige, o formatos de anexos distintos a los que exigen las bases integradas (no la convocatoria original). Son errores de forma, pero las bases suelen ser explícitas en que son causal de descalificación.",
        ],
      },
      {
        subtitulo: "5. Presentar la oferta fuera de la ventana horaria",
        parrafos: [
          "En procedimientos electrónicos, la plataforma cierra la recepción de ofertas de forma automática al vencer el plazo — no hay margen de tolerancia. Presentar con antelación, no en el último momento, evita quedar fuera por un problema de conexión o de última hora.",
        ],
      },
    ],
  },
  {
    slug: "como-elegir-en-que-procesos-participar",
    titulo: "Cómo elegir en qué procesos de contratación pública participar (y en cuáles no)",
    resumen:
      "No todo proceso que calza con tu rubro te conviene. Una guía práctica de los criterios que de verdad predicen si vale la pena invertir tiempo en una oferta.",
    fecha: "2026-07-15",
    tiempoLectura: "5 min",
    contenido: [
      {
        parrafos: [
          "Preparar una oferta toma tiempo y recursos reales — armar el expediente, sustentar experiencia, calcular la propuesta económica. Elegir bien en qué procesos participar es tan importante como prepararlos bien.",
        ],
      },
      {
        subtitulo: "Capacidad de contratación disponible, no solo el monto del proceso",
        parrafos: [
          "Si tu empresa ejecuta obras, tu capacidad máxima de contratación no es solo un número — es lo que te queda libre después de descontar los contratos vigentes. Postular a un proceso que excede tu capacidad libre es tiempo perdido: no vas a poder suscribir el contrato aunque ganes la buena pro.",
        ],
      },
      {
        subtitulo: "Experiencia mínima exigida vs. experiencia que puedes sustentar hoy",
        parrafos: [
          "No basta con haber hecho un trabajo similar alguna vez — las bases piden sustentar un monto facturado acumulado, en una ventana de años específica, con documentos concretos. Revisa ese requisito primero, antes que cualquier otro criterio.",
        ],
      },
      {
        subtitulo: "Historial de la entidad convocante",
        parrafos: [
          "Entidades con historial de procesos declarados desiertos, con adicionales de obra frecuentes o con plazos de pago largos son una señal a considerar — no necesariamente para descartar el proceso, pero sí para presupuestar el riesgo con realismo.",
        ],
      },
      {
        subtitulo: "Competencia esperada",
        parrafos: [
          "Procesos muy visibles (montos grandes, entidades nacionales) suelen atraer más postores, lo que reduce la probabilidad de ganar incluso con una buena propuesta. Procesos más específicos — una subcategoría técnica particular, una región con menos competidores — a veces ofrecen mejor retorno por el mismo esfuerzo de preparación.",
        ],
      },
      {
        parrafos: [
          "En la práctica, ninguno de estos criterios decide solo — la decisión de participar es la combinación de los cuatro. Automatizar esa comparación, en vez de revisarla proceso por proceso, es exactamente el problema que un buen matching de oportunidades debería resolver.",
        ],
      },
    ],
  },
];

export function obtenerArticulo(slug: string): ArticuloBlog | undefined {
  return ARTICULOS_BLOG.find((a) => a.slug === slug);
}
