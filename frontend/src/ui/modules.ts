import type { IconName } from './Icon';

export type ModuloKey = 'vial' | 'salud' | 'comida' | 'taller' | 'explora';

export interface Modulo {
  key: ModuloKey;
  label: string;
  titulo: string;
  desc: string;
  placeholder: string;
  accion: string;
  icon: IconName;
  /** Variable CSS del color del módulo (cambia con el tema). */
  accent: string;
}

export const MODULOS: Record<ModuloKey, Modulo> = {
  vial: { key: 'vial', label: 'Vía', titulo: 'Reporte vial', desc: 'Huecos, semáforos, accidentes', placeholder: 'Ej: Hay un hueco gigante en la Av. 68 con Calle 26...', accion: 'Crea un reporte vial', icon: 'vial', accent: '--m-vial' },
  salud: { key: 'salud', label: 'Salud', titulo: 'Salud', desc: 'Síntomas y emergencias médicas', placeholder: 'Ej: Mi abuelo tiene un fuerte dolor en el pecho izquierdo...', accion: 'Guarda la recomendación del centro más rápido', icon: 'salud', accent: '--m-salud' },
  comida: { key: 'comida', label: 'Sabor', titulo: 'Sabor', desc: 'Recomendaciones gastronómicas', placeholder: 'Ej: Antojo de comida asiática, presupuesto medio...', accion: 'Guarda la recomendación principal', icon: 'sabor', accent: '--m-comida' },
  taller: { key: 'taller', label: 'Taller', titulo: 'Taller', desc: 'Asistencia mecánica', placeholder: 'Ej: Mi carro empezó a echar humo azul...', accion: 'Abre una solicitud de asistencia', icon: 'taller', accent: '--m-taller' },
  explora: { key: 'explora', label: 'Explora', titulo: 'Explora', desc: 'Turismo y recorridos', placeholder: 'Ej: Tengo 3 horas libres en el centro...', accion: 'Guarda el recorrido', icon: 'explora', accent: '--m-explora' },
};

export const LISTA_MODULOS: Modulo[] = Object.values(MODULOS);

/** El backend usa 'comida'; el Tablero también acepta 'sabor'. 'indefinido' no es un módulo. */
export function moduloPorTipo(tipo?: string | null): Modulo | null {
  if (!tipo) return null;
  const clave = tipo === 'sabor' ? 'comida' : tipo;
  return clave in MODULOS ? MODULOS[clave as ModuloKey] : null;
}
