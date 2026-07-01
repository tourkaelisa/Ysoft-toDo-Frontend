import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api.config';

// Έξτρα επιλογές για σπάνιες περιπτώσεις request:
//  - responseType: 'blob'  -> λήψη αρχείου αντί για JSON
//  - body                  -> σώμα σε DELETE (π.χ. διαγραφή λογαριασμού με κωδικό)
export interface ApiOptions {
  responseType?: 'blob';
  body?: unknown;
}

// Κεντρικό σημείο για όλες τις κλήσεις στο backend.
// Κρύβει τη βάση URL και τη μετατροπή του Observable σε Promise, ώστε τα
// services να περνούν μόνο το path. Το Authorization header μπαίνει αυτόματα
// από τον authInterceptor.
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = API_BASE_URL;

  constructor(private http: HttpClient) {}

  // GET
  select<T>(path: string, options: ApiOptions = {}): Promise<T> {
    return firstValueFrom(this.http.get<T>(this.url(path), this.opts(options)) as Observable<T>);
  }

  // POST
  post<T>(path: string, body?: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(this.url(path), body) as Observable<T>);
  }

  // PUT
  put<T>(path: string, body?: unknown): Promise<T> {
    return firstValueFrom(this.http.put<T>(this.url(path), body) as Observable<T>);
  }

  // DELETE
  delete<T>(path: string, options: ApiOptions = {}): Promise<T> {
    return firstValueFrom(this.http.delete<T>(this.url(path), this.opts(options)) as Observable<T>);
  }


  // ---- εσωτερικά ----

  // Συνθέτει το πλήρες URL από τη βάση και το path του service.
  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  // Επιστρέφει τις έξτρα επιλογές ως any, για να αποφύγουμε τη σύγκρουση
  // overloads του HttpClient (π.χ. responseType: 'blob').
  private opts(options: ApiOptions): any {
    return { ...options };
  }
}
