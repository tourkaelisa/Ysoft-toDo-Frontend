import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../auth';
import { MatIconModule } from '@angular/material/icon';
import { isValidEmail } from '../validators';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPasswordComponent {
  email = '';

  errorMessage = signal('');
  successMessage = signal('');
  isLoading = signal(false);

  constructor(private authService: AuthService) {}

  onSubmit() {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!isValidEmail(this.email)) {
      this.errorMessage.set('Παρακαλώ δώστε ένα έγκυρο email.');
      return;
    }

    this.isLoading.set(true);

    this.authService.forgotPassword(this.email.trim()).subscribe({
      next: (response: any) => {
        this.isLoading.set(false);
        // Το backend απαντά πάντα γενικά (για λόγους ασφαλείας δεν αποκαλύπτει αν υπάρχει το email)
        this.successMessage.set(
          response?.message || 'Αν το email υπάρχει, στάλθηκε σύνδεσμος επαναφοράς.'
        );
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.');
      }
    });
  }
}
