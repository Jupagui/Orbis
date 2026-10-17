import { cloneElement, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { cls } from './cls';

interface TooltipProps {
  titulo: string;
  texto: string;
  /** Línea técnica en monoespaciada (herramientas, rutas, entradas y salidas). */
  detalle?: string;
  children: ReactElement<{ 'aria-describedby'?: string }>;
}

/** Información complementaria al pasar el cursor o enfocar. Nunca contiene lo único importante. */
export function Tooltip({ titulo, texto, detalle, children }: TooltipProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, abajo: false });
  const host = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLDivElement>(null);

  const mostrar = () => {
    const r = host.current?.getBoundingClientRect();
    if (!r) return;
    const w = tip.current?.offsetWidth ?? 0;
    const h = tip.current?.offsetHeight ?? 0;
    const x = Math.min(Math.max(r.left + r.width / 2, w / 2 + 8), window.innerWidth - w / 2 - 8);
    const abajo = r.top - 10 - h < 8;
    setPos({ x, y: abajo ? r.bottom + 10 : r.top - 10, abajo });
    setVisible(true);
  };
  const ocultar = () => setVisible(false);

  useEffect(() => {
    if (!visible) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setVisible(false);
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [visible]);

  return (
    <>
      <span ref={host} className="tip-host" onPointerEnter={mostrar} onPointerLeave={ocultar} onFocus={mostrar} onBlur={ocultar}>
        {cloneElement(children, { 'aria-describedby': id })}
      </span>
      {createPortal(
        <div ref={tip} id={id} role="tooltip" className={cls('tip', visible && 'show', pos.abajo && 'below')} style={{ left: pos.x, top: pos.y }}>
          <b>{titulo}</b>
          <span>{texto}</span>
          {detalle && <span>{detalle}</span>}
        </div>,
        document.body,
      )}
    </>
  );
}

interface SheetProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}

const FOCALIZABLES = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Cajón lateral modal: atrapa el foco, cierra con Esc y devuelve el foco a quien lo abrió. */
export function Sheet({ abierto, onCerrar, titulo, descripcion, children }: SheetProps) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  // onCerrar suele ser una función nueva en cada render: se guarda en una ref para que el efecto
  // (y con él el foco) no se reinicie con cada letra que se escribe.
  const cerrar = useRef(onCerrar);
  useEffect(() => { cerrar.current = onCerrar; });

  useEffect(() => {
    if (!abierto) return;
    const previo = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const primero = panel.current?.querySelector<HTMLElement>('textarea, input') ?? panel.current?.querySelector<HTMLElement>('button');
    primero?.focus();

    const teclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { cerrar.current(); return; }
      if (e.key !== 'Tab' || !panel.current) return;
      const f = [...panel.current.querySelectorAll<HTMLElement>(FOCALIZABLES)].filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      const ini = f[0];
      const fin = f[f.length - 1];
      if (e.shiftKey && document.activeElement === ini) { e.preventDefault(); fin.focus(); }
      else if (!e.shiftKey && document.activeElement === fin) { e.preventDefault(); ini.focus(); }
    };
    document.addEventListener('keydown', teclado);
    return () => {
      document.removeEventListener('keydown', teclado);
      document.body.style.overflow = overflow;
      previo?.focus?.();
    };
  }, [abierto]);

  if (!abierto) return null;
  return createPortal(
    <div className="sheet-root">
      <div className="sheet-scrim" onClick={onCerrar} />
      <div ref={panel} className="sheet" role="dialog" aria-modal="true" aria-labelledby={`${id}-t`}>
        <div className="sheet-head">
          <div>
            <h2 id={`${id}-t`}>{titulo}</h2>
            {descripcion && <p>{descripcion}</p>}
          </div>
          <Button variant="secondary" iconOnly icon="cerrar" aria-label="Cerrar" onClick={onCerrar} />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
