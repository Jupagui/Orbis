import { useId, useRef, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { alternarTema, useTema } from './theme';
import { cls } from './cls';

interface FieldBase {
  label: string;
  hint?: ReactNode;
  error?: string;
  /** Oculta la etiqueta pero la deja para lectores de pantalla. */
  hideLabel?: boolean;
  forceFocus?: boolean;
}

/** Campo de texto de una línea. Etiqueta, ayuda y error van enlazados con aria-describedby. */
export function Field({ label, hint, error, hideLabel, forceFocus, icon, className, id, ...resto }: FieldBase & { icon?: IconName } & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const campo = id ?? auto;
  const ayuda = hint || error ? `${campo}-msg` : undefined;
  return (
    <div className={cls('field-wrap', className)}>
      <label htmlFor={campo} className={hideLabel ? 'sr-only' : 'field-label'}>{label}</label>
      <div className={cls('field', forceFocus && 'is-focus', error && 'is-error', resto.disabled && 'is-disabled')}>
        {icon && <Icon name={icon} />}
        <input id={campo} aria-invalid={error ? true : undefined} aria-describedby={ayuda} {...resto} />
      </div>
      {error ? <p className="field-msg" id={ayuda}>{error}</p> : hint ? <p className="field-hint" id={ayuda}>{hint}</p> : null}
    </div>
  );
}

export function TextArea({ label, hint, error, hideLabel, forceFocus, className, id, ...resto }: FieldBase & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const campo = id ?? auto;
  const ayuda = hint || error ? `${campo}-msg` : undefined;
  return (
    <div className={cls('field-wrap', className)}>
      <label htmlFor={campo} className={hideLabel ? 'sr-only' : 'field-label'}>{label}</label>
      <div className={cls('field area', forceFocus && 'is-focus', error && 'is-error', resto.disabled && 'is-disabled')}>
        <textarea id={campo} aria-invalid={error ? true : undefined} aria-describedby={ayuda} {...resto} />
      </div>
      {error ? <p className="field-msg" id={ayuda}>{error}</p> : hint ? <p className="field-hint" id={ayuda}>{hint}</p> : null}
    </div>
  );
}

interface ImageDropProps {
  label: string;
  archivo: File | null;
  vista: string | null;
  onChange: (f: File | null) => void;
}

/** Adjuntar una foto: clic, teclado o arrastrar y soltar. */
export function ImageDrop({ label, archivo, vista, onChange }: ImageDropProps) {
  const [encima, setEncima] = useState(false);
  const id = useId();
  const soltar = (e: React.DragEvent) => {
    e.preventDefault();
    setEncima(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('image/')) onChange(f);
  };
  return (
    <div className="field-wrap">
      <span className="field-label" id={`${id}-l`}>{label}</span>
      <label
        className={cls('drop', encima && 'is-over', vista && 'has-img')}
        onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
        onDragLeave={() => setEncima(false)}
        onDrop={soltar}
      >
        {vista ? (
          <img src={vista} alt="Vista previa de la foto adjunta" />
        ) : (
          <>
            <Icon name="camara" />
            <span>Adjuntar imagen</span>
            <small>Arrastra una foto o toca para elegirla</small>
          </>
        )}
        <input className="sr-only" type="file" accept="image/*" aria-labelledby={`${id}-l`} onChange={(e) => onChange(e.target.files?.[0] || null)} />
      </label>
      {archivo && (
        <Button variant="ghost" icon="cerrar" onClick={() => onChange(null)} style={{ justifySelf: 'start', minHeight: '2.25rem' }}>
          Quitar imagen
        </Button>
      )}
    </div>
  );
}

interface SegmentedProps<T extends string> {
  etiqueta: string;
  opciones: { valor: T; texto: string }[];
  valor: T;
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ etiqueta, opciones, valor, onChange }: SegmentedProps<T>) {
  return (
    <div className="seg" role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={o.valor} type="button" aria-pressed={valor === o.valor} onClick={() => onChange(o.valor)}>{o.texto}</button>
      ))}
    </div>
  );
}

interface TabsProps {
  etiqueta: string;
  tabs: { id: string; texto: string }[];
  valor: string;
  onChange: (id: string) => void;
}

/** Pestañas con flechas, Inicio y Fin. Los paneles usan id="panel-{id}" y aria-labelledby="tab-{id}". */
export function Tabs({ etiqueta, tabs, valor, onChange }: TabsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const teclado = (e: KeyboardEvent, i: number) => {
    let j: number | null = null;
    if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = tabs.length - 1;
    if (j === null) return;
    e.preventDefault();
    onChange(tabs[j].id);
    refs.current[j]?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label={etiqueta}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => { refs.current[i] = el; }}
          type="button"
          role="tab"
          id={`tab-${t.id}`}
          aria-controls={`panel-${t.id}`}
          aria-selected={valor === t.id}
          tabIndex={valor === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => teclado(e, i)}
        >
          {t.texto}
        </button>
      ))}
    </div>
  );
}

/** Interruptor de dos estados (role="switch"). Los cambios son inmediatos. */
export function Switch({ checked, onChange, label, children, className }: { checked: boolean; onChange?: (v: boolean) => void; label: string; children?: ReactNode; className?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={cls('switch', className)} onClick={() => onChange?.(!checked)}>
      <span className="knob">{children}</span>
    </button>
  );
}

export function ThemeSwitch() {
  const oscuro = useTema() === 'dark';
  return (
    <Switch checked={oscuro} onChange={alternarTema} label="Modo oscuro">
      <Icon name="sol" className="k-off" />
      <Icon name="luna" className="k-on" />
    </Switch>
  );
}
