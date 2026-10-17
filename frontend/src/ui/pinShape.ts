export type TipoPin = 'user' | 'place' | 'alert';

export const CUERPO_PIN = 'M16 38s-12-11.2-12-21A12 12 0 0 1 28 17c0 9.8-12 21-12 21Z';

/** El marcador como texto, para el DivIcon de Leaflet (que no renderiza React). */
export function pinHtml(tipo: TipoPin, n?: number) {
  const centro = n != null
    ? `<text x="16" y="21" text-anchor="middle">${Math.trunc(n)}</text>`
    : '<circle class="core" cx="16" cy="16.6" r="3.6"/>';
  const pulso = tipo === 'user' ? '<circle class="pulse" cx="16" cy="16.6" r="7"/>' : '';
  return `<svg class="pin ${tipo}" viewBox="0 0 32 40" aria-hidden="true">${pulso}<path class="body" d="${CUERPO_PIN}"/>${centro}</svg>`;
}
