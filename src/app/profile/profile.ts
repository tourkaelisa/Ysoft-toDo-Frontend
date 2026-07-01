import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { toLocalYMD } from '../shared/date-utils';
import { isValidEmail, isValidPassword } from '../shared/validators';
import { CustomDateAdapter, MY_DATE_FORMATS } from '../shared/date-adapter';
import { ProfileService } from './profile.service';
import { Profile, ProfileUpdate } from './profile.model';


@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatIconModule, 
    MatDatepickerModule, 
    MatInputModule, 
    MatNativeDateModule
  ],

  templateUrl: './profile.html',
  styleUrl: './profile.css',
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'el-GR' }, 
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
  ]
})
export class ProfileComponent implements OnInit {
  
  user: Profile = {
    id: null,
    email: '',
    first_name: '',
    last_name: '',
    birth_date: '',
    role_id: null
  };

  confirmPassword = '';
  isPasswordVisible = false;

  newPassword = '';
  confirmNewPassword = '';

  errorMessage = signal('');
  successMessage = signal('');

  showDeleteModal = signal(false);
  deletePassword = '';
  isDeletePasswordVisible = false;
  isDeleting = signal(false);
  deleteError = signal('');

  constructor(private profileService: ProfileService, private router: Router) {}

  ngOnInit() {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      this.user = JSON.parse(savedUser);
    }
  }

  async onUpdateProfile() {
    (document.activeElement as HTMLElement)?.blur();

    this.errorMessage.set('');
    this.successMessage.set('');

    const userId = this.user.id;

    if (!userId) {
      this.errorMessage.set('Σφάλμα: Δεν βρέθηκε το αναγνωριστικό (ID) του χρήστη.');
      return;
    }

    if (!isValidEmail(this.user.email)) {
      this.errorMessage.set('Παρακαλώ εισάγετε ένα έγκυρο email (π.χ. name@example.com).');
      return;
    }

    if (!this.confirmPassword) {
      this.errorMessage.set('Παρακαλώ εισάγετε τον τρέχοντα κωδικό σας για επιβεβαίωση των αλλαγών.');
      return;
    }

    // Ελέγχει αν γράφτηκε κάτι στον νέο κωδικό, πρέπει να ταιριάζει με την επιβεβαίωση
    if (this.newPassword || this.confirmNewPassword) {
      if (this.newPassword !== this.confirmNewPassword) {
        this.errorMessage.set('Σφάλμα: Ο νέος κωδικός και η επιβεβαίωση νέου κωδικού δεν ταιριάζουν.');
        this.confirmPassword = '';
        this.newPassword = '';
        this.confirmNewPassword = '';
        return;
      }
      if (!isValidPassword(this.newPassword)) { 
        this.errorMessage.set('Σφάλμα: Ο νέος κωδικός πρέπει να είναι τουλάχιστον 4 χαρακτήρες.');
        this.confirmPassword = '';
        this.newPassword = '';
        this.confirmNewPassword = '';
        return;
      }
    }

    this.user.birth_date = toLocalYMD(this.user.birth_date);

    const body: ProfileUpdate = {
      email: this.user.email,
      password: this.confirmPassword,
      first_name: this.user.first_name,
      last_name: this.user.last_name,
      birth_date: this.user.birth_date,
      role_id: this.user.role_id,
      newPassword: this.newPassword
    };

    try {
      await this.profileService.updateProfile(userId, body);
      this.successMessage.set('Οι αλλαγές αποθηκεύτηκαν επιτυχώς.');
      localStorage.setItem('user', JSON.stringify(this.user));

      // Καθαρισμός σε περίπτωση επιτυχίας
      this.confirmPassword = '';
      this.newPassword = '';
      this.confirmNewPassword = '';
    } catch (err: any) {
      const message = err.error?.message || 'Υπήρξε ένα πρόβλημα κατά την αποθήκευση. Βεβαιωθείτε ότι ο κωδικός πρόσβασης είναι σωστός.';
      this.errorMessage.set(message);

      // Αδειάζουμε τις μεταβλητές ρητά μέσα στο σφάλμα του backend
      this.confirmPassword = '';
      this.newPassword = '';
      this.confirmNewPassword = '';
    }
  }


  // ΔΙΑΓΡΑΦΗ ΛΟΓΑΡΙΑΣΜΟΥ
 
  openDeleteModal() {
    this.deleteError.set('');
    this.deletePassword = '';
    this.isDeletePasswordVisible = false;
    this.showDeleteModal.set(true);
  }
 
  closeDeleteModal() {
    if (this.isDeleting()) return;
    this.showDeleteModal.set(false);
    this.deletePassword = '';
    this.deleteError.set('');
  }
 
  async onConfirmDelete() {
    this.deleteError.set('');

    if (!this.deletePassword) {
      this.deleteError.set('Παρακαλώ εισάγετε τον κωδικό σας για επιβεβαίωση της διαγραφής.');
      return;
    }

    this.isDeleting.set(true);

    try {
      await this.profileService.deleteAccount(this.deletePassword);
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      this.isDeleting.set(false);
      this.showDeleteModal.set(false);

      this.router.navigate(['/']).then(() => {
        window.location.reload();
      });
    } catch (err: any) {
      this.isDeleting.set(false);
      const message = err.error?.message || 'Υπήρξε πρόβλημα κατά τη διαγραφή. Ελέγξτε τον κωδικό σας.';
      this.deleteError.set(message);
      this.deletePassword = '';
    }
  }
}