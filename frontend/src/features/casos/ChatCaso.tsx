import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { getChat, enviarPregunta, type MensajeChat } from '../../services/api';

const SUGERENCIAS = ['¿Cuál opción me queda más cerca?', '¿Qué debo hacer mientras tanto?', '¿De dónde sale esta información?'];

// El modelo responde con **negritas** de Markdown; se convierten sin usar HTML crudo
function conNegritas(texto: string) {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    parte.startsWith('**') && parte.endsWith('**') ? <strong key={i}>{parte.slice(2, -2)}</strong> : parte
  );
}

export default function ChatCaso({ casoId }: { casoId: string }) {
  const [pregunta, setPregunta] = useState('');
  const queryClient = useQueryClient();
  const cajaRef = useRef<HTMLDivElement>(null);

  const { data: mensajes = [] } = useQuery({ queryKey: ['chat', casoId], queryFn: () => getChat(casoId) });

  const mutation = useMutation({
    mutationFn: (texto: string) => enviarPregunta(casoId, texto),
    onMutate: (texto) => {
      // Mostrar la pregunta de inmediato mientras responde el modelo
      queryClient.setQueryData<MensajeChat[]>(['chat', casoId], (prev = []) => [...prev, { rol: 'usuario', contenido: texto }]);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', casoId] });
      queryClient.invalidateQueries({ queryKey: ['trazas', casoId] });
    },
  });

  useEffect(() => {
    // Desplaza solo la caja del chat, no toda la página
    const caja = cajaRef.current;
    if (caja) caja.scrollTop = caja.scrollHeight;
  }, [mensajes.length, mutation.isPending]);

  const enviar = (texto: string) => {
    const limpio = texto.trim();
    if (!limpio || mutation.isPending) return;
    setPregunta('');
    mutation.mutate(limpio);
  };

  return (
    <section style={{ backgroundColor: 'var(--surface-1)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.1rem', color: 'var(--primary)' }}>
        <MessageCircle size={18} /> Pregúntale a ORBIS sobre este caso
      </h2>
      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Responde solo con la información del caso, los datos propios y lo consultado en el mapa.
      </p>

      <div ref={cajaRef} style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {mensajes.length === 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {SUGERENCIAS.map((s) => (
              <button key={s} onClick={() => enviar(s)} style={{ padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.85rem' }}>
                {s}
              </button>
            ))}
          </div>
        )}
        {mensajes.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.rol === 'usuario' ? 'flex-end' : 'flex-start',
            maxWidth: '85%', padding: '0.6rem 0.9rem', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap', fontSize: '0.9rem',
            backgroundColor: m.rol === 'usuario' ? 'var(--primary)' : 'var(--surface-2)',
            color: m.rol === 'usuario' ? 'var(--on-primary)' : 'var(--text)',
          }}>
            {conNegritas(m.contenido)}
          </div>
        ))}
        {mutation.isPending && (
          <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <Loader2 size={14} className="animate-spin" /> Consultando el caso…
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); enviar(pregunta); }} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          placeholder="Escribe tu pregunta…"
          aria-label="Pregunta sobre el caso"
          style={{ flex: 1, padding: '0.7rem 1rem', borderRadius: '20px', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)' }}
        />
        <button type="submit" disabled={!pregunta.trim() || mutation.isPending} aria-label="Enviar pregunta"
          style={{ padding: '0 1rem', borderRadius: '20px', border: 'none', backgroundColor: 'var(--primary)', color: 'var(--on-primary)', cursor: 'pointer', opacity: !pregunta.trim() || mutation.isPending ? 0.5 : 1 }}>
          <Send size={16} />
        </button>
      </form>
    </section>
  );
}
