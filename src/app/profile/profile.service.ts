import { Injectable } from '@angular/core';
import { ApiMessage } from '../shared/api.model';
import { ProfileUpdate } from './profile.model';
import { ApiService } from '../shared/api.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  constructor(private api: ApiService) {}

  // Ενημέρωση στοιχείων του ίδιου του χρήστη.
  updateProfile(id: number, data: ProfileUpdate): Promise<ApiMessage> {
    return this.api.put<ApiMessage>(`/api/users/${id}`, data);
  }

  // Διαγραφή του λογαριασμού του ίδιου του χρήστη.
  deleteAccount(password: string): Promise<ApiMessage> {
    return this.api.delete<ApiMessage>('/api/account', { body: { password } });
  }
}
