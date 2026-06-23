import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { forkJoin, Observable } from 'rxjs';
import { toLocalYMD } from '../date-utils';
import { isValidEmail, isValidPassword } from '../validators';
import { CustomDateAdapter, MY_DATE_FORMATS } from '../date-adapter';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, MatDatepickerModule, MatNativeDateModule, MatInputModule],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'el-GR' },
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
  ],
  templateUrl: './users.html',
  styleUrl: './users.css'
})

export class UsersComponent implements OnInit {
  users = signal<any[]>([]);
  errorMessage = signal('');

  // Inline μήνυμα λάθους ΜΕΣΑ στη φόρμα προσθήκης/επεξεργασίας (όπως στο προφίλ)
  formError = signal('');

  isModalOpen = false;
  editingUserId: number | null = null;

  isInfoModalOpen = false;
  infoMessage = '';

  isDeleteConfirmOpen = false;
  userToDeleteId: number | null = null;

  // -- ΜΕΤΑΒΛΗΤΗ ΓΙΑ ΤΟ WARNING ΟΤΑΝ ΑΛΛΑΖΩ ΤΟΝ ΔΙΚΟ ΜΟΥ ΡΟΛΟ --
  isRoleWarningOpen = false;

  // -- CUSTOM DROPDOWN ΓΙΑ ΤΟΝ ΡΟΛΟ --
  isRoleDropdownOpen = false;
  roleOptions = [
    { value: 'user', label: 'User', icon: 'person' },
    { value: 'admin', label: 'Admin', icon: 'admin_panel_settings' }
  ];

  get selectedRole() {
    return this.roleOptions.find(o => o.value === this.formData.role_name) || this.roleOptions[0];
  }

  toggleRoleDropdown() {
    this.isRoleDropdownOpen = !this.isRoleDropdownOpen;
  }

  selectRole(value: string) {
    this.formData.role_name = value;
    this.isRoleDropdownOpen = false;
  }

  // Κλείνει το dropdown όταν κάνεις κλικ οπουδήποτε αλλού
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.isRoleDropdownOpen && !target.closest('.custom-dropdown')) {
      this.isRoleDropdownOpen = false;
    }

    // Κλείνει το παραθυράκι των φίλτρων όταν πατάς εκτός του.
    // Εξαιρούμε τα clicks στο ημερολόγιο (mat-datepicker), που ανοίγει σε overlay έξω από το .filter-wrapper.
    if (
      this.isFilterOpen &&
      !target.closest('.filter-wrapper') &&
      !target.closest('.mat-datepicker-popup') &&
      !target.closest('.cdk-overlay-container')
    ) {
      this.isFilterOpen = false;
    }
  }

  // -- ΜΕΤΑΒΛΗΤΕΣ ΓΙΑ ΑΝΑΖΗΤΗΣΗ ΚΑΙ ΦΙΛΤΡΑ --
  searchQuery: string = '';
  isFilterOpen = false;
  filterError = '';
  filterStartDate: Date | null = null;
  filterEndDate: Date | null = null;

  // -- ΦΙΛΤΡΟ ΡΟΛΟΥ (Όλοι / Διαχειριστές / Απλοί χρήστες) --
  activeRoleFilter: 'all' | 'admin' | 'user' = 'all';

  // Εμφάνιση/απόκρυψη κωδικού στη φόρμα (το "ματάκι")
  isPasswordVisible = false;

  // Το αντικείμενο που δένει με τη φόρμα
  formData = {
    first_name: '',
    last_name: '',
    email: '',
    birth_date: '',
    password: '',
    role_name: 'user'
  };

  // Αν ήρθαμε εδώ μέσω click σε ειδοποίηση, κρατάμε το userId ώστε να
  // ανοίξουμε αυτόματα τα tasks του χρήστη μόλις φορτωθεί η λίστα.
  private pendingOpenUserId: number | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const userString = localStorage.getItem('user');
    if (userString) {
      const user = JSON.parse(userString);
      if (user.role_name !== 'admin') {
        this.router.navigate(['/home']);
        return;
      }
    } else {
      this.router.navigate(['/login']);
      return;
    }

    // queryParam από την ειδοποίηση: ?openUser=<id>
    const openUser = this.route.snapshot.queryParamMap.get('openUser');
    this.pendingOpenUserId = openUser ? Number(openUser) : null;

    this.loadUsers();
  }

  loadUsers() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get('http://localhost:5000/api/users', { headers }).subscribe({
      next: (data: any) => {
        this.users.set(data);
        this.maybeOpenPendingUserTasks();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Δεν έχετε δικαίωμα πρόσβασης σε αυτή τη σελίδα.');
      }
    });
  }

  // Ανοίγει το modal με τα tasks του χρήστη της ειδοποίησης (μία φορά).
  private maybeOpenPendingUserTasks() {
    if (this.pendingOpenUserId == null) {
      return;
    }
    const user = this.users().find(u => String(u.id) === String(this.pendingOpenUserId));
    this.pendingOpenUserId = null;
    if (user) {
      this.openTasksModal(user);
    }
    // Καθαρίζουμε το queryParam ώστε ένα refresh να μην ξανανοίγει το modal.
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  // --- ΛΟΓΙΚΗ ΓΙΑ ΤΟ MODAL (ΠΡΟΣΘΗΚΗ / ΕΠΕΞΕΡΓΑΣΙΑ) ---

  openModal(user?: any) {
    this.isModalOpen = true;
    this.isPasswordVisible = false; // ξεκινά πάντα κρυφός ο κωδικός
    this.formError.set(''); // καθαρό μήνυμα λάθους σε κάθε άνοιγμα
    if (user) {
      this.editingUserId = user.id;
      this.formData = { ...user, password: '' };
    } else {
      this.editingUserId = null;
      this.formData = { first_name: '', last_name: '', email: '', password: '', role_name: 'user', birth_date: '' };
    }
  }

  closeModal() {
    this.isModalOpen = false;
    this.isRoleDropdownOpen = false;
    this.formError.set('');
  }

  // Βοηθητική: επιστρέφει τον συνδεδεμένο χρήστη από το localStorage
  private getCurrentUser(): any {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }

  saveUser() {
    this.formError.set('');

    // --- Έλεγχοι εγκυρότητας (ίδιοι με τη φόρμα εγγραφής) ---
    if (!isValidEmail(this.formData.email)) {
      this.formError.set('Παρακαλώ εισάγετε ένα έγκυρο email (π.χ. name@example.com).');
      return;
    }
    const pw = this.formData.password;
    // Στην ΠΡΟΣΘΗΚΗ ο κωδικός είναι υποχρεωτικός
    if (!this.editingUserId && (!pw || pw.trim() === '')) {
      this.formError.set('Παρακαλώ εισάγετε κωδικό πρόσβασης.');
      return;
    }
    // Αν δόθηκε κωδικός (προσθήκη ή αλλαγή στην επεξεργασία), πρέπει να είναι >= 4 χαρακτήρες
    if (pw && !isValidPassword(pw)) {
      this.formError.set('Ο κωδικός πρόσβασης πρέπει να είναι τουλάχιστον 4 χαρακτήρες.');
      return;
    }

    // ΕΛΕΓΧΟΣ: Αλλάζω τον ΔΙΚΟ ΜΟΥ ρόλο από admin -> user;
    const me = this.getCurrentUser();
    const isSelf = this.editingUserId != null && String(me.id) === String(this.editingUserId);
    const losingAdmin = isSelf && me.role_name === 'admin' && this.formData.role_name === 'user';

    if (losingAdmin) {
      // Δείξε πρώτα την προειδοποίηση. Η αποθήκευση γίνεται μόνο μετά την επιβεβαίωση.
      this.isRoleWarningOpen = true;
      return;
    }

    this.performSave();
  }

  // Καλείται από το κουμπί "Ναι, συνέχεια" του warning modal
  confirmRoleChange() {
    this.isRoleWarningOpen = false;
    this.performSave();
  }

  // Καλείται από το "Ακύρωση" του warning modal (μένει ανοιχτή η φόρμα για να ξαναδιαλέξει ρόλο)
  cancelRoleChange() {
    this.isRoleWarningOpen = false;
  }

  // Η πραγματική αποθήκευση (POST/PUT)
  private performSave() {
    // Κανονικοποίηση ημερομηνίας σε τοπικό 'YYYY-MM-DD' (αποφυγή timezone -1 μέρα)
    this.formData.birth_date = toLocalYMD(this.formData.birth_date);

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    if (this.editingUserId) {
      this.http.put(`http://localhost:5000/api/admin/users/${this.editingUserId}`, this.formData, { headers }).subscribe({
        next: (res: any) => {
          // Αν το backend μας επέστρεψε νέο token, σημαίνει ότι επεξεργάστηκα τον εαυτό μου.
          // Αν επιπλέον ο νέος ρόλος είναι 'user', πρέπει να ανανεώσουμε το session και να φύγουμε από το admin panel.
          if (res?.token) {
            this.applySelfUpdate(res);
            return;
          }
          this.refreshUsers();
          this.closeModal();
        },
        error: (err) => this.formError.set(err.error?.message || 'Σφάλμα επεξεργασίας')
      });
    } else {
      this.http.post('http://localhost:5000/api/admin/users', this.formData, { headers }).subscribe({
        next: () => {
          this.loadUsers();
          this.closeModal();
        },
        error: (err) => this.formError.set(err.error?.message || 'Σφάλμα προσθήκης')
      });
    }
  }

  // Εφαρμόζει το νέο token & τα νέα στοιχεία του ΙΔΙΟΥ του χρήστη και ανακατευθύνει
  private applySelfUpdate(res: any) {
    // 1) Αποθηκεύουμε το ΝΕΟ token (με τον νέο ρόλο). Πλέον το παλιό admin token δεν ισχύει.
    localStorage.setItem('token', res.token);

    // 2) Ενημερώνουμε τα στοιχεία του χρήστη στο localStorage
    const updatedUser = {
      id: this.editingUserId,
      email: this.formData.email,
      first_name: this.formData.first_name,
      last_name: this.formData.last_name,
      birth_date: this.formData.birth_date,
      role_name: res.role_name || 'user',
      role_id: res.role_id || 2
    };
    localStorage.setItem('user', JSON.stringify(updatedUser));

    this.isModalOpen = false;

    // 3) Αν έγινα πλέον απλός user -> φεύγω από το admin panel και πάω στην προβολή χρήστη.
    //    Κάνουμε full reload ώστε να ξαναδιαβαστεί ο ρόλος παντού (navbar, guards κ.λπ.).
    if (updatedUser.role_name !== 'admin') {
      this.router.navigate(['/home']).then(() => window.location.reload());
    } else {
      // (Σπάνια περίπτωση: παρέμεινε admin) απλώς ανανεώνουμε τη λίστα.
      this.loadUsers();
    }
  }

  openDeleteConfirm(id: number) {
    this.userToDeleteId = id;
    this.isDeleteConfirmOpen = true;
  }

  // True αν ο χρήστης που πάω να διαγράψω είμαι ΕΓΩ ο ίδιος
  get isDeletingSelf(): boolean {
    const me = this.getCurrentUser();
    return this.userToDeleteId != null && String(me.id) === String(this.userToDeleteId);
  }

  closeDeleteConfirm() {
    this.isDeleteConfirmOpen = false;
    this.userToDeleteId = null;
  }

  confirmDeleteUser() {
    if (!this.userToDeleteId) return;

    const deletingSelf = this.isDeletingSelf; // το κρατάμε πριν καθαριστεί το id
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.delete(`http://localhost:5000/api/users/${this.userToDeleteId}`, { headers }).subscribe({
      next: () => {
        if (deletingSelf) {
          // Διέγραψα τον ΕΑΥΤΟ μου -> αποσύνδεση (το token δεν ισχύει πλέον τοπικά) + landing page
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          this.isDeleteConfirmOpen = false;
          this.userToDeleteId = null;
          this.router.navigate(['/']).then(() => window.location.reload());
          return;
        }
        this.loadUsers();
        this.closeDeleteConfirm();
      },
      error: (err) => {
        this.closeDeleteConfirm();
        this.showInfo(err.error?.message || 'Σφάλμα διαγραφής');
      }
    });
  }

  showInfo(msg: string) {
    this.infoMessage = msg;
    this.isInfoModalOpen = true;
  }

  closeInfo() {
    this.isInfoModalOpen = false;
    this.infoMessage = '';
  }

  // --- ΛΟΓΙΚΗ ΓΙΑ ΤΑ ΦΙΛΤΡΑ ΗΜΕΡΟΜΗΝΙΑΣ ---

  // Ανοιγοκλείνει το μενού των φίλτρων
  toggleFilters() {
    this.isFilterOpen = !this.isFilterOpen;
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${d.getFullYear()}-${month}-${day}`;
  }

  filterUsers() {
    if (!this.filterStartDate || !this.filterEndDate) {
      this.filterError = 'Παρακαλώ επιλέξτε και τις δύο ημερομηνίες.';
      return;
    }
    this.filterError = '';
    this.applyFilters();
    this.isFilterOpen = false; // Κλείνει το παραθυράκι
  }

  // --- ΕΝΟΠΟΙΗΜΕΝΗ ΛΟΓΙΚΗ ΦΙΛΤΡΩΝ ---
  // Εφαρμόζει ΟΛΑ τα ενεργά φίλτρα ΜΑΖΙ (αναζήτηση + ημερομηνία + ρόλος):
  // καλεί το αντίστοιχο endpoint του καθενός και κρατάει την ΤΟΜΗ (κοινά id).
  private applyFilters() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const requests: Observable<any>[] = [];

    // 1) Αναζήτηση ονόματος
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      requests.push(this.http.get(`http://localhost:5000/api/users/search?query=${this.searchQuery}`, { headers }));
    }
    // 2) Φίλτρο ημερομηνίας γέννησης
    if (this.filterStartDate && this.filterEndDate) {
      const start = this.formatDate(this.filterStartDate);
      const end = this.formatDate(this.filterEndDate);
      requests.push(this.http.get(`http://localhost:5000/api/users/filter/by-date?startDate=${start}&endDate=${end}`, { headers }));
    }
    // 3) Φίλτρο ρόλου
    if (this.activeRoleFilter === 'admin') {
      requests.push(this.http.get('http://localhost:5000/api/users/roles/admins', { headers }));
    } else if (this.activeRoleFilter === 'user') {
      requests.push(this.http.get('http://localhost:5000/api/users/roles/users', { headers }));
    }

    // Κανένα ενεργό φίλτρο -> όλοι οι χρήστες
    if (requests.length === 0) {
      this.loadUsers();
      return;
    }

    // Ένα φίλτρο -> το ίδιο το αποτέλεσμα. Πολλά -> τομή με βάση το id.
    forkJoin(requests).subscribe({
      next: (results: any[]) => {
        const [first, ...rest] = results;
        const intersected = first.filter((u: any) =>
          rest.every(list => list.some((x: any) => x.id === u.id))
        );
        this.users.set(intersected);
      },
      error: (err) => this.showInfo(err.error?.message || 'Σφάλμα κατά το φιλτράρισμα')
    });
  }

  // Καλείται μετά από αλλαγή ρόλου / επεξεργασία -> διατηρεί τα ενεργά φίλτρα
  private refreshUsers() {
    this.applyFilters();
  }

  // Καλείται από τα κουμπιά: Όλοι / Διαχειριστές / Απλοί χρήστες
  setRoleFilter(role: 'all' | 'admin' | 'user') {
    this.activeRoleFilter = role;
    this.applyFilters();
  }

  clearFilters() {
    this.filterStartDate = null;
    this.filterEndDate = null;
    this.filterError = '';
    this.isFilterOpen = false; // Κλείνει το παραθυράκι
    this.applyFilters(); // κρατάει αναζήτηση & ρόλο αν είναι ενεργά
  }

  // --- ΛΟΓΙΚΗ ΓΙΑ ΤΗΝ ΑΝΑΖΗΤΗΣΗ ΟΝΟΜΑΤΟΣ ---

  searchUsers() {
    this.applyFilters(); // συνδυάζεται με ημερομηνία & ρόλο
  }

  clearSearch() {
    this.searchQuery = '';
    this.applyFilters(); // κρατάει ημερομηνία & ρόλο αν είναι ενεργά
  }

  // --- ΜΕΤΑΒΛΗΤΕΣ ΓΙΑ ΤΟ MODAL ΤΩΝ TASKS ---
  isTasksModalOpen = false;
  selectedUserForTasks: any = null;
  userTasks = signal<any[]>([]);

  // --- ΜΕΘΟΔΟΙ ΓΙΑ ΤΟ MODAL ΤΩΝ TASKS ---
  openTasksModal(user: any) {
    this.selectedUserForTasks = user;
    this.isTasksModalOpen = true;
    this.userTasks.set([]); // Καθαρίζουμε τα προηγούμενα δεδομένα

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    // Καλούμε το endpoint που φτιάξαμε στο backend για τα tasks του χρήστη
    this.http.get(`http://localhost:5000/api/admin/users/${user.id}/tasks`, { headers }).subscribe({
      next: (data: any) => this.userTasks.set(data),
      error: () => this.showInfo('Σφάλμα κατά τη φόρτωση των tasks του χρήστη.')
    });
  }

  closeTasksModal() {
    this.isTasksModalOpen = false;
    this.selectedUserForTasks = null;
  }

  // Κατέβασμα αρχείου ενός task του χρήστη (binary -> blob -> τοπική λήψη).
  // Ο admin έχει δικαίωμα λήψης μέσω του ίδιου endpoint (το backend ελέγχει τον ρόλο).
  downloadFile(file: any, event: Event) {
    event.stopPropagation(); // να μην κλείσει/αλλάξει κάτι στην κάρτα

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get(`http://localhost:5000/api/files/${file.id}/download`, {
      headers,
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.original_name;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.showInfo('Σφάλμα κατά τη λήψη του αρχείου.')
    });
  }

  // Μετατροπή bytes σε αναγνώσιμο μέγεθος
  formatFileSize(bytes: number): string {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Επιλογή εικονιδίου ανάλογα με τον τύπο αρχείου
  getFileIcon(mimeType: string): string {
    if (!mimeType) return 'insert_drive_file';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'movie';
    if (mimeType.startsWith('audio/')) return 'audiotrack';
    if (mimeType === 'application/pdf') return 'picture_as_pdf';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'folder_zip';
    if (mimeType.includes('word')) return 'description';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'table_chart';
    return 'insert_drive_file';
  }

  // --- ΓΡΗΓΟΡΗ ΑΛΛΑΓΗ ΡΟΛΟΥ (toggle admin <-> user) ---
  isSelfDemoteOpen = false;
  selfDemoteUser: any = null;

  // admin = 1, user = 2 (όπως ορίζονται στον πίνακα roles)
  private roleIdFor(roleName: string): number {
    return roleName === 'admin' ? 1 : 2;
  }

  toggleUserRole(user: any, event: Event) {
    event.stopPropagation(); // να μην ανοίξει το modal με τα tasks της κάρτας

    const me = this.getCurrentUser();
    const isSelf = String(me.id) === String(user.id);

    // Αν αλλάζω τον ΔΙΚΟ μου ρόλο από admin -> user, χάνω τα δικαιώματα: ζήτα επιβεβαίωση.
    if (isSelf && user.role_name === 'admin') {
      this.selfDemoteUser = user;
      this.isSelfDemoteOpen = true;
      return;
    }

    this.performRoleToggle(user);
  }

  private performRoleToggle(user: any) {
    const newRoleId = this.roleIdFor(user.role_name === 'admin' ? 'user' : 'admin');

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.put(`http://localhost:5000/api/users/${user.id}/role`, { role_id: newRoleId }, { headers }).subscribe({
      next: () => {
        // Ξαναφορτώνουμε τη λίστα ώστε ο χρήστης να αναδιαταχθεί στη σωστή ομάδα
        // (admins πρώτα), διατηρώντας όμως το ενεργό φίλτρο/αναζήτηση.
        this.refreshUsers();
      },
      error: (err) => this.showInfo(err.error?.message || 'Σφάλμα κατά την αλλαγή ρόλου')
    });
  }

  cancelSelfDemote() {
    this.isSelfDemoteOpen = false;
    this.selfDemoteUser = null;
  }

  confirmSelfDemote() {
    const user = this.selfDemoteUser;
    this.isSelfDemoteOpen = false;
    this.selfDemoteUser = null;
    if (!user) return;

    const newRoleId = this.roleIdFor('user');
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.put(`http://localhost:5000/api/users/${user.id}/role`, { role_id: newRoleId }, { headers }).subscribe({
      next: (res: any) => {
        // Το backend επιστρέφει νέο token (με ρόλο "user") επειδή άλλαξα τον δικό μου ρόλο.
        // Ανανεώνουμε το session και πάμε ομαλά στη σελίδα του απλού χρήστη -- χωρίς logout.
        if (res?.token) {
          localStorage.setItem('token', res.token);
          const me = this.getCurrentUser();
          const updatedUser = { ...me, role_name: res.role_name || 'user', role_id: res.role_id || newRoleId };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          // Full reload ώστε να ξαναδιαβαστεί ο ρόλος παντού (navbar, guards, routes)
          this.router.navigate(['/home']).then(() => window.location.reload());
        } else {
          // Fallback (δεν αναμένεται): απλώς ανανεώνουμε τη λίστα
          this.refreshUsers();
        }
      },
      error: (err) => this.showInfo(err.error?.message || 'Σφάλμα κατά την αλλαγή ρόλου')
    });
  }
}