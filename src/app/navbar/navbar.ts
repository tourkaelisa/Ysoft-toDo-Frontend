import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService, TaskNotification } from '../core/notification.service';

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
    // Μόνο ο admin συνδέεται στο WebSocket για να λαμβάνει ειδοποιήσεις 
    if (this.isAdmin()) {
      this.notifications.connect();
    }
  }

  isAdmin(): boolean {
    const user = this.authService.getUserData();
    return user?.role_name === 'admin';
  }

  // dropdown με τις ειδοποιήσεις.
  toggleDropdown() {
    if (this.isDropdownOpen) {
      this.closeDropdown();
    } else {
      this.isDropdownOpen = true;
    }
  }

  // Κλείσιμο dropdown - μαρκάρουμε ως διαβασμένες 
  closeDropdown() {
    if (!this.isDropdownOpen) {
      return;
    }
    this.isDropdownOpen = false;
    this.notifications.markAllRead();
  }

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
    // Μαρκάρουμε ως διαβασμένες 
    this.notifications.markAllRead();
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
