import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { toLocalYMD } from '../date-utils';
import { isValidEmail, isValidPassword } from '../validators';
import { CustomDateAdapter, MY_DATE_FORMATS } from '../date-adapter';


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
    { provide: MAT_DATE_LOCALE, useValue: 'el-GR' }, // Επιβολή ελληνικού format και στο προφίλ
    { provide: DateAdapter, useClass: CustomDateAdapter }, // Φορτώνει τον δικό μας adapter
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS } // Εφαρμόζει το format
  ]
})
export class ProfileComponent implements OnInit {
  
  user: any = {
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

  // --- Κατάσταση για τη διαγραφή λογαριασμού ---
  showDeleteModal = false;
  deletePassword = '';
  isDeletePasswordVisible = false;
  isDeleting = false;
  deleteError = signal('');

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      this.user = JSON.parse(savedUser);
    }
  }

  onUpdateProfile() {
    (document.activeElement as HTMLElement)?.blur();

    this.errorMessage.set('');
    this.successMessage.set('');
    
    const token = localStorage.getItem('token');
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

    // ΕΛΕΓΧΟΣ: Αν γράφτηκε κάτι στον νέο κωδικό, πρέπει να ταιριάζει με την επιβεβαίωση
    if (this.newPassword || this.confirmNewPassword) {
      if (this.newPassword !== this.confirmNewPassword) {
        this.errorMessage.set('Σφάλμα: Ο νέος κωδικός και η επιβεβαίωση νέου κωδικού δεν ταιριάζουν.');
        this.confirmPassword = '';
        this.newPassword = '';
        this.confirmNewPassword = '';
        return;
      }
      if (!isValidPassword(this.newPassword)) { // Έλεγχος μήκους (κοινό helper)
        this.errorMessage.set('Σφάλμα: Ο νέος κωδικός πρέπει να είναι τουλάχιστον 4 χαρακτήρες.');
        this.confirmPassword = '';
        this.newPassword = '';
        this.confirmNewPassword = '';
        return;
      }
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    // Κανονικοποίηση ημερομηνίας σε τοπικό 'YYYY-MM-DD' (αποφυγή timezone -1 μέρα)
    // Ενημερώνει και το this.user ώστε να αποθηκευτεί σωστά και στο localStorage.
    this.user.birth_date = toLocalYMD(this.user.birth_date);

    const body = {
      email: this.user.email,
      password: this.confirmPassword,
      first_name: this.user.first_name,
      last_name: this.user.last_name,
      birth_date: this.user.birth_date,
      role_id: this.user.role_id,
      newPassword: this.newPassword
    };

    this.http.put(`http://localhost:5000/api/users/${userId}`, body, { headers }).subscribe({
      next: (response: any) => {
        this.successMessage.set('Οι αλλαγές αποθηκεύτηκαν επιτυχώς.');
        localStorage.setItem('user', JSON.stringify(this.user));
        
        // Καθαρισμός σε περίπτωση επιτυχίας
        this.confirmPassword = ''; 
        this.newPassword = '';
        this.confirmNewPassword = '';
      },
      error: (err: any) => {
        const message = err.error?.message || 'Υπήρξε ένα πρόβλημα κατά την αποθήκευση. Βεβαιωθείτε ότι ο κωδικός πρόσβασης είναι σωστός.';
        this.errorMessage.set(message);
        
        // ΕΠΙΒΟΛΗ ΚΑΘΑΡΙΣΜΟΥ ΕΔΩ: Αδειάζουμε τις μεταβλητές ρητά μέσα στο σφάλμα του backend
        this.confirmPassword = ''; 
        this.newPassword = '';
        this.confirmNewPassword = '';
      }
    });
  }

  // ---------------------------------------------------------
  // ΔΙΑΓΡΑΦΗ ΛΟΓΑΡΙΑΣΜΟΥ
  // ---------------------------------------------------------
 
  // Άνοιγμα του παραθύρου επιβεβαίωσης
  openDeleteModal() {
    this.deleteError.set('');
    this.deletePassword = '';
    this.isDeletePasswordVisible = false;
    this.showDeleteModal = true;
  }
 
  // Κλείσιμο / Ακύρωση
  closeDeleteModal() {
    if (this.isDeleting) return; 
    this.showDeleteModal = false;
    this.deletePassword = '';
    this.deleteError.set('');
  }
 
  onConfirmDelete() {
    this.deleteError.set('');
 
    if (!this.deletePassword) {
      this.deleteError.set('Παρακαλώ εισάγετε τον κωδικό σας για επιβεβαίωση της διαγραφής.');
      return;
    }
 
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
 
    const options = {
      headers,
      body: { password: this.deletePassword }
    };
 
    this.isDeleting = true;
 
    this.http.delete('http://localhost:5000/api/account', options).subscribe({
      next: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
 
        this.isDeleting = false;
        this.showDeleteModal = false;
 
        this.router.navigate(['/']).then(() => {
          window.location.reload();
        });
      },
      error: (err: any) => {
        this.isDeleting = false;
        const message = err.error?.message || 'Υπήρξε πρόβλημα κατά τη διαγραφή. Ελέγξτε τον κωδικό σας.';
        this.deleteError.set(message);
        this.deletePassword = '';
      }
    });
  }
}