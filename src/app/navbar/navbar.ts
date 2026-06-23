import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../auth';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService, TaskNotification } from '../notification.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent implements OnInit {
  isDropdownOpen = false;

  constructor(
    public authService: AuthService,
    private router: Router,
    public notifications: NotificationService
  ) {}

  ngOnInit() {
    // Μόνο ο admin συνδέεται στο WebSocket για να λαμβάνει ειδοποιήσεις νέων tasks.
    if (this.isAdmin()) {
      this.notifications.connect();
    }
  }

  isAdmin(): boolean {
    const user = this.authService.getUserData();
    const role = user?.role_name || user?.role;
    return role === 'admin';
  }

  // Ανοιγοκλείνει το dropdown με τις ειδοποιήσεις.
  toggleDropdown() {
    if (this.isDropdownOpen) {
      this.closeDropdown();
    } else {
      this.isDropdownOpen = true;
    }
  }

  // Κλείσιμο dropdown: ΤΟΤΕ μαρκάρουμε ως διαβασμένες (ώστε να προλάβεις
  // να δεις ποιες ήταν αδιάβαστες όσο ήταν ανοιχτό).
  closeDropdown() {
    if (!this.isDropdownOpen) {
      return;
    }
    this.isDropdownOpen = false;
    this.notifications.markAllRead();
  }

  // Κλείσιμο όταν κάνεις κλικ οπουδήποτε αλλού στην οθόνη.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.isDropdownOpen && !target.closest('.notif-wrapper')) {
      this.closeDropdown();
    }
  }

  // Καθαρισμός όλων των ειδοποιήσεων
  clearNotifications(event: Event) {
    event.stopPropagation();
    this.notifications.clearAll();
  }

  // Click σε ειδοποίηση -> πάμε στη σελίδα χρηστών και ανοίγουμε τα tasks του χρήστη.
  openNotification(n: TaskNotification) {
    this.isDropdownOpen = false;
    this.router.navigate(['/users'], {
      queryParams: { openUser: n.userId, highlightTask: n.taskId }
    });
  }

  onLogout() {
    this.notifications.disconnect();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
