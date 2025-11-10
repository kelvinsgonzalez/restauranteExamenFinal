import axios from 'axios';
import { TableAvailability } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? 'http://localhost:3000/api/v1',
  withCredentials: true,
});

let authToken: string | null = null;

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authToken = null;
      localStorage.removeItem('rf_token');
    }
    return Promise.reject(error);
  },
);

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getTablesAvailability = (
  params: { date: string; time: string; people: number },
  signal?: AbortSignal,
) => api.get<TableAvailability[]>('/tables/availability', {
  params,
  signal,
});

export { api };
