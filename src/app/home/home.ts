import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Chart } from 'chart.js/auto';
import { HomeService } from './home.service';
import { AdminStats, UserStats, TimeSeriesStats, RecentUser, SessionUser } from './home.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit, AfterViewInit {
  user: SessionUser | null = null;
  isAdmin = false;
  stats = signal<AdminStats | null>(null);
  errorMessage = signal('');

  // ΓΡΑΦΗΜΑ ΕΓΓΡΑΦΩΝ ΧΡΗΣΤΩΝ
  @ViewChild('regCanvas') regCanvas?: ElementRef<HTMLCanvasElement>;
  registrations = signal<TimeSeriesStats | null>(null);
  chartMode = signal<'cumulative' | 'daily'>('cumulative');
  private regChart?: Chart;
  private viewReady = false;

  regTotal = computed(() => this.registrations()?.total || 0);
  regLast30 = computed(() => this.registrations()?.last30Days || 0);
  regPeak = computed(() => this.registrations()?.peak ?? { date: null, count: 0 });

  // ΓΡΑΦΗΜΑ ΔΗΜΙΟΥΡΓΙΑΣ ΕΡΓΑΣΙΩΝ 
  @ViewChild('taskCanvas') taskCanvas?: ElementRef<HTMLCanvasElement>;
  taskCreation = signal<TimeSeriesStats | null>(null);
  taskChartMode = signal<'daily' | 'weekly'>('daily');
  private taskChart?: Chart;

  taskTotal = computed(() => this.taskCreation()?.total || 0);
  taskLast30 = computed(() => this.taskCreation()?.last30Days || 0);
  taskPeak = computed(() => this.taskCreation()?.peak ?? { date: null, count: 0 });

  recentUsers = signal<RecentUser[]>([]);

  totalUsers = computed(() => {
    const s = this.stats();
    return s?.tasksPerUser?.length || 0;
  });

  completionRate = computed(() => {
    const s = this.stats();
    if (!s || !s.totalTasks) return 0;
    return Math.round((s.completedTasks / s.totalTasks) * 100);
  });

  pendingRate = computed(() => {
    const s = this.stats();
    if (!s || !s.totalTasks) return 0;
    return Math.round((s.pendingTasks / s.totalTasks) * 100);
  });

  // Top 5 
  topUsers = computed(() => {
    const s = this.stats();
    if (!s?.tasksPerUser) return [];
    return [...s.tasksPerUser]
      .sort((a, b) => b.task_count - a.task_count)
      .slice(0, 5);
  });

  maxTaskCount = computed(() => {
    const top = this.topUsers();
    if (top.length === 0) return 1;
    return Math.max(...top.map((u) => u.task_count), 1);
  });

  inactiveUsers = computed(() => {
    const s = this.stats();
    if (!s?.tasksPerUser) return 0;
    return s.tasksPerUser.filter((u) => u.task_count === 0).length;
  });

  avgTasksPerUser = computed(() => {
    const s = this.stats();
    if (!s?.tasksPerUser || s.tasksPerUser.length === 0) return 0;
    return (s.totalTasks / s.tasksPerUser.length).toFixed(1);
  });

  // Στατιστικά του συνδεδεμένου χρήστη
  userStats = signal<UserStats | null>(null);

  userTotalTasks = computed(() => this.userStats()?.totalTasks || 0);
  userCompletedTasks = computed(() => this.userStats()?.completedTasks || 0);
  userPendingTasks = computed(() => this.userStats()?.pendingTasks || 0);
  userCompletionRate = computed(() => {
    const total = this.userTotalTasks();
    if (total === 0) return 0;
    return Math.round((this.userCompletedTasks() / total) * 100);
  });

  constructor(private homeService: HomeService) {}

  ngOnInit() {
    this.checkRoleAndLoadStats();
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.renderRegChart();
    this.renderTaskChart();
  }

  checkRoleAndLoadStats() {
    const userString = localStorage.getItem('user');

    if (userString) {
      this.user = JSON.parse(userString);

      if (this.user?.role_name === 'admin') {
        this.isAdmin = true;
        this.loadAdminStats();
      } else {
        this.loadUserStats();
      }
    }
  }

  async loadUserStats() {
    try {
      const data = await this.homeService.getUserStats();
      this.userStats.set(data);
    } catch {
      this.errorMessage.set('Αποτυχία φόρτωσης στατιστικών δεδομένων.');
    }
  }

  async loadAdminStats() {
    try {
      const data = await this.homeService.getAdminStats();
      this.stats.set(data);
    } catch (err) {
      console.error('Σφάλμα φόρτωσης admin stats:', err);
      this.errorMessage.set('Αποτυχία φόρτωσης στατιστικών δεδομένων.');
    }

    try {
      const data = await this.homeService.getRegistrations();
      this.registrations.set(data);
      this.renderRegChart();
    } catch (err) {
      console.error('Σφάλμα φόρτωσης στατιστικών εγγραφών:', err);
    }

    try {
      const data = await this.homeService.getTasksCreated();
      this.taskCreation.set(data);
      this.renderTaskChart();
    } catch (err) {
      console.error('Σφάλμα φόρτωσης στατιστικών εργασιών:', err);
    }

    try {
      const data = await this.homeService.getRecentUsers();
      this.recentUsers.set(data || []);
    } catch (err) {
      console.error('Σφάλμα φόρτωσης πρόσφατων χρηστών:', err);
    }
  }

  joinedAgo(createdAt: string): string {
    if (!createdAt) return '';
    const then = new Date(createdAt.replace(' ', 'T'));
    const today = new Date();
    const d1 = new Date(then.getFullYear(), then.getMonth(), then.getDate());
    const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const days = Math.round((d2.getTime() - d1.getTime()) / 86400000);
    if (days <= 0) return 'Σήμερα';
    if (days === 1) return 'Χθες';
    if (days < 7) return `πριν ${days} ημέρες`;
    if (days < 14) return 'πριν 1 εβδομάδα';
    if (days < 30) return `πριν ${Math.floor(days / 7)} εβδομάδες`;
    return `πριν ${Math.floor(days / 30)} μήνα/ες`;
  }

  // Εναλλαγή Σωρευτικά-Ανά ημέρα
  setChartMode(mode: 'cumulative' | 'daily') {
    if (this.chartMode() === mode) return;
    this.chartMode.set(mode);
    this.renderRegChart();
  }

  // Εναλλαγή Ανά ημέρα-Ανά εβδομάδα
  setTaskChartMode(mode: 'daily' | 'weekly') {
    if (this.taskChartMode() === mode) return;
    this.taskChartMode.set(mode);
    this.renderTaskChart();
  }

  // Μετατροπή 'YYYY-MM-DD' σε 'D/M' για τις ετικέτες του άξονα x
  private formatLabel(isoDate: string): string {
    const [, m, d] = isoDate.split('-');
    return `${Number(d)}/${Number(m)}`;
  }

  // συνεχόμενο εύρος από την πρώτη μέρα έως σήμερα (με 0 στις κενές μέρες)
  private buildSeries(daily: { date: string; count: number }[], mode: 'cumulative' | 'daily' | 'weekly'): { labels: string[]; data: number[] } {
    if (!daily || daily.length === 0) return { labels: [], data: [] };

    const counts = new Map(daily.map(r => [r.date, r.count]));

    const start = new Date(daily[0].date + 'T00:00:00');
    const end = new Date();
    end.setHours(0, 0, 0, 0);

    // Όλες οι μέρες του εύρους
    const days: { iso: string; count: number }[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      days.push({ iso, count: counts.get(iso) || 0 });
    }

    // Ανά εβδομάδα: ομαδοποίηση ανά 7 μέρες, ετικέτα = αρχή εβδομάδας
    if (mode === 'weekly') {
      const labels: string[] = [];
      const data: number[] = [];
      for (let i = 0; i < days.length; i += 7) {
        const week = days.slice(i, i + 7);
        labels.push(this.formatLabel(week[0].iso));
        data.push(week.reduce((sum, day) => sum + day.count, 0));
      }
      return { labels, data };
    }

    const labels = days.map(day => this.formatLabel(day.iso));
    const perDay = days.map(day => day.count);

    if (mode === 'daily') {
      return { labels, data: perDay };
    }

    // Σωρευτικά: τρέχον άθροισμα
    let running = 0;
    const cumulative = perDay.map(c => (running += c));
    return { labels, data: cumulative };
  }

  // hex -> rgba (για το gradient γεμίσματος κάτω από τη γραμμή)
  private hexToRgba(hex: string, alpha: number): string {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // δημιουργία γραφήματος
  private createChart(canvas: HTMLCanvasElement, labels: string[], data: number[], label: string, color: string, kind: 'line' | 'bar' = 'line', barConfig: any = {}, smooth: boolean = true): Chart | undefined {
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let dataset: any;
    if (kind === 'bar') {
      dataset = {
        label,
        data,
        backgroundColor: this.hexToRgba(color, 0.85),
        hoverBackgroundColor: color,
        borderRadius: 6,
        borderSkipped: false,
        ...barConfig
      };
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 0, 320);
      gradient.addColorStop(0, this.hexToRgba(color, 0.35));
      gradient.addColorStop(1, this.hexToRgba(color, 0.02));
      dataset = {
        label,
        data,
        borderColor: color,
        backgroundColor: gradient,
        borderWidth: 2.5,
        fill: true,
        // smooth=true -> ομαλή καμπύλη, smooth=false -> ίσιες γραμμές
        ...(smooth ? { cubicInterpolationMode: 'monotone' } : { tension: 0 }),
        pointRadius: 3,
        pointBackgroundColor: '#fff',
        pointBorderColor: color,
        pointBorderWidth: 2,
        pointHoverRadius: 5
      };
    }

    return new Chart(ctx, {
      type: kind,
      data: { labels, datasets: [dataset] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e1b4b',
            padding: 12,
            cornerRadius: 8,
            titleFont: { size: 13 },
            bodyFont: { size: 13, weight: 'bold' }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11 }, maxRotation: 0, autoSkipPadding: 12 }
          },
          y: {
            beginAtZero: true,
            grace: '12%', 
            grid: { color: '#f1f5f9' },
            ticks: { color: '#94a3b8', font: { size: 11 }, precision: 0 }
          }
        }
      }
    });
  }

  private renderRegChart() {
    const registrations = this.registrations();
    if (!this.viewReady || !registrations || !this.regCanvas) return;
    const { labels, data } = this.buildSeries(registrations.daily, this.chartMode());
    if (this.regChart) this.regChart.destroy();
    this.regChart = this.createChart(
      this.regCanvas.nativeElement, labels, data,
      this.chartMode() === 'cumulative' ? 'Σύνολο χρηστών' : 'Εγγραφές',
      '#3f51b5', 'line', {},
      this.chartMode() === 'daily' // καμπύλο μόνο στο "Ανά ημέρα", ίσιο στα "Σωρευτικά"
    );
  }

  private renderTaskChart() {
    const taskCreation = this.taskCreation();
    if (!this.viewReady || !taskCreation || !this.taskCanvas) return;
    const weekly = this.taskChartMode() === 'weekly';
    const { labels, data } = this.buildSeries(taskCreation.daily, this.taskChartMode());
    if (this.taskChart) this.taskChart.destroy();
    const barConfig = weekly
      ? { categoryPercentage: 0.85, barPercentage: 0.85, maxBarThickness: 90 }
      : { maxBarThickness: 26 };
    this.taskChart = this.createChart(
      this.taskCanvas.nativeElement, labels, data,
      weekly ? 'Εργασίες/εβδομάδα' : 'Εργασίες',
      '#e73c7e', 'bar', barConfig
    );
  }

  // για τα αρχικά του χρήστη στο avatar
  getInitials(firstName: string, lastName: string): string {
    const f = firstName?.[0] || '';
    const l = lastName?.[0] || '';
    return (f + l).toUpperCase() || '-';
  }

  // για το ποσοστό μιας bar
  getBarWidth(count: number): number {
    const max = this.maxTaskCount();
    if (max === 0) return 0;
    return Math.round((count / max) * 100);
  }
}