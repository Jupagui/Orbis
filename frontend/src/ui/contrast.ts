/** Relación de contraste WCAG 2.2 entre dos colores #RRGGBB. */
function canal(v: number) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function luminancia(hex: string) {
  const h = hex.trim().replace('#', '');
  if (h.length !== 6) return NaN;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

export function contraste(a: string, b: string) {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Texto negro o blanco, el que mejor se lee sobre el color dado. */
export const tintaSobre = (hex: string) => (contraste('#0A0D0C', hex) >= contraste('#FFFFFF', hex) ? '#0A0D0C' : '#FFFFFF');

export type TipoContraste = 'texto' | 'ui';

export function veredicto(r: number, tipo: TipoContraste): { tono: 'ok' | 'warn' | 'danger'; texto: string } {
  if (tipo === 'ui') return r >= 3 ? { tono: 'ok', texto: 'AA · interfaz' } : { tono: 'danger', texto: 'No cumple' };
  if (r >= 7) return { tono: 'ok', texto: 'AAA' };
  if (r >= 4.5) return { tono: 'ok', texto: 'AA' };
  if (r >= 3) return { tono: 'warn', texto: 'Solo texto grande' };
  return { tono: 'danger', texto: 'No cumple' };
}
