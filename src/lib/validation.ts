// Validación de formato de RUC peruano — 11 dígitos. Solo valida forma, no el dígito
// verificador (módulo 11): las rutas que la usan solo necesitan descartar entradas
// obviamente inválidas antes de pegarle al RNP/OSCE server-to-server.
export function esRucValido(ruc: string): boolean {
  return /^\d{11}$/.test(ruc);
}
