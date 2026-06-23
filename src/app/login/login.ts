import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth';
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

  onLogin() {
    this.authService.login(this.credentials.email, this.credentials.password).subscribe({
      next: (response: any) => { 
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        this.errorMessage.set(''); 
        this.router.navigate(['/home']); 
      },
      error: (err: any) => {
        const message = err.error?.message || 'Λάθος email ή κωδικός πρόσβασης.';
        this.errorMessage.set(message);

        this.credentials.password = '';
      }
    });
  }
}