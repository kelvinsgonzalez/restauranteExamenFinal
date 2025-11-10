import axios from 'axios';
import {
  DashboardOverview,
  SlotSuggestion,
  TableAvailability,
  TableOccupancy,
} from '../types';

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

export const getAvailability = async (
  params: { date: string; time: string; people: number },
  signal?: AbortSignal,
) => {
  const { data } = await api.get<TableAvailability[]>('/tables/availability', {
    params,
    signal,
  });
  return data;
};

export const getSlotSuggestions = async (
  params: { date: string; people: number },
  signal?: AbortSignal,
) => {
  const { data } = await api.get<SlotSuggestion[]>('/tables/suggestions', {
    params,
    signal,
  });
  return data;
};

type CreateReservationPayload = {
  clientId: string;
  tableId: string;
  date: string;
  time: string;
  people: number;
  notes?: string;
};

export const createReservation = async (payload: CreateReservationPayload) => {
  await api.post('/reservations', {
    customerId: payload.clientId,
    tableId: payload.tableId,
    people: payload.people,
    startsAt: `${payload.date}T${payload.time}:00`,
    notes: payload.notes ?? '',
  });
};

export const getDashboardOverview = async (params?: {
  date?: string;
  days?: number;
  signal?: AbortSignal;
}) => {
  const { signal, ...rest } = params ?? {};
  const query: Record<string, string | number> = {};
  if (rest.date) query.date = rest.date;
  if (rest.days) query.days = rest.days;
  const { data } = await api.get<DashboardOverview>('/reservations/overview', {
    params: query,
    signal,
  });
  return data;
};

export const getTablesOccupancy = async (params: {
  date: string;
  time: string;
  signal?: AbortSignal;
}) => {
  const { signal, ...rest } = params;
  const { data } = await api.get<TableOccupancy[]>('/tables/occupancy', {
    params: rest,
    signal,
  });
  return data;
};

export const deleteReservation = async (
  id: string,
  options?: { force?: boolean },
) => {
  await api.delete(`/reservations/${id}`, {
    params: options?.force ? { force: true } : undefined,
  });
};

export { api };
