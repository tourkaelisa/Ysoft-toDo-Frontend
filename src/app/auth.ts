import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5000/api/login';
  private registerUrl = 'http://localhost:5000/api/users';
  private forgotPasswordUrl = 'http://localhost:5000/api/forgot-password';
  private resetPasswordUrl = 'http://localhost:5000/api/reset-password';

  constructor(private http: HttpClient) { }

  login(email: string, password: string): Observable<any> {
    const body = { email, password };
    return this.http.post(this.apiUrl, body);
  }

  register(userData: any): Observable<any> {
    return this.http.post(this.registerUrl, userData);
  }

  // Αίτημα επαναφοράς κωδικού: στέλνει email με σύνδεσμο επαναφοράς
  forgotPassword(email: string): Observable<any> {
    return this.http.post(this.forgotPasswordUrl, { email });
  }

  // Ορισμός νέου κωδικού με βάση το token από το email
  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(this.resetPasswordUrl, { token, newPassword });
  }

  // 1. Ελέγχει αν είμαστε συνδεδεμένοι: να υπάρχει token ΚΑΙ να μην έχει λήξει.
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

  // Αποκωδικοποιεί το payload ενός JWT (το μεσαίο μέρος). Επιστρέφει null αν αποτύχει.
  private decodeToken(token: string): any {
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

  // 2. Παίρνει τα στοιχεία του χρήστη (και τον ρόλο του) από το localStorage
  getUserData(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  // 3. Καθαρίζει το localStorage για να κάνει Αποσύνδεση (Task 6)
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}