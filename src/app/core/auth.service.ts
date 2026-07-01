import { Injectable } from '@angular/core';
import { ApiMessage } from '../shared/api.model';
import { AuthResponse, RegisterData, AuthUser, JwtPayload } from './auth.model';
import { ApiService } from '../shared/api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private api: ApiService) { }

  login(email: string, password: string): Promise<AuthResponse> {
    return this.api.post<AuthResponse>('/api/login', { email, password });
  }

  register(userData: RegisterData): Promise<AuthResponse> {
    return this.api.post<AuthResponse>('/api/users', userData);
  }

  // Αίτημα επαναφοράς κωδικού: στέλνει email με σύνδεσμο επαναφοράς
  forgotPassword(email: string): Promise<ApiMessage> {
    return this.api.post<ApiMessage>('/api/forgot-password', { email });
  }

  // Ορισμός νέου κωδικού με βάση το token από το email
  resetPassword(token: string, newPassword: string): Promise<ApiMessage> {
    return this.api.post<ApiMessage>('/api/reset-password', { token, newPassword });
  }

  // Ελέγχει αν είμαστε συνδεδεμένοι: να υπάρχει token ΚΑΙ να μην έχει λήξει.
  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    if (!token) {
      return false;
    }

    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) {
      return false;
    }

    // Το exp του JWT είναι σε δευτερόλεπτα (Unix), το Date.now() σε milliseconds.
    return payload.exp * 1000 > Date.now();
  }

  // Αποκωδικοποιεί το payload ενός JWT. Επιστρέφει null αν αποτύχει.
  private decodeToken(token: string): JwtPayload | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  // Παίρνει τα στοιχεία του χρήστη (και τον ρόλο του) από το localStorage
  getUserData(): AuthUser | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  // Καθαρίζει το localStorage για να κάνει Αποσύνδεση 
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}