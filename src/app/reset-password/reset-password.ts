import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../core/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { isValidPassword, PASSWORD_MIN_LENGTH } from '../shared/validators';
import { ApiMessage } from '../shared/api.model';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';

  isPasswordVisible = false;
  isConfirmVisible = false;

  errorMessage = signal('');
  successMessage = signal('');
  isLoading = signal(false);
  // Όταν γίνει επιτυχής αλλαγή, κρύβουμε τη φόρμα
  isDone = signal(false);

  readonly minLength = PASSWORD_MIN_LENGTH;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.token) {
      this.errorMessage.set('Ο σύνδεσμος επαναφοράς δεν είναι έγκυρος. Ζητήστε νέο σύνδεσμο.');
    }
  }

  async onSubmit() {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.token) {
      this.errorMessage.set('Ο σύνδεσμος επαναφοράς δεν είναι έγκυρος. Ζητήστε νέο σύνδεσμο.');
      return;
    }

    if (!isValidPassword(this.newPassword)) {
      this.errorMessage.set(`Ο κωδικός πρέπει να έχει τουλάχιστον ${this.minLength} χαρακτήρες.`);
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set('Οι κωδικοί δεν ταιριάζουν.');
      return;
    }

    this.isLoading.set(true);

    try {
      const response: ApiMessage = await this.authService.resetPassword(this.token, this.newPassword);
      this.isLoading.set(false);
      this.isDone.set(true);
      this.successMessage.set(response?.message || 'Ο κωδικός άλλαξε επιτυχώς.');
      // Αυτόματη ανακατεύθυνση στη σύνδεση μετά από λίγο
      setTimeout(() => this.router.navigate(['/login']), 2500);
    } catch (err) {
      this.isLoading.set(false);
      this.errorMessage.set(
        (err as HttpErrorResponse).error?.message || 'Ο σύνδεσσμος επαναφοράς δεν είναι έγκυρος ή έχει λήξει.'
      );
    }
  }
}
