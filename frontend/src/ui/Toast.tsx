import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { ToastContext, type Avisar, type TonoAviso } from './useToast';
import { cls } from './cls';

interface Aviso { id: number; mensaje: string; tono: TonoAviso }

/** Proveedor de notificaciones. Se anuncian con aria-live y se van solas a los 3,2 s (6 s si son errores). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const contador = useRef(0);

  const avisar = useCallback<Avisar>((mensaje, tono = 'info') => {
    const id = ++contador.current;
    setAvisos((prev) => [...prev.slice(-2), { id, mensaje, tono }]);
    setTimeout(() => setAvisos((prev) => prev.filter((a) => a.id !== id)), tono === 'error' ? 6000 : 3200);
  }, []);

  return (
    <ToastContext.Provider value={avisar}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={cls('toast', a.tono !== 'info' && a.tono)}>
            <Icon name={a.tono === 'error' ? 'alerta' : a.tono === 'ok' ? 'check' : 'info'} />
            {a.mensaje}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
