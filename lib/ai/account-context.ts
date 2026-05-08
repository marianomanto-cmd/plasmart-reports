// Contexto estable de la cuenta Plasmart.
// Esto se inyecta en cada prompt enviado a Claude. Editar acá si cambia
// el negocio: nuevos productos, cambio de público, ajuste de tono.

export const ACCOUNT_CONTEXT = `
SOBRE EL CLIENTE:
- Plasmart es una empresa de Córdoba (Argentina) parte del grupo Transfil.
- Negocio: corte láser y plasma de acero, plus plegado CNC.
- Capacidades técnicas: corte láser hasta 6,35mm, plasma hasta 32mm, plegado CNC.

PÚBLICO OBJETIVO:
- B2C: arquitectos, diseñadores, herreros, particulares con proyectos.
- B2B: industria metalmecánica, fabricantes de equipos, talleres.

ECONOMÍA:
- Moneda: pesos argentinos (ARS).
- Cuentas activas: Google Ads, Meta Ads, GA4 (tráfico web).
- Frecuencia de revisión: semanal.

OBJETIVOS COMERCIALES:
- Generar leads calificados (B2B prioridad alta, B2C volumen).
- Mantener costos por adquisición sostenibles dadas las márgenes industriales.
- El cliente B2B vale órdenes de magnitud más que el B2C — vale invertir más
  por adquirirlo.
`.trim();
