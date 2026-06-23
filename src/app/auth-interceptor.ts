import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth';

// Παρακολουθεί όλες τις απαντήσεις του backend. Αν έρθει 401 ΕΝΩ ο χρήστης
// θεωρείται συνδεδεμένος, σημαίνει ότι η συνεδρία έληξε/ακυρώθηκε:
// αποσυνδέουμε και στέλνουμε στο login.
//
// Σημείωση: το 401 από τη φόρμα σύνδεσης (λάθος κωδικός) ΔΕΝ μας αφορά, γιατί
// εκεί δεν υπάρχει token -> το isLoggedIn() είναι false και δεν κάνουμε redirect.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Ελέγχουμε αν το request ήταν αυθεντικοποιημένο (υπάρχει token), όχι αν
      // ισχύει: ένα ληγμένο token υπάρχει μεν, αλλά παίρνει 401 και πρέπει να
      // οδηγήσει σε αποσύνδεση.
      if (err.status === 401 && localStorage.getItem('token')) {
        authService.logout();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
