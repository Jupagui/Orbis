import { createContext, useContext } from 'react';

export type TonoAviso = 'info' | 'ok' | 'error';
export type Avisar = (mensaje: string, tono?: TonoAviso) => void;

export const ToastContext = createContext<Avisar>(() => {});

/** Muestra una notificación breve. Reemplaza a alert(). */
export const useToast = () => useContext(ToastContext);
