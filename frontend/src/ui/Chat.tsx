import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { cls } from './cls';

/** Burbuja del chat. El asistente puede llevar una fuente; sin fuente lo dice. */
export function ChatBubble({ rol, children, fuente }: { rol: 'usuario' | 'asistente'; children: ReactNode; fuente?: { texto: string; verificada: boolean } }) {
  return (
    <div className={cls('bubble', rol === 'usuario' ? 'user' : 'bot')}>
      {children}
      {fuente && (
        <span className={cls('src', !fuente.verificada && 'none')} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-1)', color: fuente.verificada ? 'var(--sage)' : 'var(--warn)' }}>
          <Icon name={fuente.verificada ? 'mapa' : 'alerta'} />
          {fuente.texto}
        </span>
      )}
    </div>
  );
}

/** Indicador de que el asistente está respondiendo. */
export function TypingDots() {
  return (
    <div className="bubble bot typing" role="status" aria-label="Consultando el caso">
      <i /><i /><i />
    </div>
  );
}
