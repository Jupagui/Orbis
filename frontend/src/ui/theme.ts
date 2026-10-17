import { useSyncExternalStore } from 'react';

export type Tema = 'dark' | 'light';

const CLAVE = 'orbis-theme';
const oyentes = new Set<() => void>();
const sistemaClaro = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: light)') : null;

/** Tema efectivo: el elegido por el usuario o, si no eligió, el del sistema. */
export function temaActual(): Tema {
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return sistemaClaro?.matches ? 'light' : 'dark';
}

function avisar() {
  oyentes.forEach((o) => o());
}
sistemaClaro?.addEventListener?.('change', avisar);

export function fijarTema(t: Tema) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(CLAVE, t);
  } catch {
    // sin almacenamiento disponible: el tema solo dura esta sesión
  }
  avisar();
}

export const alternarTema = () => fijarTema(temaActual() === 'dark' ? 'light' : 'dark');

function suscribir(o: () => void) {
  oyentes.add(o);
  return () => {
    oyentes.delete(o);
  };
}

/** Tema efectivo como estado de React: los componentes se actualizan al cambiarlo. */
export const useTema = (): Tema => useSyncExternalStore(suscribir, temaActual, () => 'dark');

/** Lee una variable CSS ya resuelta (para Leaflet y otros que no entienden var()). */
export const leerVar = (nombre: string, el: Element = document.documentElement) =>
  getComputedStyle(el).getPropertyValue(nombre).trim();
