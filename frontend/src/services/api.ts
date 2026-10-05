import axios from 'axios';

export const API_URL = 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
});

export interface NuevoCaso {
  descripcion: string;
  tipo?: string;
  lat?: number;
  lon?: number;
  direccion?: string;
  imagen?: File | null;
}

export const reportarCaso = async ({ descripcion, tipo, lat, lon, direccion, imagen }: NuevoCaso) => {
  const formData = new FormData();
  formData.append('descripcion', descripcion);
  if (tipo) formData.append('tipo', tipo);
  if (lat !== undefined && lon !== undefined) {
    formData.append('lat', lat.toString());
    formData.append('lon', lon.toString());
  }
  if (direccion) formData.append('direccion', direccion);
  if (imagen) formData.append('imagen', imagen);

  const response = await apiClient.post('/casos', formData);
  return response.data;
};

export const getCasos = async (orden: 'recientes' | 'prioridad' = 'recientes') => {
  const response = await apiClient.get('/casos', { params: { orden } });
  return response.data;
};

// Colores y textos de la prioridad que asigna el Verificador
export const PRIORIDADES: Record<string, { texto: string; color: string }> = {
  critica: { texto: 'Crítica', color: 'var(--danger)' },
  alta: { texto: 'Alta', color: 'var(--warning)' },
  media: { texto: 'Media', color: 'var(--info)' },
  baja: { texto: 'Baja', color: 'var(--success)' },
  normal: { texto: 'Sin prioridad', color: 'var(--text-muted)' },
};

export const getCaso = async (id: string) => {
  const response = await apiClient.get(`/casos/${id}`);
  return response.data;
};

export const getTrazas = async (id: string) => {
  const response = await apiClient.get(`/casos/${id}/trazas`);
  return response.data;
};

export const imagenCasoUrl = (id: string) => `${API_URL}/casos/${id}/imagen`;

export interface MensajeChat {
  rol: 'usuario' | 'asistente';
  contenido: string;
}

export const getChat = async (id: string): Promise<MensajeChat[]> => {
  const response = await apiClient.get(`/casos/${id}/chat`);
  return response.data;
};

export const enviarPregunta = async (id: string, pregunta: string): Promise<MensajeChat> => {
  const response = await apiClient.post(`/casos/${id}/chat`, { pregunta });
  return response.data;
};
