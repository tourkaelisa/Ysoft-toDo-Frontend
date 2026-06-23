import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';

// Το σχήμα της ειδοποίησης (ίδιο από το HTTP fetch και από το socket event)
export interface TaskNotification {
  id: number;          // id της ειδοποίησης
  taskId: number;      // id του task (για πλοήγηση)
  title: string;
  userId: number;      // id του χρήστη που δημιούργησε το task
  userName: string;
  createdAt: string;
  read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private baseUrl = 'http://localhost:5000';
  private socket: Socket | null = null;

  // Λίστα ειδοποιήσεων (νεότερη πρώτη)
  notifications = signal<TaskNotification[]>([]);

  // Πλήθος μη αναγνωσμένων (για το κόκκινο badge)
  unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // Καλείται όταν συνδέεται ο admin:
  // 1) φορτώνει το ιστορικό από τη βάση (ακόμη κι όσα ήρθαν όσο ήταν offline)
  // 2) ανοίγει realtime σύνδεση για νέες ειδοποιήσεις
  connect(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    // 1) Ιστορικό από τη βάση
    this.http.get<TaskNotification[]>(`${this.baseUrl}/api/notifications`, { headers: this.authHeaders() })
      .subscribe({
        next: (list) => this.notifications.set(list),
        error: () => {}
      });

    // 2) Realtime σύνδεση (idempotent)
    if (this.socket && this.socket.connected) {
      return;
    }
    this.socket = io(this.baseUrl, { auth: { token } });

    this.socket.on('task:new', (data: TaskNotification) => {
      this.notifications.update(list => [{ ...data, read: false }, ...list]);
    });
  }

  // Αποσύνδεση + καθάρισμα (π.χ. στο logout)
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.notifications.set([]);
  }

  // Μαρκάρει όλες ως αναγνωσμένες — τοπικά ΚΑΙ στη βάση (όταν κλείνει το dropdown)
  markAllRead(): void {
    if (this.unreadCount() === 0) {
      return;
    }
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
    this.http.put(`${this.baseUrl}/api/notifications/read`, {}, { headers: this.authHeaders() })
      .subscribe({ next: () => {}, error: () => {} });
  }

  // Καθαρισμός: διαγράφει όλες τις ειδοποιήσεις τοπικά ΚΑΙ στη βάση
  clearAll(): void {
    this.notifications.set([]);
    this.http.delete(`${this.baseUrl}/api/notifications`, { headers: this.authHeaders() })
      .subscribe({ next: () => {}, error: () => {} });
  }
}
