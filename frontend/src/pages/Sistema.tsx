import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Avatar, Chip, Eyebrow, Kbd, ModuleTag, Pill, PriorityMeter, StatusPill, Tag } from '../ui/Badges';
import { ChatBubble, TypingDots } from '../ui/Chat';
import { contraste, tintaSobre, veredicto, type TipoContraste } from '../ui/contrast';
import { Icon } from '../ui/Icon';
import { ICON_NAMES } from '../ui/iconNames';
import { Field, ImageDrop, Segmented, Switch, Tabs, TextArea, ThemeSwitch } from '../ui/Inputs';
import { MapPin } from '../ui/MapPin';
import { ModuleCard } from '../ui/ModuleCard';
import { LISTA_MODULOS, MODULOS } from '../ui/modules';
import { Sheet, Tooltip } from '../ui/Overlays';
import { PlaceCard } from '../ui/PlaceCard';
import { Alert, Card, CardHeader, EmptyState, OrbitSpinner, Ornament, Progress, Skeleton, Stat } from '../ui/Surfaces';
import { leerVar } from '../ui/theme';
import { Accordion, AgentStepper, TimelineStep } from '../ui/Trace';
import { useToast } from '../ui/useToast';
import { cls, vars } from '../ui/cls';

type Valores = Record<string, string>;
interface Tokens { dark: Valores; light: Valores }

const PESTAÑAS = [
  { id: 'color', texto: 'Color' },
  { id: 'tipografia', texto: 'Tipografía' },
  { id: 'espaciado', texto: 'Espaciado' },
  { id: 'componentes', texto: 'Componentes' },
  { id: 'responsivo', texto: 'Responsivo' },
  { id: 'movimiento', texto: 'Movimiento' },
  { id: 'accesibilidad', texto: 'Accesibilidad' },
];

const ROLES: [string, string][] = [
  ['--bg', 'Fondo de la página'], ['--surface', 'Tarjetas y paneles'], ['--raised', 'Elementos elevados y burbujas'],
  ['--line', 'Separadores decorativos'], ['--control', 'Bordes de controles (≥ 3:1)'], ['--text', 'Texto principal'],
  ['--text-2', 'Texto secundario'], ['--muted', 'Metadatos y etiquetas'], ['--gold', 'Primario: acento, foco y acción'],
  ['--gold-ink', 'Texto sobre el primario'], ['--gold-soft', 'Fondo suave del primario'], ['--sage', 'Secundario: datos y fuentes'],
  ['--ok', 'Éxito'], ['--warn', 'Atención'], ['--danger', 'Crítico'], ['--info', 'Información'],
  ['--m-vial', 'Módulo Vía'], ['--m-salud', 'Módulo Salud'], ['--m-comida', 'Módulo Sabor'], ['--m-taller', 'Módulo Taller'], ['--m-explora', 'Módulo Explora'],
];

const PARES: { nombre: string; fg: string; bg: string; tipo: TipoContraste }[] = [
  { nombre: 'Texto principal', fg: '--text', bg: '--bg', tipo: 'texto' },
  { nombre: 'Texto secundario', fg: '--text-2', bg: '--bg', tipo: 'texto' },
  { nombre: 'Texto atenuado', fg: '--muted', bg: '--bg', tipo: 'texto' },
  { nombre: 'Atenuado sobre elevado', fg: '--muted', bg: '--raised', tipo: 'texto' },
  { nombre: 'Primario sobre fondo', fg: '--gold', bg: '--bg', tipo: 'texto' },
  { nombre: 'Texto del botón primario', fg: '--gold-ink', bg: '--gold', tipo: 'texto' },
  { nombre: 'Secundario sobre fondo', fg: '--sage', bg: '--bg', tipo: 'texto' },
  { nombre: 'Éxito sobre su fondo', fg: '--ok', bg: '--ok-soft', tipo: 'texto' },
  { nombre: 'Atención sobre su fondo', fg: '--warn', bg: '--warn-soft', tipo: 'texto' },
  { nombre: 'Crítico sobre su fondo', fg: '--danger', bg: '--danger-soft', tipo: 'texto' },
  { nombre: 'Información sobre su fondo', fg: '--info', bg: '--info-soft', tipo: 'texto' },
  { nombre: 'Módulo Vía', fg: '--m-vial', bg: '--bg', tipo: 'texto' },
  { nombre: 'Módulo Salud', fg: '--m-salud', bg: '--bg', tipo: 'texto' },
  { nombre: 'Módulo Sabor', fg: '--m-comida', bg: '--bg', tipo: 'texto' },
  { nombre: 'Módulo Taller', fg: '--m-taller', bg: '--bg', tipo: 'texto' },
  { nombre: 'Módulo Explora', fg: '--m-explora', bg: '--bg', tipo: 'texto' },
  { nombre: 'Borde de control', fg: '--control', bg: '--bg', tipo: 'ui' },
];

const TOKENS = Array.from(new Set([...ROLES.map((r) => r[0]), ...PARES.flatMap((p) => [p.fg, p.bg]), '--ok-soft', '--warn-soft', '--danger-soft', '--info-soft']));

function useTokens(oscuro: HTMLElement | null, claro: HTMLElement | null): Tokens | null {
  return useMemo(() => {
    if (!oscuro || !claro) return null;
    const leer = (el: Element): Valores => Object.fromEntries(TOKENS.map((n) => [n, leerVar(n, el)]));
    return { dark: leer(oscuro), light: leer(claro) };
  }, [oscuro, claro]);
}

function useAncho() {
  const [ancho, setAncho] = useState(window.innerWidth);
  useEffect(() => {
    const f = () => setAncho(window.innerWidth);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return ancho;
}

/* ---------------------------------------------------------------- Color */

function Rampa({ nombre, descripcion, prefijo, pasos }: { nombre: string; descripcion: string; prefijo: string; pasos: string[] }) {
  const avisar = useToast();
  const copiar = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      avisar(`Copiado ${hex}`, 'ok');
    } catch {
      avisar(`Color ${hex}`, 'info');
    }
  };
  return (
    <div className="ds-sec">
      <h3>{nombre}</h3>
      <p>{descripcion}</p>
      <div className="ramp">
        {pasos.map((p) => {
          const hex = leerVar(`--${prefijo}-${p}`);
          return (
            <button key={p} type="button" className="sw" aria-label={`Copiar ${nombre} ${p}: ${hex}`} style={{ background: `var(--${prefijo}-${p})`, color: tintaSobre(hex) }} onClick={() => copiar(hex)}>
              <b>{p}</b>
              <code>{hex}</code>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PanelColor({ tokens }: { tokens: Tokens | null }) {
  const semanticos: { clave: string; nombre: string; uso: string }[] = [
    { clave: 'ok', nombre: 'Éxito', uso: 'Acción completada, verificación aprobada' },
    { clave: 'warn', nombre: 'Atención', uso: 'requiere_info, datos faltantes, prioridad alta' },
    { clave: 'danger', nombre: 'Crítico', uso: 'Contradicción, error, prioridad crítica, 123' },
    { clave: 'info', nombre: 'Información', uso: 'Decisiones del orquestador, prioridad media' },
  ];
  return (
    <>
      <Rampa nombre="Primario · Champán" descripcion="El acento. Marca el foco, la acción principal y el punto de ubicación del usuario. Nunca más del 10 % de la superficie." prefijo="gold" pasos={['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']} />
      <Rampa nombre="Secundario · Páramo" descripcion="Verde frailejón de los cerros orientales. Señala datos verificados, fuentes y ciclos del orquestador." prefijo="sage" pasos={['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']} />
      <Rampa nombre="Neutros · Obsidiana a Porcelana" descripcion="Grises con sesgo verde hacia el páramo, para que ningún neutro se vea por defecto." prefijo="neutral" pasos={['0', '50', '100', '200', '300', '400', '500', '600', '700', '800', '850', '900', '950']} />

      <div className="ds-sec">
        <h3>Semánticos</h3>
        <p>Separados del acento. Siempre van con texto o con forma propia (círculo, triángulo, rombo, barra) para no depender solo del color.</p>
        <div className="sem-grid">
          {semanticos.map((s) => (
            <div key={s.clave} className="sem">
              <div className="cap"><b>{s.nombre}</b><small className="muted">{s.uso}</small></div>
              {(['dark', 'light'] as const).map((t) => (
                <div key={t} data-theme={t}>
                  <b>{t === 'dark' ? 'Oscuro' : 'Claro'}</b>
                  <Pill tone={s.clave as 'ok' | 'warn' | 'danger' | 'info'}>{s.nombre}</Pill>
                  <code>{tokens?.[t][`--${s.clave}`]}</code>
                  <code>{tokens?.[t][`--${s.clave}-soft`]}</code>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="ds-sec">
        <h3>Acentos de módulo</h3>
        <p>Cada módulo tiene su color, ajustado por tema para cumplir AA. Se usan en etiquetas, ilustraciones y marcadores del tablero.</p>
        <div className="theme-probes">
          {(['dark', 'light'] as const).map((t) => (
            <div key={t} className="theme-probe" data-theme={t}>
              <b>{t === 'dark' ? 'Oscuro' : 'Claro'}</b>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-1)' }}>
                {LISTA_MODULOS.map((m) => <ModuleTag key={m.key} tipo={m.key} />)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ds-sec">
        <h3>Roles por tema</h3>
        <p>Los componentes solo usan roles. El oscuro es el predeterminado; el claro se activa con la preferencia del sistema o con el interruptor de la barra superior. Los valores se leen en vivo de la hoja de estilos.</p>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Token</th><th>Oscuro</th><th>Claro</th><th>Uso</th></tr></thead>
            <tbody>
              {ROLES.map(([t, uso]) => (
                <tr key={t}>
                  <td><code>{t}</code></td>
                  {(['dark', 'light'] as const).map((tema) => {
                    const hex = tokens?.[tema][t] ?? '';
                    return <td key={tema}><span className="cr-sw" style={{ background: hex, color: hex ? tintaSobre(hex) : undefined }}>Aa</span> <code>{hex}</code></td>;
                  })}
                  <td>{uso}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ Tipografía */

const ESCALA: { n: number; nominal: string; px: number; fam: 'ui' | 'display'; peso: number; estilo?: 'italic'; espacio?: string; mayus?: boolean; muestra: string; uso: string }[] = [
  { n: 1, nominal: '.75rem', px: 12, fam: 'ui', peso: 500, espacio: '.2em', mayus: true, muestra: 'Fase 4 · Herramientas', uso: 'Sobretítulos, etiquetas e insignias' },
  { n: 2, nominal: '.875rem', px: 14, fam: 'ui', peso: 400, muestra: 'calcular_ruta devuelve distancia y tiempo reales.', uso: 'Interfaz, tablas y burbujas del chat' },
  { n: 3, nominal: '1rem', px: 16, fam: 'ui', peso: 400, muestra: 'El Verificador asigna la prioridad sin usar el modelo.', uso: 'Cuerpo de texto' },
  { n: 4, nominal: '1.333rem', px: 21, fam: 'ui', peso: 300, muestra: 'Entra una foto, un texto y una ubicación.', uso: 'Entradillas' },
  { n: 5, nominal: '1.777rem', px: 28, fam: 'display', peso: 500, muestra: 'Gemini 3.1 Flash-Lite', uso: 'Títulos de sección y de tarjetas grandes' },
  { n: 6, nominal: '2.369rem', px: 38, fam: 'display', peso: 400, estilo: 'italic', muestra: 'La ciudad, entendida', uso: 'Subtítulos y títulos de página' },
  { n: 7, nominal: '3.157rem', px: 51, fam: 'display', peso: 500, muestra: 'Un grafo decide quién actúa', uso: 'Títulos destacados' },
  { n: 8, nominal: '4.209rem', px: 67, fam: 'display', peso: 500, muestra: '17 · 8 · 4', uso: 'Cifras destacadas' },
  { n: 9, nominal: '5.61rem', px: 90, fam: 'display', peso: 600, espacio: '.08em', muestra: 'ORBIS', uso: 'La marca en el inicio' },
];

function PanelTipografia() {
  return (
    <>
      <div className="ds-sec">
        <h3>Escala de 9 pasos</h3>
        <p>Los pasos 1 a 3 suben de 2 en 2 px para que la interfaz se lea de cerca. Del 3 al 9 la escala crece en cuarta justa (×1,333). Los pasos 6 a 9 son fluidos: el valor nominal es el máximo y se reducen en pantallas angostas.</p>
        <div>
          {ESCALA.map((s) => (
            <div key={s.n} className="type-row">
              <span className="meta"><b>{s.n}</b></span>
              <span className="meta">--fs-{s.n}<br />{s.nominal} · {s.px} px{s.n >= 6 ? ' · fluido' : ''}</span>
              <div
                className="sample"
                style={{ fontFamily: s.fam === 'display' ? 'var(--font-display)' : 'var(--font-ui)', fontSize: `var(--fs-${s.n})`, fontWeight: s.peso, fontStyle: s.estilo, letterSpacing: s.espacio, textTransform: s.mayus ? 'uppercase' : undefined }}
              >
                {s.muestra}
                <span className="use">{s.uso}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="ds-sec">
        <h3>Lógica de emparejamiento</h3>
        <p>Didone con geométrica es la pareja clásica del lujo editorial: contraste máximo en la voz y construcción pura en la interfaz. La «o» circular de Jost repite la órbita de la marca. La monoespaciada separa los datos de la prosa: lo que está en Plex Mono existe en el código.</p>
        <div className="pair-grid">
          <div className="pair"><span className="big" style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}>Bodoni Moda</span><p><b>Voz · pasos 5 a 9.</b> Didone de alto contraste con tamaño óptico. Nunca por debajo de 24 px: los trazos finos se rompen.</p></div>
          <div className="pair"><span className="big" style={{ fontFamily: 'var(--font-ui)' }}>Jost</span><p><b>Interfaz · pasos 1 a 4.</b> Geométrica de herencia Futura, en pesos 300 (entradillas), 400 (cuerpo) y 500 (énfasis).</p></div>
          <div className="pair"><span className="big" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-5)' }}>Plex Mono</span><p><b>Datos · pasos 1 y 2.</b> Coordenadas, rutas de la API, nombres de herramientas, trazas y tiempos.</p></div>
        </div>
      </div>
      <div className="ds-sec">
        <h3>Íconos dibujados a mano</h3>
        <p>{ICON_NAMES.length} símbolos sobre una malla de 32 px, con trazo de 1,6 y esquinas redondeadas pero nunca perfectas. Cada uno lleva un punto dorado: la ubicación del usuario.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(5.5rem, 1fr))', gap: 'var(--sp-1)' }}>
          {ICON_NAMES.map((n) => (
            <div key={n} style={{ display: 'grid', justifyItems: 'center', gap: '0.25rem', padding: 'var(--sp-2) var(--sp-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', background: 'var(--bg)' }}>
              <Icon name={n} size="lg" />
              <code style={{ fontSize: 'var(--fs-1)', color: 'var(--muted)' }}>{n}</code>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ Espaciado */

const ESPACIOS: [string, string, number, string][] = [
  ['--sp-half', '.25rem', 4, 'Solo ajustes ópticos (ícono y texto)'],
  ['--sp-1', '.5rem', 8, 'Entre ícono y etiqueta, entre chips'],
  ['--sp-2', '1rem', 16, 'Relleno de controles y avisos'],
  ['--sp-3', '1.5rem', 24, 'Relleno de tarjetas, separación entre columnas'],
  ['--sp-4', '2rem', 32, 'Entre bloques de una pantalla'],
  ['--sp-5', '3rem', 48, 'Entre secciones'],
  ['--sp-6', '4rem', 64, 'Respiro editorial'],
  ['--sp-7', '6rem', 96, 'Cierre de página'],
  ['--sp-8', '8rem', 128, 'Separaciones excepcionales'],
];

function PanelEspaciado({ cuadricula, onCuadricula }: { cuadricula: boolean; onCuadricula: () => void }) {
  return (
    <>
      <div className="ds-sec">
        <h3>Cuadrícula base de 8 px</h3>
        <p>Todo margen, relleno y separación es múltiplo de 8 px (0,5rem). El medio paso de 4 px existe solo para ajustes ópticos. Pulsa <Kbd>G</Kbd> para superponer la retícula sobre la página.</p>
        <div>
          {ESPACIOS.map(([t, v, px, uso]) => (
            <div key={t} className="sp-row">
              <code>{t}</code>
              <span className="mono small">{px} px</span>
              <span className="bar" style={{ width: v }} />
              <span className="use">{uso}</span>
            </div>
          ))}
        </div>
        <div><Button variant="secondary" icon="compas" onClick={onCuadricula} aria-pressed={cuadricula}>{cuadricula ? 'Ocultar la retícula' : 'Mostrar la retícula'}</Button></div>
      </div>
      <div className="ds-sec">
        <h3>Radios y elevación</h3>
        <p>Radios pequeños para un lujo preciso; la píldora queda para los controles. La elevación es luz, no sombra pesada.</p>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Token</th><th>Valor</th><th>Uso</th></tr></thead>
            <tbody>
              <tr><td><code>--r-xs</code></td><td className="num">4 px</td><td>Etiquetas y teclas</td></tr>
              <tr><td><code>--r-sm</code></td><td className="num">8 px</td><td>Tarjetas, avisos y tablas</td></tr>
              <tr><td><code>--r-md</code></td><td className="num">16 px</td><td>Burbujas y paneles de vidrio</td></tr>
              <tr><td><code>--r-pill</code></td><td className="num">999 px</td><td>Botones, chips e interruptores</td></tr>
              <tr><td><code>--e-1</code></td><td>borde de luz interior</td><td>Tarjetas en reposo</td></tr>
              <tr><td><code>--e-2</code></td><td>sombra difusa de 48 px</td><td>Barras flotantes, cajón e información emergente</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ----------------------------------------------------------- Componentes */

function DemoSwitch() {
  const [v, setV] = useState(true);
  return <Switch checked={v} onChange={setV} label="Ejemplo de interruptor" />;
}
function DemoSegmented() {
  const [v, setV] = useState<'recientes' | 'prioridad'>('prioridad');
  return <Segmented etiqueta="Orden del historial" valor={v} onChange={setV} opciones={[{ valor: 'recientes', texto: 'Recientes' }, { valor: 'prioridad', texto: 'Prioridad' }]} />;
}
function DemoTabs() {
  const [v, setV] = useState('resultado');
  return (
    <div style={{ width: '100%' }}>
      <Tabs etiqueta="Ejemplo de pestañas" valor={v} onChange={setV} tabs={[{ id: 'resultado', texto: 'Resultado' }, { id: 'traza', texto: 'Traza' }, { id: 'chat', texto: 'Chat' }]} />
      <p id={`panel-${v}`} role="tabpanel" aria-labelledby={`tab-${v}`} className="small muted" style={{ paddingTop: 'var(--sp-1)' }}>Panel: {v}</p>
    </div>
  );
}
function DemoAccordion() {
  const [v, setV] = useState(true);
  return (
    <div style={{ width: '100%' }}>
      <Accordion abierto={v} onToggle={() => setV(!v)} cabecera={<TimelineStep n={4} tipo="tool" nombre="calcular_ruta" aparte="SaludAgent" ms={312} />}>
        <div><h4>Entrada</h4><pre className="code">{'{ "modo": "drive" }'}</pre></div>
        <div><h4>Salida</h4><pre className="code">{'{ "distancia_m": 4210 }'}</pre></div>
      </Accordion>
    </div>
  );
}
function DemoSheet() {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setAbierto(true)}>Abrir cajón</Button>
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Ejemplo de cajón" descripcion="Foco atrapado, Esc cierra y el foco vuelve al botón.">
        <p className="small muted">En pantallas angostas el cajón sube desde abajo como una hoja.</p>
        <Button onClick={() => setAbierto(false)}>Entendido</Button>
      </Sheet>
    </>
  );
}
function DemoToast() {
  const avisar = useToast();
  return (
    <>
      <Button variant="secondary" onClick={() => avisar('Recorrido guardado', 'ok')}>Éxito</Button>
      <Button variant="secondary" onClick={() => avisar('No pude responder. Intenta de nuevo.', 'error')}>Error</Button>
    </>
  );
}
function DemoImageDrop() {
  const [f, setF] = useState<File | null>(null);
  const [v, setV] = useState<string | null>(null);
  const cambiar = (nuevo: File | null) => {
    if (v) URL.revokeObjectURL(v);
    setF(nuevo);
    setV(nuevo ? URL.createObjectURL(nuevo) : null);
  };
  return <div style={{ width: '100%' }}><ImageDrop label="Foto (opcional)" archivo={f} vista={v} onChange={cambiar} /></div>;
}

const LUGAR_EJEMPLO = {
  nombre: 'Hospital Universitario San Ignacio',
  motivo: 'Urgencias 24 horas, a pocos minutos.',
  ruta_verificada: true,
  distancia_m: 4210,
  duracion_s: 780,
  modo: 'drive',
  fuente: 'propia',
};

interface Comp { nombre: string; estados: string[]; regla: string; demo: ReactNode }

const centrado = (n: ReactNode) => <div style={{ width: '100%', maxWidth: '17rem' }}>{n}</div>;

function componentes(): Comp[] {
  return [
    { nombre: 'Botón primario', estados: ['Reposo', 'Hover', 'Foco', 'Deshabilitado', 'Cargando'], regla: 'Una sola acción principal por vista. El texto es un verbo.', demo: <><Button>Analizar</Button><Button forceState="hover">Hover</Button><Button forceState="focus">Foco</Button><Button disabled>Inactivo</Button><Button loading>Cargando</Button></> },
    { nombre: 'Botón secundario', estados: ['Reposo', 'Hover', 'Presionado', 'Deshabilitado'], regla: 'Apoya a la acción principal. Nunca dos primarios juntos.', demo: <><Button variant="secondary">Ver traza</Button><Button variant="secondary" forceState="hover">Hover</Button><Button variant="secondary" forceState="active">Presionado</Button><Button variant="secondary" disabled>Inactivo</Button></> },
    { nombre: 'Botón fantasma', estados: ['Reposo', 'Hover', 'Deshabilitado'], regla: 'Acciones terciarias en barras y cabeceras, como Volver.', demo: <><Button variant="ghost" icon="prev">Volver</Button><Button variant="ghost" forceState="hover">Hover</Button><Button variant="ghost" disabled>Inactivo</Button></> },
    { nombre: 'Botón de ícono', estados: ['Reposo', 'Hover', 'Foco'], regla: 'Siempre con aria-label. Área táctil de 44 px.', demo: <><Button variant="secondary" iconOnly icon="copiar" aria-label="Copiar" /><Button variant="ghost" iconOnly icon="next" aria-label="Siguiente" /><Button iconOnly icon="enviar" aria-label="Enviar" /></> },
    { nombre: 'Enlace', estados: ['Reposo', 'Hover', 'Foco'], regla: 'Solo para navegar. Si algo cambia en la pantalla, es un botón.', demo: <Link to="/heatmap">Ir al tablero de calor</Link> },
    { nombre: 'Chip de filtro', estados: ['Inactivo', 'Hover', 'Seleccionado', 'Deshabilitado'], regla: 'Filtros combinables, con aria-pressed.', demo: <><Chip pressed icon="salud">Salud</Chip><Chip pressed={false} icon="vial">Vía</Chip><Chip className="is-hover" icon="sabor">Sabor</Chip><Chip disabled icon="taller">Taller</Chip></> },
    { nombre: 'Etiqueta', estados: ['Estática', 'Destacada'], regla: 'Metadatos que no se pulsan. No imita a un chip.', demo: <><Tag>SQLite</Tag><Tag tone="gold">LangGraph</Tag><Tag icon="geo">4.65, −74.08</Tag></> },
    { nombre: 'Insignia de estado', estados: ['Completado', 'Requiere información', 'Procesando', 'Error'], regla: 'Siempre con texto y con una forma propia además del color.', demo: <><StatusPill estado="completado" /><StatusPill estado="requiere_info" /><StatusPill estado="procesando" /><StatusPill estado="error" /></> },
    { nombre: 'Prioridad del caso', estados: ['Crítica', 'Alta', 'Media', 'Baja'], regla: 'Mismo orden que asigna el Verificador: barras, texto y color.', demo: <><PriorityMeter prioridad="critica" /><PriorityMeter prioridad="alta" /><PriorityMeter prioridad="media" /><PriorityMeter prioridad="baja" /></> },
    { nombre: 'Etiqueta de módulo', estados: ['Vía', 'Salud', 'Taller', 'Sabor', 'Explora'], regla: 'Identifica el módulo con su color e ícono.', demo: <>{LISTA_MODULOS.map((m) => <ModuleTag key={m.key} tipo={m.key} />)}</> },
    { nombre: 'Tarjeta', estados: ['Reposo', 'Interactiva'], regla: 'Agrupa un solo tema. No se anidan tarjetas.', demo: centrado(<Card><CardHeader icon="datos" title="Datos propios" level={3} /><p className="small muted">Lugares, guías y casos.</p></Card>) },
    { nombre: 'Tarjeta destacada', estados: ['Reposo'], regla: 'Una por vista: marca el elemento central, como las acciones realizadas.', demo: centrado(<Card feature><CardHeader icon="accion" title="Acciones realizadas" level={3} /></Card>) },
    { nombre: 'Panel de vidrio', estados: ['Reposo'], regla: 'Solo sobre mapas y fondos animados. Desenfoque de 16 px.', demo: <div className="glass" style={{ padding: 'var(--sp-2) var(--sp-3)', fontSize: 'var(--fs-2)' }}>Filtros del tablero</div> },
    { nombre: 'Cifra destacada', estados: ['Reposo'], regla: 'Cuando el número es el mensaje. Siempre con etiqueta.', demo: <Stat valor="17" etiqueta="herramientas registradas" /> },
    { nombre: 'Aviso', estados: ['Éxito', 'Atención', 'Crítico', 'Información'], regla: 'Mensaje persistente dentro del contenido, con título y detalle.', demo: centrado(<Alert tone="warn" title="Necesitamos revisar tu solicitud"><p>Falta indicar los síntomas.</p></Alert>) },
    { nombre: 'Campo de texto', estados: ['Reposo', 'Foco', 'Error', 'Deshabilitado'], regla: 'Etiqueta visible. El error dice cómo corregir.', demo: <div style={{ width: '100%', display: 'grid', gap: 'var(--sp-1)' }}><Field label="Dirección" placeholder="Carrera 7 # 40-62" icon="geo" hint="Si la dejas vacía usaremos el GPS." /><Field label="Con foco" forceFocus defaultValue="Calle 80" /><Field label="Con error" error="Agrega el número: Calle 80 # 30-12" defaultValue="Calle 80" /><Field label="Deshabilitado" disabled placeholder="No disponible" /></div> },
    { nombre: 'Área de texto', estados: ['Reposo', 'Foco', 'Error'], regla: 'Para descripciones largas. Crece hacia abajo.', demo: <div style={{ width: '100%' }}><TextArea label="Describe los detalles" placeholder="Ej: Hay un hueco gigante…" /></div> },
    { nombre: 'Zona de imagen', estados: ['Vacía', 'Arrastrando', 'Con foto'], regla: 'Clic, teclado o arrastrar y soltar. Siempre permite quitar la foto.', demo: <DemoImageDrop /> },
    { nombre: 'Interruptor', estados: ['Apagado', 'Encendido', 'Foco'], regla: 'Cambios inmediatos, como el tema. Usa role="switch".', demo: <><DemoSwitch /><ThemeSwitch /></> },
    { nombre: 'Control segmentado', estados: ['Seleccionado', 'Hover', 'Foco'], regla: 'De 2 a 4 opciones excluyentes dentro de la misma vista.', demo: <DemoSegmented /> },
    { nombre: 'Pestañas', estados: ['Seleccionada', 'Hover', 'Foco'], regla: 'Cambian de panel sin salir de la vista. Flechas, Inicio y Fin para moverse.', demo: <DemoTabs /> },
    { nombre: 'Información emergente', estados: ['Oculta', 'Visible'], regla: 'Complementa y nunca contiene lo único importante. Abre también con foco.', demo: <Tooltip titulo="TriageAgent" texto="Clasifica la intención y evalúa la calidad de la información." detalle="Gemini → ResultadoTriage"><Button variant="secondary">Pasa el cursor</Button></Tooltip> },
    { nombre: 'Notificación', estados: ['Entrada', 'Visible', 'Salida'], regla: 'Confirma una acción en pocas palabras. Se va sola.', demo: <DemoToast /> },
    { nombre: 'Cajón', estados: ['Cerrado', 'Abierto'], regla: 'Formularios y material de consulta. Esc cierra y el foco regresa.', demo: <DemoSheet /> },
    { nombre: 'Burbuja del usuario', estados: ['Enviada'], regla: 'Alineada a la derecha, sin avatar.', demo: <div className="chat-log" style={{ width: '100%' }}><ChatBubble rol="usuario">¿Cuál me queda más rápido?</ChatBubble></div> },
    { nombre: 'Burbuja del asistente', estados: ['Con fuente', 'Sin dato'], regla: 'Cada dato lleva su fuente. Si no la hay, lo dice.', demo: <div className="chat-log" style={{ width: '100%' }}><ChatBubble rol="asistente" fuente={{ texto: 'calcular_ruta · datos propios', verificada: true }}>Según el servicio de mapas, el más cercano es San Ignacio.</ChatBubble><ChatBubble rol="asistente" fuente={{ texto: 'sin fuente: no se afirma', verificada: false }}>No tengo ese dato verificado.</ChatBubble></div> },
    { nombre: 'Indicador de escritura', estados: ['Animado'], regla: 'Mientras el asistente consulta el caso.', demo: <TypingDots /> },
    { nombre: 'Acordeón de traza', estados: ['Cerrado', 'Abierto', 'Foco'], regla: 'Muestra entrada y salida de un paso. aria-expanded en el botón.', demo: <DemoAccordion /> },
    { nombre: 'Paso de traza', estados: ['Agente', 'Herramienta', 'Decisión', 'Error'], regla: 'Punto con forma propia: círculo, círculo verde, rombo y rojo.', demo: <div style={{ width: '100%', display: 'grid', gap: '0.25rem' }}>{[['agent', 'TriageAgent'], ['tool', 'calcular_ruta'], ['decision', 'Orquestador'], ['error', 'buscar_lugares']].map(([t, n], i) => <div key={t} className="acc-btn" style={{ cursor: 'default', padding: '0.25rem 0' }}><TimelineStep n={i + 1} tipo={t as 'agent'} nombre={n} ms={120 * (i + 1)} /></div>)}</div> },
    { nombre: 'Etapas del análisis', estados: ['En curso', 'Completada'], regla: 'Muestra el recorrido del orquestador mientras el caso se procesa.', demo: <div style={{ width: '100%' }}><AgentStepper trazas={[{ agente: 'TriageAgent', herramienta: null, estado: 'completed' }]} /></div> },
    { nombre: 'Marcador de mapa', estados: ['Usuario', 'Lugar', 'Alerta'], regla: 'El dorado con pulso es siempre la ubicación del usuario.', demo: <><MapPin tipo="user" /><MapPin tipo="place" n={1} /><MapPin tipo="alert" /></> },
    { nombre: 'Tarjeta de lugar', estados: ['Ruta real', 'Distancia no confirmada'], regla: 'La distancia solo es «real» si la confirmó el servicio de mapas.', demo: <div style={{ width: '100%' }}><PlaceCard lugar={LUGAR_EJEMPLO} n={1} /></div> },
    { nombre: 'Tarjeta de módulo', estados: ['Reposo', 'Hover', 'Foco'], regla: 'Entrada a un módulo. Ilustración animada y acción que ejecuta.', demo: centrado(<ModuleCard modulo={MODULOS.salud} />) },
    { nombre: 'Esqueleto de carga', estados: ['Cargando'], regla: 'Para esperas de más de 300 ms. Respeta el movimiento reducido.', demo: <div style={{ width: '100%', display: 'grid', gap: 'var(--sp-1)' }}><Skeleton ancho="70%" /><Skeleton /><Skeleton ancho="45%" /></div> },
    { nombre: 'Estado vacío', estados: ['Sin datos'], regla: 'Dice qué falta y ofrece el siguiente paso.', demo: <EmptyState icon="historial" title="Aún no hay casos">Cuando analices una solicitud aparecerá aquí.</EmptyState> },
    { nombre: 'Barra de progreso', estados: ['0 a 100 %'], regla: 'Avance con valor accesible (role="progressbar").', demo: <div style={{ width: '100%' }}><Progress valor={0.6} etiqueta="Avance del análisis" /></div> },
    { nombre: 'Indicador orbital', estados: ['Girando'], regla: 'Dentro de botones o a pantalla completa. No bloquea la vista.', demo: <OrbitSpinner grande /> },
    { nombre: 'Avatar de iniciales', estados: ['Reposo', 'Grupo'], regla: 'El nombre completo va siempre al lado.', demo: <span className="avatars"><Avatar iniciales="JG" /><Avatar iniciales="CA" /><Avatar iniciales="AB" /></span> },
    { nombre: 'Separador ornamental', estados: ['Reposo'], regla: 'Divide secciones mayores. No va entre ítems de una lista.', demo: <div style={{ width: '100%' }}><Ornament /></div> },
    { nombre: 'Sobretítulo', estados: ['Reposo'], regla: 'Ubica la sección. Versalitas con 0,2 em de espaciado.', demo: <Eyebrow>Fase 6 · Agentes</Eyebrow> },
    { nombre: 'Tecla', estados: ['Reposo'], regla: 'Atajos de teclado en la ayuda contextual.', demo: <><Kbd>G</Kbd><Kbd>Esc</Kbd><Kbd>Tab</Kbd></> },
    { nombre: 'Tabla', estados: ['Reposo', 'Hover de fila'], regla: 'Números tabulares a la derecha. Desplazamiento propio si no cabe.', demo: <div className="tbl-wrap" style={{ width: '100%' }}><table className="tbl"><thead><tr><th>Agente</th><th style={{ textAlign: 'right' }}>ms</th></tr></thead><tbody><tr><td>Triage</td><td className="num">2 410</td></tr><tr><td>Geo</td><td className="num">380</td></tr></tbody></table></div> },
    { nombre: 'Bloque de código', estados: ['Reposo', 'Desplazable'], regla: 'Datos reales o marcados como ejemplo.', demo: <pre className="code" style={{ width: '100%' }}>{'{ "suficiente": true,\n  "confianza": 0.93 }'}</pre> },
  ];
}

function PanelComponentes() {
  const lista = componentes();
  return (
    <div className="ds-sec">
      <h3>{lista.length} componentes</h3>
      <p>Son los componentes reales de la aplicación, no capturas. Los estados forzados (hover, foco) se ven sin interactuar; los demás responden al usarlos.</p>
      <div className="comp-grid">
        {lista.map((c, i) => (
          <article key={c.nombre} className="comp">
            <div className="spec">{c.demo}</div>
            <div className="info">
              <h4>{c.nombre}<span>{String(i + 1).padStart(2, '0')}</span></h4>
              <div className="states">{c.estados.map((e) => <i key={e}>{e}</i>)}</div>
              <p className="rule">{c.regla}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Responsivo */

const PUNTOS = [
  { k: 'xs', min: 0, max: 479, nombre: 'Teléfono', texto: 'Una columna. Navegación inferior fija. El cajón sube desde abajo como una hoja. El panel del tablero ocupa todo el ancho.' },
  { k: 'sm', min: 480, max: 767, nombre: 'Teléfono grande', texto: 'Los formularios pasan a dos columnas. Las filas del historial muestran la prioridad.' },
  { k: 'md', min: 768, max: 1023, nombre: 'Tableta', texto: 'La navegación pasa arriba, con texto. Desaparece la barra inferior.' },
  { k: 'lg', min: 1024, max: 1439, nombre: 'Portátil', texto: 'El caso se divide en dos columnas: resultados a un lado; mapa, chat y traza al otro, que queda fijo al desplazar.' },
  { k: 'xl', min: 1440, max: Infinity, nombre: 'Escritorio', texto: 'El contenido se centra con un máximo de 80 rem. Los márgenes laterales crecen con el ancho.' },
];

function PanelResponsivo() {
  const ancho = useAncho();
  return (
    <>
      <div className="ds-sec">
        <h3>Puntos de quiebre</h3>
        <p>Primero móvil. Tu ventana mide {ancho} px: el punto resaltado es el activo.</p>
        <div className="bp-grid">
          {PUNTOS.map((p) => (
            <div key={p.k} className={cls('bp', ancho >= p.min && ancho <= p.max && 'cur')}>
              <b className="k">{p.k}</b>
              <code>{p.min}{p.max === Infinity ? ' px o más' : `–${p.max} px`}</code>
              <span><b style={{ fontWeight: 500, color: 'var(--text)' }}>{p.nombre}.</b> {p.texto}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="ds-sec">
        <h3>Comportamiento adaptativo</h3>
        <ul className="a11y-list">
          <li><Icon name="check" /><span><b>Margen lateral:</b> max(16 px; 4 vw) en todos los tamaños. La página nunca se desplaza en horizontal.</span></li>
          <li><Icon name="check" /><span><b>Rejillas que se llenan:</b> las tarjetas de módulos y de lugares usan auto-fit con un mínimo, sin columnas vacías.</span></li>
          <li><Icon name="check" /><span><b>Tablas y código:</b> llevan su propio desplazamiento horizontal dentro de su contenedor.</span></li>
          <li><Icon name="check" /><span><b>Áreas seguras:</b> la barra superior y la inferior respetan env(safe-area-inset-*).</span></li>
          <li><Icon name="check" /><span><b>Tipografía fluida:</b> los pasos 6 a 9 se reducen con clamp() para no desbordar en teléfonos.</span></li>
          <li><Icon name="check" /><span><b>Objetivos táctiles:</b> controles de 44 px de alto; chips de 36 px con separación de 8 px.</span></li>
        </ul>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ Movimiento */

const DURACIONES: [string, string, string][] = [
  ['--dur-1', '120 ms', 'Color al pasar el cursor'],
  ['--dur-2', '200 ms', 'Presión de botones, enfoque de campos'],
  ['--dur-3', '320 ms', 'Información emergente, chips, tarjetas'],
  ['--dur-4', '560 ms', 'Entrada de contenido, cajón, progreso'],
  ['--dur-5', '900 ms', 'Fundido de los fondos'],
  ['ambiente', '6 a 240 s', 'Órbitas, radar, paquetes y sello (lineal, infinito)'],
];
const CURVAS: [string, string, string][] = [
  ['--ease-standard', 'cubic-bezier(.2,0,0,1)', 'Cambios de estado'],
  ['--ease-emph', 'cubic-bezier(.16,1,.3,1)', 'Entradas: llegan rápido y frenan con calma'],
  ['--ease-exit', 'cubic-bezier(.4,0,1,1)', 'Salidas: aceleran al irse'],
  ['--ease-spring', 'cubic-bezier(.34,1.56,.64,1)', 'Interruptor y presión: un leve rebote'],
  ['lineal', 'linear', 'Solo el movimiento orbital continuo'],
];

function Pista({ curva }: { curva: string }) {
  const [va, setVa] = useState(false);
  const temporizador = useRef<number>(0);
  const reproducir = () => {
    window.clearTimeout(temporizador.current);
    setVa(false);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setVa(true);
      temporizador.current = window.setTimeout(() => setVa(false), 1700);
    }));
  };
  useEffect(() => () => window.clearTimeout(temporizador.current), []);
  return (
    <>
      <div className={cls('track', va && 'go')} style={vars({ '--c': curva })}><i /></div>
      <Button variant="ghost" onClick={reproducir}>Reproducir</Button>
    </>
  );
}

function PanelMovimiento() {
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <>
      <div className="ds-sec">
        <h3>Duraciones</h3>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Token</th><th>Valor</th><th>Uso</th></tr></thead>
            <tbody>{DURACIONES.map(([t, v, u]) => <tr key={t}><td><code>{t}</code></td><td className="num">{v}</td><td>{u}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
      <div className="ds-sec">
        <h3>Curvas</h3>
        <p>Pulsa «Reproducir» para comparar cada curva en 900 ms.</p>
        <div>
          {CURVAS.map(([t, c, u]) => (
            <div key={t} className="mo-row">
              <span><code>{t}</code><small>{u}</small></span>
              <Pista curva={c} />
            </div>
          ))}
        </div>
      </div>
      <div className="ds-sec">
        <h3>Microinteracciones</h3>
        <ul className="micro">
          <li><b>Brillo del botón primario</b><span>Un reflejo cruza el botón al pasar el cursor.</span><code>--dur-4 · --ease-emph</code></li>
          <li><b>Presión</b><span>Todo botón baja a 97 % al presionarlo.</span><code>--dur-2 · --ease-spring</code></li>
          <li><b>Interruptor de tema</b><span>La perilla rebota y el sol gira hasta volverse luna.</span><code>--dur-3 · --ease-spring</code></li>
          <li><b>Tarjetas de módulo</b><span>Suben 4 px, toman el color del módulo y su ilustración sigue animada.</span><code>--dur-3 · --ease-emph</code></li>
          <li><b>Marcador del usuario</b><span>Un pulso dorado indica dónde estás.</span><code>2,4 s · --ease-emph</code></li>
          <li><b>Escritura del asistente</b><span>Tres puntos ondulan mientras consulta el caso.</span><code>1,2 s · escalonado</code></li>
          <li><b>Etapas del análisis</b><span>Cada etapa se ilumina en orden mientras el caso se procesa.</span><code>6,4 s · escalonado 1,6 s</code></li>
          <li><b>Entrada de página</b><span>Los bloques suben con 70 ms de diferencia entre sí.</span><code>--dur-4 · --ease-emph</code></li>
        </ul>
      </div>
      <div className="ds-sec">
        <h3>Movimiento reducido</h3>
        <p>
          Con <code>prefers-reduced-motion: reduce</code> los fondos se detienen (también los SMIL, con pauseAnimations), las animaciones de ambiente no se repiten y las transiciones se acortan a un fundido de 120 ms.
          {reducido ? ' Tu sistema lo tiene activado ahora.' : ' Tu sistema no lo tiene activado.'}
        </p>
      </div>
    </>
  );
}

/* --------------------------------------------------------- Accesibilidad */

function PanelAccesibilidad({ tokens }: { tokens: Tokens | null }) {
  const fila = (tema: 'dark' | 'light', p: (typeof PARES)[number]) => {
    const fg = tokens?.[tema][p.fg];
    const bg = tokens?.[tema][p.bg];
    if (!fg || !bg) return <td colSpan={3} />;
    const r = contraste(fg, bg);
    const v = veredicto(r, p.tipo);
    return (
      <>
        <td><span className="cr-sw" style={{ background: bg, color: fg }}>Aa</span></td>
        <td className="num">{r.toFixed(2)}:1</td>
        <td><Pill tone={v.tono}>{v.texto}</Pill></td>
      </>
    );
  };
  const todos = tokens ? PARES.every((p) => (['dark', 'light'] as const).every((t) => veredicto(contraste(tokens[t][p.fg], tokens[t][p.bg]), p.tipo).tono !== 'danger')) : null;
  return (
    <>
      <div className="ds-sec">
        <h3>Contraste WCAG 2.2 AA</h3>
        <p>
          Se calcula en vivo con la fórmula de luminancia relativa de WCAG sobre los valores reales de los tokens. El texto normal necesita 4,5:1 y los componentes de interfaz 3:1.
          {todos === null ? '' : todos ? ` Los ${PARES.length} pares cumplen en ambos temas.` : ' Hay pares que no cumplen: revisa la tabla.'}
        </p>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Par</th><th colSpan={3}>Oscuro</th><th colSpan={3}>Claro</th></tr></thead>
            <tbody>
              {PARES.map((p) => <tr key={p.nombre}><td>{p.nombre}</td>{fila('dark', p)}{fila('light', p)}</tr>)}
            </tbody>
          </table>
        </div>
      </div>
      <div className="ds-sec">
        <h3>Teclado</h3>
        <ul className="kb-list">
          <li><Kbd>Tab</Kbd> Recorre todos los controles, con foco visible</li>
          <li><Kbd>Enter</Kbd> Envía el formulario del inicio y del chat</li>
          <li><Kbd>Esc</Kbd> Cierra el cajón y la información emergente</li>
          <li><Kbd>←</Kbd><Kbd>→</Kbd> Mueven entre pestañas</li>
          <li><Kbd>Inicio</Kbd><Kbd>Fin</Kbd> Primera y última pestaña</li>
          <li><Kbd>G</Kbd> Retícula de 8 px (en esta página)</li>
        </ul>
      </div>
      <div className="ds-sec">
        <h3>Criterios aplicados</h3>
        <ul className="a11y-list">
          <li><Icon name="check" /><span><b>1.4.1 Uso del color:</b> estados y prioridades llevan texto y forma propia.</span></li>
          <li><Icon name="check" /><span><b>1.4.3 y 1.4.11 Contraste:</b> texto de 4,5:1 o más y bordes de controles de 3:1 o más, en ambos temas.</span></li>
          <li><Icon name="check" /><span><b>2.1.1 Teclado:</b> todo es alcanzable con Tab; los cajones atrapan el foco.</span></li>
          <li><Icon name="check" /><span><b>2.3.3 Animación por interacción:</b> el movimiento reducido detiene los fondos y los bucles.</span></li>
          <li><Icon name="check" /><span><b>2.4.1 Saltar bloques:</b> enlace «Saltar al contenido» al comienzo de cada página.</span></li>
          <li><Icon name="check" /><span><b>2.4.7 Foco visible:</b> anillo champán de 2 px con 3 px de separación.</span></li>
          <li><Icon name="check" /><span><b>2.5.8 Tamaño del objetivo:</b> controles de 44 px de alto.</span></li>
          <li><Icon name="check" /><span><b>3.3.1 y 3.3.3 Errores:</b> el campo con error enlaza su mensaje con aria-describedby.</span></li>
          <li><Icon name="check" /><span><b>4.1.2 Nombre, función y valor:</b> interruptores, pestañas, acordeones y progreso con su rol y estado.</span></li>
          <li><Icon name="check" /><span><b>4.1.3 Mensajes de estado:</b> notificaciones y chat en regiones aria-live.</span></li>
        </ul>
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- Página */

export default function Sistema() {
  const [tab, setTab] = useState(() => {
    const desdeEnlace = window.location.hash.slice(1);
    return PESTAÑAS.some((p) => p.id === desdeEnlace) ? desdeEnlace : 'color';
  });
  const cambiarTab = (id: string) => {
    setTab(id);
    window.history.replaceState(null, '', `#${id}`);
  };
  const [cuadricula, setCuadricula] = useState(false);
  const [oscuro, setOscuro] = useState<HTMLDivElement | null>(null);
  const [claro, setClaro] = useState<HTMLDivElement | null>(null);
  const tokens = useTokens(oscuro, claro);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.toLowerCase() === 'g') setCuadricula((v) => !v);
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, []);

  return (
    <div className="page">
      {/* Lectores de valores: muestran cada tema para calcular colores y contrastes de los dos a la vez */}
      <div data-theme="dark" className="sr-only" ref={setOscuro} aria-hidden="true" />
      <div data-theme="light" className="sr-only" ref={setClaro} aria-hidden="true" />

      <header className="ds-hero">
        <Eyebrow>Sistema de diseño · ORBIS</Eyebrow>
        <h1 className="title">Órbita</h1>
        <p className="lead">Lujo sobrio para un sistema técnico: obsidiana, champán y páramo; una Didone para la voz, una geométrica para la interfaz y una monoespaciada para los datos.</p>
      </header>

      <Tabs etiqueta="Secciones del sistema de diseño" tabs={PESTAÑAS} valor={tab} onChange={cambiarTab} />

      <section className="tabpanel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>
        {tab === 'color' && <PanelColor tokens={tokens} />}
        {tab === 'tipografia' && <PanelTipografia />}
        {tab === 'espaciado' && <PanelEspaciado cuadricula={cuadricula} onCuadricula={() => setCuadricula((v) => !v)} />}
        {tab === 'componentes' && <PanelComponentes />}
        {tab === 'responsivo' && <PanelResponsivo />}
        {tab === 'movimiento' && <PanelMovimiento />}
        {tab === 'accesibilidad' && <PanelAccesibilidad tokens={tokens} />}
      </section>

      {cuadricula && <div className="grid-overlay" aria-hidden="true" />}
    </div>
  );
}
