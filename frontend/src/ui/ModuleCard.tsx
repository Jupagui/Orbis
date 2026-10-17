import { Icon } from './Icon';
import { ModuleArt } from './ModuleArt';
import { vars } from './cls';
import type { Modulo } from './modules';

/** Tarjeta de entrada a un módulo: ilustración animada, descripción y la acción que ejecuta. */
export function ModuleCard({ modulo, onClick, indice = 0 }: { modulo: Modulo; onClick?: () => void; indice?: number }) {
  return (
    <button
      type="button"
      className="module-card rise"
      style={vars({ '--accent': `var(${modulo.accent})`, '--i': indice })}
      onClick={onClick}
    >
      <span className="art"><ModuleArt modulo={modulo.key} /></span>
      <span className="body">
        <span className="name"><Icon name={modulo.icon} />{modulo.titulo}</span>
        <span className="desc">{modulo.desc}</span>
        <span className="act"><Icon name="accion" />{modulo.accion}</span>
      </span>
    </button>
  );
}
