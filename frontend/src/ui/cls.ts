import type { CSSProperties } from 'react';

type Parte = string | false | null | undefined;

/** Une nombres de clase ignorando los valores vacíos. */
export const cls = (...partes: Parte[]) => partes.filter(Boolean).join(' ');

/** Clases de un botón, para usarlas también en enlaces (<Link className={btnClass(...)}>). */
export const btnClass = (variante: 'primary' | 'secondary' | 'ghost' = 'primary', soloIcono = false) =>
  cls('btn', `btn-${variante}`, soloIcono && 'btn-icon');

/** Variables CSS en línea (--o, --t, --accent…) con el tipo correcto. */
export const vars = (v: Record<string, string | number>) => v as CSSProperties;
