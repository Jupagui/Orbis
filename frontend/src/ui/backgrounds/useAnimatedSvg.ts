import { useEffect, type RefObject } from 'react';

/** Pausa las animaciones del SVG cuando no se ven, la pestaña está oculta o el usuario pidió menos movimiento
    (incluye las animaciones SMIL, que el CSS no puede detener). */
export function useAnimatedSvg(ref: RefObject<SVGSVGElement | null>) {
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const reducido = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true;

    const sincronizar = () => {
      const activo = visible && !reducido.matches && !document.hidden;
      svg.classList.toggle('is-paused', !activo);
      if (typeof svg.pauseAnimations === 'function') {
        if (activo) svg.unpauseAnimations();
        else svg.pauseAnimations();
      }
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sincronizar();
    });
    io.observe(svg);
    reducido.addEventListener('change', sincronizar);
    document.addEventListener('visibilitychange', sincronizar);
    sincronizar();

    return () => {
      io.disconnect();
      reducido.removeEventListener('change', sincronizar);
      document.removeEventListener('visibilitychange', sincronizar);
    };
  }, [ref]);
}
