export interface Table {
  id: string;
  number: number;
  capacity: number;
  location: string;
  isActive: boolean;
}

export interface Customer {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  points: number;
}

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'NOSHOW'
  | 'DONE';

export interface Reservation {
  id: string;
  customerId: string;
  tableId: string;
  people: number;
  startsAt: string;
  endsAt: string;
  status: ReservationStatus;
  notes?: string | null;
  customer?: Customer;
  table?: Table;
}

export interface AvailabilityResponse {
  available: Table[];
  suggestions: { startsAt: string; endsAt: string }[];
}
