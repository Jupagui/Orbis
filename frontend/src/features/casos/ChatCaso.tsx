import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChat, enviarPregunta, type MensajeChat } from '../../services/api';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Badges';
import { ChatBubble, TypingDots } from '../../ui/Chat';
import { Icon } from '../../ui/Icon';
import { Card, CardHeader } from '../../ui/Surfaces';

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
    <Card className="chat">
      <CardHeader icon="chat" title="Pregúntale a ORBIS sobre este caso" />
      <p className="small muted">Responde solo con la información del caso, los datos propios y lo consultado en el mapa.</p>

      <div ref={cajaRef} className="chat-log" role="log" aria-live="polite" aria-label="Conversación del caso">
        {mensajes.length === 0 && (
          <div className="chat-sugg">
            {SUGERENCIAS.map((s) => <Chip key={s} onClick={() => enviar(s)}>{s}</Chip>)}
          </div>
        )}
        {mensajes.map((m, i) => (
          <ChatBubble key={i} rol={m.rol}>{conNegritas(m.contenido)}</ChatBubble>
        ))}
        {mutation.isPending && <TypingDots />}
      </div>

      <form className="chat-form" onSubmit={(e) => { e.preventDefault(); enviar(pregunta); }}>
        <div className="field">
          <input
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            placeholder="Escribe tu pregunta…"
            aria-label="Pregunta sobre el caso"
          />
        </div>
        <Button type="submit" iconOnly icon="enviar" aria-label="Enviar pregunta" disabled={!pregunta.trim() || mutation.isPending} />
      </form>
      <p className="small muted" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Icon name="info" />Si no tiene el dato verificado, te lo dirá.</p>
    </Card>
  );
}
