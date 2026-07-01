// Χρήστης όπως τον επιστρέφει το backend
export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  birth_date: string;
  role_name: string;
  role_id?: number;
}

// Δεδομένα της φόρμας προσθήκης/επεξεργασίας χρήστη.
export interface UserFormData {
  first_name: string;
  last_name: string;
  email: string;
  birth_date: string;
  password: string;
  role_name: string;
}

// Απάντηση των endpoints που αλλάζουν χρήστη/ρόλο από τον admin.
// Όταν ο admin αλλάζει τον δικό του ρόλο, το backend επιστρέφει νέο token αλλιώς token === null.
export interface UserUpdateResponse {
  message: string;
  token: string | null;
  role_id: number;
  role_name: string;
}
