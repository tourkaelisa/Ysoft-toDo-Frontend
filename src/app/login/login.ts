import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../core/auth.service';
import { AuthResponse } from '../core/auth.model';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './login.html',
  styleUrl: './login.css' 
})
export class LoginComponent {
  credentials = { email: '', password: ''};

  errorMessage = signal('');
  isPasswordVisible = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async onLogin() {
    this.errorMessage.set('');

    try {
      const response: AuthResponse = await this.authService.login(this.credentials.email, this.credentials.password);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      this.router.navigate(['/home']);
    } catch (err) {
      const message = (err as HttpErrorResponse).error?.message || 'Λάθος email ή κωδικός πρόσβασης.';
      this.errorMessage.set(message);

      this.credentials.password = '';
    }
  }
}