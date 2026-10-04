import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const reportarCaso = async (descripcion: string, tipo?: string, lat?: number, lon?: number) => {
  const formData = new FormData();
  formData.append('descripcion', descripcion);
  if (tipo) formData.append('tipo', tipo);
  
  if (lat && lon) {
    formData.append('lat', lat.toString());
    formData.append('lon', lon.toString());
  }

  const response = await apiClient.post('/casos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const getCaso = async (id: string) => {
  const response = await apiClient.get(`/casos/${id}`);
  return response.data;
};

export const getTrazas = async (id: string) => {
  const response = await apiClient.get(`/casos/${id}/trazas`);
  return response.data;
};
