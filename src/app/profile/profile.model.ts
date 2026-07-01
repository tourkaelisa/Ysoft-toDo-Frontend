// Ο χρήστης στη φόρμα του προφίλ.
export interface Profile {
  id: number | null;
  email: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  role_id: number | null;
}

// Δεδομένα που στέλνονται στο backend για ενημέρωση προφίλ.
export interface ProfileUpdate {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  role_id: number | null;
  newPassword: string;
}
