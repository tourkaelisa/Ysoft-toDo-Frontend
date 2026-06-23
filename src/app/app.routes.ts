import { Routes } from '@angular/router';

import { LandingComponent } from './landing/landing';
import { LoginComponent } from './login/login'; 
import { RegisterComponent } from './register/register';
import { HomeComponent } from './home/home';
import { TasksComponent } from './tasks/tasks';
import { ProfileComponent } from './profile/profile';
import { UsersComponent } from './users/users';
import { ForgotPasswordComponent } from './forgot-password/forgot-password';
import { ResetPasswordComponent } from './reset-password/reset-password';
import { authGuard } from './auth-guard';

export const routes: Routes = [
  // 1. Η Πρώτη σελίδα (το σκέτο URL) τώρα φορτώνει τη Landing Page!
  { path: '', component: LandingComponent },

  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },

  // Προστατευμένες σελίδες: απαιτούν έγκυρο (μη ληγμένο) token.
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'tasks', component: TasksComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'users', component: UsersComponent, canActivate: [authGuard] },

  // 2. Αν κάποιος γράψει λάθος URL (π.χ. /lalala), πήγαινέ τον πίσω στην αρχική (Landing)
  { path: '**', redirectTo: '' }
];