import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Αν δεν υπάρχει έγκυρο token (λείπει ή έχει λήξει), δεν αφήνει τον χρήστη να μπει και τον στέλνει στο login.
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  // Καθαρίζουμε τυχόν ληγμένο token και πάμε στο login.
  authService.logout();
  router.navigate(['/login']);
  return false;
};
