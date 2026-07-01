import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../core/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { isValidEmail } from '../shared/validators';
import { ApiMessage } from '../shared/api.model';

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

  async onSubmit() {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!isValidEmail(this.email)) {
      this.errorMessage.set('Παρακαλώ δώστε ένα έγκυρο email.');
      return;
    }

    this.isLoading.set(true);

    try {
      const response: ApiMessage = await this.authService.forgotPassword(this.email.trim());
      this.isLoading.set(false);
      this.successMessage.set(
        response?.message || 'Αν το email υπάρχει, στάλθηκε σύνδεσμος επαναφοράς.'
      );
    } catch (err) {
      this.isLoading.set(false);
      this.errorMessage.set((err as HttpErrorResponse).error?.message || 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.');
    }
  }
}
