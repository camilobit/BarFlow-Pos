import axios from 'axios';
import { supabase } from './supabaseClient.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

// Adjunta el JWT de Supabase en cada petición
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// La API ahora responde siempre con el sobre { success, message, data }.
// Lo desempaquetamos acá, en un solo lugar, para que el resto del código
// (endpoints.js) siga leyendo `res.data` como el valor útil directamente,
// sin tener que escribir `res.data.data` en cada llamada.
api.interceptors.response.use(
  (res) => {
    if (res.data && typeof res.data === 'object' && 'success' in res.data) {
      res.data = res.data.data;
    }
    return res;
  },
  (err) => {
    const mensaje = err?.response?.data?.message || 'Ocurrió un error inesperado.';
    return Promise.reject(new Error(mensaje));
  }
);

export default api;
