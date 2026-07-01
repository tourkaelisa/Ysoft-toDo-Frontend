import { Injectable } from '@angular/core';
import { AdminStats, UserStats, TimeSeriesStats, RecentUser } from './home.model';
import { ApiService } from '../shared/api.service';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  constructor(private api: ApiService) {}


  // ΣΤΑΤΙΣΤΙΚΑ DASHBOARD

  getAdminStats(): Promise<AdminStats> {
    return this.api.select<AdminStats>('/api/stats/admin');
  }

  getUserStats(): Promise<UserStats> {
    return this.api.select<UserStats>('/api/stats/user');
  }

  getRegistrations(): Promise<TimeSeriesStats> {
    return this.api.select<TimeSeriesStats>('/api/stats/registrations');
  }

  getTasksCreated(): Promise<TimeSeriesStats> {
    return this.api.select<TimeSeriesStats>('/api/stats/tasks-created');
  }

  getRecentUsers(): Promise<RecentUser[]> {
    return this.api.select<RecentUser[]>('/api/stats/recent-users');
  }
}
