import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { toLocalYMD } from '../shared/date-utils';
import { isValidEmail, isValidPassword } from '../shared/validators';
import { CustomDateAdapter, MY_DATE_FORMATS } from '../shared/date-adapter';
import { UserService } from './user.service';
import { User, UserFormData, UserUpdateResponse } from './user.model';
import { Task, TaskFile } from '../tasks/task.model';

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
  users = signal<User[]>([]);
  errorMessage = signal('');

  // Inline μήνυμα λάθους μέσα στη φόρμα προσθήκης/επεξεργασίας 
  formError = signal('');

  isModalOpen = signal(false);
  editingUserId: number | null = null;

  isInfoModalOpen = false;
  infoMessage = '';

  isDeleteConfirmOpen = signal(false);
  userToDeleteId: number | null = null;

  // για το warning όταν αλλάζω τον ρόλο μου 
  isRoleWarningOpen = false;

  // drop down για τον ρόλο
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

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.isRoleDropdownOpen && !target.closest('.custom-dropdown')) {
      this.isRoleDropdownOpen = false;
    }

    if (
      this.isFilterOpen &&
      !target.closest('.filter-wrapper') &&
      !target.closest('.cdk-overlay-container')
    ) {
      this.isFilterOpen = false;
    }
  }

  searchQuery: string = '';
  isFilterOpen = false;
  filterError = '';
  filterStartDate: Date | null = null;
  filterEndDate: Date | null = null;

  // φίλτρα ρόλου (Όλοι / Διαχειριστές / Απλοί χρήστες) 
  activeRoleFilter: 'all' | 'admin' | 'user' = 'all';

  isPasswordVisible = false;

  // Το αντικείμενο που δένει με τη φόρμα
  formData: UserFormData = {
    first_name: '',
    last_name: '',
    email: '',
    birth_date: '',
    password: '',
    role_name: 'user'
  };

  // Αν ήρθαμε εδώ μέσω click σε ειδοποίηση, κρατάμε το userId ώστε να ανοίξουμε αυτόματα τα tasks του χρήστη μόλις φορτωθεί η λίστα.
  private pendingOpenUserId: number | null = null;

  constructor(
    private userService: UserService,
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

    this.loadUsers();

    this.route.queryParamMap.subscribe(params => {
      const openUser = params.get('openUser');
      if (!openUser) {
        return;
      }
      this.pendingOpenUserId = Number(openUser);
      if (this.users().length > 0) {
        this.maybeOpenPendingUserTasks();
      }
    });
  }

  async loadUsers() {
    try {
      const data = await this.userService.getUsers();
      this.users.set(data);
      this.maybeOpenPendingUserTasks();
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Δεν έχετε δικαίωμα πρόσβασης σε αυτή τη σελίδα.');
    }
  }

  // Ανοίγει το modal με τα tasks του χρήστη της ειδοποίησης
  private maybeOpenPendingUserTasks() {
    if (this.pendingOpenUserId == null) {
      return;
    }
    const user = this.users().find((u: User) => String(u.id) === String(this.pendingOpenUserId));
    this.pendingOpenUserId = null;
    if (user) {
      this.openTasksModal(user);
    }
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  // ΛΟΓΙΚΗ ΓΙΑ ΤΟ MODAL (ΠΡΟΣΘΗΚΗ / ΕΠΕΞΕΡΓΑΣΙΑ) 

  openModal(user?: User) {
    this.isModalOpen.set(true);
    this.isPasswordVisible = false; 
    this.formError.set(''); 
    if (user) {
      this.editingUserId = user.id;
      this.formData = {
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        birth_date: user.birth_date,
        password: '',
        role_name: user.role_name
      };
    } else {
      this.editingUserId = null;
      this.formData = { first_name: '', last_name: '', email: '', password: '', role_name: 'user', birth_date: '' };
    }
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.isRoleDropdownOpen = false;
    this.formError.set('');
  }

  // επιστρέφει τον συνδεδεμένο χρήστη από το localStorage
  private getCurrentUser(): Partial<User> {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }

  saveUser() {
    this.formError.set('');

    // Έλεγχοι εγκυρότητας 
    if (!isValidEmail(this.formData.email)) {
      this.formError.set('Παρακαλώ εισάγετε ένα έγκυρο email (π.χ. name@example.com).');
      return;
    }
    const pw = this.formData.password;

    // Ο κωδικός είναι υποχρεωτικός
    if (!this.editingUserId && (!pw || pw.trim() === '')) {
      this.formError.set('Παρακαλώ εισάγετε κωδικό πρόσβασης.');
      return;
    }
    // Ο κωδικός πρέπει να είναι >= 4 χαρακτήρες
    if (pw && !isValidPassword(pw)) {
      this.formError.set('Ο κωδικός πρόσβασης πρέπει να είναι τουλάχιστον 4 χαρακτήρες.');
      return;
    }

    // έλεγχος αλλαγής δικού μου ρόλου
    const me = this.getCurrentUser();
    const isSelf = this.editingUserId != null && String(me.id) === String(this.editingUserId);
    const losingAdmin = isSelf && me.role_name === 'admin' && this.formData.role_name === 'user';

    if (losingAdmin) {
      this.isRoleWarningOpen = true;
      return;
    }

    this.performSave();
  }

  confirmRoleChange() {
    this.isRoleWarningOpen = false;
    this.performSave();
  }

  cancelRoleChange() {
    this.isRoleWarningOpen = false;
  }

  private async performSave() {
    this.formData.birth_date = toLocalYMD(this.formData.birth_date);

    if (this.editingUserId) {
      try {
        const res = await this.userService.updateUser(this.editingUserId, this.formData);
        // Αν το backend επέστρεψε νέο token, σημαίνει ότι επεξεργάστηκα τον εαυτό μου.
        // Αν επιπλέον ο νέος ρόλος είναι 'user', πρέπει να ανανεώσουμε το session και να φύγουμε από το admin panel.
        if (res?.token) {
          this.applySelfUpdate(res);
          return;
        }
        this.refreshUsers();
        this.closeModal();
      } catch (err: any) {
        this.formError.set(err.error?.message || 'Σφάλμα επεξεργασίας');
      }
    } else {
      try {
        await this.userService.createUser(this.formData);
        this.loadUsers();
        this.closeModal();
      } catch (err: any) {
        this.formError.set(err.error?.message || 'Σφάλμα προσθήκης');
      }
    }
  }

  // Εφαρμόζει το νέο token & τα νέα στοιχεία του ίδιου του χρήστη και ανακατευθύνει
  private applySelfUpdate(res: UserUpdateResponse) {
    if (!res.token) return; 

    // Αποθηκεύουμε το νέο token (με τον νέο ρόλο). Πλέον το παλιό admin token δεν ισχύει.
    localStorage.setItem('token', res.token);

    // Ενημερώνουμε τα στοιχεία του χρήστη στο localStorage
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

    this.isModalOpen.set(false);

    // Αν έγινα πλέον απλός user, φεύγω από το admin panel και πάω στην προβολή χρήστη. Κάνουμε full reload ώστε να ξαναδιαβαστεί ο ρόλος παντού 
    if (updatedUser.role_name !== 'admin') {
      this.router.navigate(['/home']).then(() => window.location.reload());
    } else {
      this.loadUsers();
    }
  }

  openDeleteConfirm(id: number) {
    this.userToDeleteId = id;
    this.isDeleteConfirmOpen.set(true);
  }

  // True αν ο χρήστης που πάω να διαγράψω είμαι εγώ
  get isDeletingSelf(): boolean {
    const me = this.getCurrentUser();
    return this.userToDeleteId != null && String(me.id) === String(this.userToDeleteId);
  }

  closeDeleteConfirm() {
    this.isDeleteConfirmOpen.set(false);
    this.userToDeleteId = null;
  }

  async confirmDeleteUser() {
    if (!this.userToDeleteId) return;

    const deletingSelf = this.isDeletingSelf;

    try {
      await this.userService.deleteUser(this.userToDeleteId);
      if (deletingSelf) {
        // Διέγραψα τον εαυτό μου άρα αποσύνδεση (το token δεν ισχύει πλέον τοπικά) + landing page
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.isDeleteConfirmOpen.set(false);
        this.userToDeleteId = null;
        this.router.navigate(['/']).then(() => window.location.reload());
        return;
      }
      this.loadUsers();
      this.closeDeleteConfirm();
    } catch (err: any) {
      this.closeDeleteConfirm();
      this.showInfo(err.error?.message || 'Σφάλμα διαγραφής');
    }
  }

  showInfo(msg: string) {
    this.infoMessage = msg;
    this.isInfoModalOpen = true;
  }

  closeInfo() {
    this.isInfoModalOpen = false;
    this.infoMessage = '';
  }

  // ΛΟΓΙΚΗ ΓΙΑ ΤΑ ΦΙΛΤΡΑ ΗΜΕΡΟΜΗΝΙΑΣ

  toggleFilters() {
    this.isFilterOpen = !this.isFilterOpen;
  }

  filterUsers() {
    if (!this.filterStartDate || !this.filterEndDate) {
      this.filterError = 'Παρακαλώ επιλέξτε και τις δύο ημερομηνίες.';
      return;
    }
    this.filterError = '';
    this.applyFilters();
    this.isFilterOpen = false; 
  }

  // ΕΝΟΠΟΙΗΜΕΝΗ ΛΟΓΙΚΗ ΦΙΛΤΡΩΝ 

  // Εφαρμόζει όλα τα ενεργά φίλτρα μαζί και κρατάει την τομή (κοινά id).
  private async applyFilters() {
    const requests: Promise<User[]>[] = [];

    if (this.searchQuery && this.searchQuery.trim() !== '') {
      requests.push(this.userService.searchUsers(this.searchQuery));
    }

    if (this.filterStartDate && this.filterEndDate) {
      const start = toLocalYMD(this.filterStartDate);
      const end = toLocalYMD(this.filterEndDate);
      requests.push(this.userService.filterByDate(start, end));
    }

    if (this.activeRoleFilter === 'admin') {
      requests.push(this.userService.getAdmins());
    } else if (this.activeRoleFilter === 'user') {
      requests.push(this.userService.getStandardUsers());
    }

    if (requests.length === 0) {
      this.loadUsers();
      return;
    }

    try {
      const results = await Promise.all(requests);
      const [first, ...rest] = results;
      const intersected = first.filter((u: User) =>
        rest.every(list => list.some((x: User) => x.id === u.id))
      );
      this.users.set(intersected);
    } catch (err: any) {
      this.showInfo(err.error?.message || 'Σφάλμα κατά το φιλτράρισμα');
    }
  }

  private refreshUsers() {
    this.applyFilters();
  }

  setRoleFilter(role: 'all' | 'admin' | 'user') {
    this.activeRoleFilter = role;
    this.applyFilters();
  }

  clearFilters() {
    this.filterStartDate = null;
    this.filterEndDate = null;
    this.filterError = '';
    this.isFilterOpen = false; 
    this.applyFilters(); 
  }

  searchUsers() {
    this.applyFilters(); // συνδυάζεται με ημερομηνία & ρόλο
  }

  clearSearch() {
    this.searchQuery = '';
    this.applyFilters(); // κρατάει ημερομηνία & ρόλο αν είναι ενεργά
  }

  isTasksModalOpen = false;
  selectedUserForTasks: User | null = null;
  userTasks = signal<Task[]>([]);

  async openTasksModal(user: User) {
    this.selectedUserForTasks = user;
    this.isTasksModalOpen = true;
    this.userTasks.set([]);

    try {
      const data = await this.userService.getUserTasks(user.id);
      this.userTasks.set(this.sortTasks(data));
    } catch {
      this.showInfo('Σφάλμα κατά τη φόρτωση των tasks του χρήστη.');
    }
  }

  // Ταξινόμηση: πρώτα οι εκκρεμείς και μετά οι ολοκληρωμένες (τέρμα κάτω),
  // και μέσα σε κάθε ομάδα τα πιο πρόσφατα (created_at) πάνω.
  private sortTasks(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
      const aCompleted = a.status === 'completed' ? 1 : 0;
      const bCompleted = b.status === 'completed' ? 1 : 0;
      if (aCompleted !== bCompleted) {
        return aCompleted - bCompleted; // εκκρεμείς (0) πριν τις ολοκληρωμένες (1)
      }
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime; // πιο πρόσφατα πάνω
    });
  }

  closeTasksModal() {
    this.isTasksModalOpen = false;
    this.selectedUserForTasks = null;
  }

  // Κατέβασμα αρχείου ενός task του χρήστη (binary -> blob -> τοπική λήψη).
  async downloadFile(file: TaskFile, event: Event) {
    event.stopPropagation();

    try {
      const blob = await this.userService.downloadFile(file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      this.showInfo('Σφάλμα κατά τη λήψη του αρχείου.');
    }
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

  // toggle admin - user
  isSelfDemoteOpen = false;
  selfDemoteUser: User | null = null;

  // Επιβεβαίωση αλλαγής ρόλου άλλου χρήστη
  isRoleToggleConfirmOpen = false;
  roleToggleUser: User | null = null;

  // Ο νέος ρόλος που θα αποκτήσει ο χρήστης που πρόκειται να αλλάξουμε ('admin' | 'user')
  get roleToggleTargetRole(): string {
    return this.roleToggleUser?.role_name === 'admin' ? 'user' : 'admin';
  }

  private roleIdFor(roleName: string): number {
    return roleName === 'admin' ? 1 : 2;
  }

  toggleUserRole(user: User, event: Event) {
    event.stopPropagation();

    const me = this.getCurrentUser();
    const isSelf = String(me.id) === String(user.id);

    // Αν αλλάζω τον δικό μου ρόλο από admin σε user, χάνω τα δικαιώματα και ζητα επιβεβαίωση.
    if (isSelf && user.role_name === 'admin') {
      this.selfDemoteUser = user;
      this.isSelfDemoteOpen = true;
      return;
    }

    // Για κάθε άλλη αλλαγή ρόλου (άλλος χρήστης) ζητάμε επιβεβαίωση.
    this.roleToggleUser = user;
    this.isRoleToggleConfirmOpen = true;
  }

  cancelRoleToggle() {
    this.isRoleToggleConfirmOpen = false;
    this.roleToggleUser = null;
  }

  confirmRoleToggle() {
    const user = this.roleToggleUser;
    this.isRoleToggleConfirmOpen = false;
    this.roleToggleUser = null;
    if (!user) return;
    this.performRoleToggle(user);
  }

  private async performRoleToggle(user: User) {
    const newRoleId = this.roleIdFor(user.role_name === 'admin' ? 'user' : 'admin');

    try {
      await this.userService.updateUserRole(user.id, newRoleId);
      // admins πρώτα
      this.refreshUsers();
    } catch (err: any) {
      this.showInfo(err.error?.message || 'Σφάλμα κατά την αλλαγή ρόλου');
    }
  }

  cancelSelfDemote() {
    this.isSelfDemoteOpen = false;
    this.selfDemoteUser = null;
  }

  async confirmSelfDemote() {
    const user = this.selfDemoteUser;
    this.isSelfDemoteOpen = false;
    this.selfDemoteUser = null;
    if (!user) return;

    const newRoleId = this.roleIdFor('user');

    try {
      const res = await this.userService.updateUserRole(user.id, newRoleId);
      // Το backend επιστρέφει νέο token (με ρόλο "user") επειδή άλλαξα τον δικό μου ρόλο. Ανανεώνουμε το session και πάμε στη σελίδα του απλού χρήστη.
      if (res?.token) {
        localStorage.setItem('token', res.token);
        const me = this.getCurrentUser();
        const updatedUser = { ...me, role_name: res.role_name || 'user', role_id: res.role_id || newRoleId };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        this.router.navigate(['/home']).then(() => window.location.reload());
      } else {
        this.refreshUsers();
      }
    } catch (err: any) {
      this.showInfo(err.error?.message || 'Σφάλμα κατά την αλλαγή ρόλου');
    }
  }
}