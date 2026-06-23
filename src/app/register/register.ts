import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { toLocalYMD } from '../date-utils';
import { isValidEmail, isValidPassword } from '../validators';
import { CustomDateAdapter, MY_DATE_FORMATS } from '../date-adapter';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatDatepickerModule, MatNativeDateModule, MatInputModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'el-GR' }, // Μεταφράζει το ημερολόγιο στα Ελληνικά
    { provide: DateAdapter, useClass: CustomDateAdapter }, // Φορτώνει τον δικό μας adapter
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS } // Εφαρμόζει το format
  ]
})
export class RegisterComponent {
  user = {
    email: '',
    password: '',
    first_name: '',      
    last_name: '',       
    birth_date: '', 
  };

  errorMessage = signal('');
  successMessage = signal('');
  isPasswordVisible = false;

  constructor(
    private authService: AuthService, 
    private router: Router
  ) {}

  onRegister() {
    (document.activeElement as HTMLElement)?.blur();

    this.errorMessage.set('');
    this.successMessage.set('');

    if (!isValidEmail(this.user.email)) {
      this.errorMessage.set('Παρακαλώ εισάγετε ένα έγκυρο email (π.χ. name@example.com).');
      return;
    }

    if (this.user.password && !isValidPassword(this.user.password)) {
      this.errorMessage.set('Σφάλμα: Ο κωδικός πρόσβασης πρέπει να είναι τουλάχιστον 4 χαρακτήρες.');
      return;
    }

    // Κανονικοποίηση ημερομηνίας σε τοπικό 'YYYY-MM-DD' (αποφυγή timezone -1 μέρα)
    this.user.birth_date = toLocalYMD(this.user.birth_date);

    this.authService.register(this.user).subscribe({
      next: (response: any) => {
        if (response.token) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
        }
        this.router.navigate(['/home']);
      },
      error: (err: any) => {
        if (err.status === 409 || (err.error && err.error.message && err.error.message.includes('χρησιμοποιείται'))) {
          this.errorMessage.set('Υπάρχει ήδη λογαριασμός με αυτό το email.');
        } else if (err.status === 400) {
          this.errorMessage.set(err.error?.message || 'Λείπουν υποχρεωτικά πεδία.');
        } else {
          this.errorMessage.set('Υπήρξε ένα πρόβλημα. Βεβαιωθείτε ότι συμπληρώσατε σωστά τα πεδία.');
        }
      }
    });
  }
}