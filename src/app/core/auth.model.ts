// (σύνδεση / εγγραφή).

// Ο χρήστης όπως τον επιστρέφει το backend στο login/register (και όπως αποθηκεύεται στο localStorage).
export interface AuthUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  role_name: string;
}

// Απάντηση των endpoints σύνδεσης & εγγραφής
export interface AuthResponse {
  message: string;
  token: string;
  user: AuthUser;
}

// Δεδομένα της φόρμας εγγραφής
export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  birth_date: string;
}

// Το αποκωδικοποιημένο payload ενός JWT 
export interface JwtPayload {
  exp?: number;
  [key: string]: unknown;
}
