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
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  // Η πρώτη σελίδα (το σκέτο URL) (landing page)
  { path: '', component: LandingComponent },

  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },

  // σελίδες που απαιτούν token.
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'tasks', component: TasksComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'users', component: UsersComponent, canActivate: [authGuard] },

  // Αν κάποιος γράψει λάθος URL, πάει στο Landing
  { path: '**', redirectTo: '' }
];