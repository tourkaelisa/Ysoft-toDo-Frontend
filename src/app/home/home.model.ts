// Εργασίες ανά χρήστη (μία γραμμή του πίνακα "Top Χρήστες")
export interface TasksPerUser {
  id: number;
  first_name: string;
  last_name: string;
  task_count: number;
}

// Στατιστικά admin 
export interface AdminStats {
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  tasksPerUser: TasksPerUser[];
}

// Στατιστικά απλού χρήστη 
export interface UserStats {
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
}

// Ένα σημείο της χρονοσειράς: πλήθος ανά ημέρα 
export interface DailyPoint {
  date: string;
  count: number;
}

// Η ημέρα με τις περισσότερες εγγραφές/εργασίες 
export interface Peak {
  date: string | null;
  count: number;
}

// για τα γραφήματα χρονοσειράς.
export interface TimeSeriesStats {
  daily: DailyPoint[];
  total: number;
  last30Days: number;
  peak: Peak;
}

// Τελευταίες εγγραφές 
export interface RecentUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
}

// Ο συνδεδεμένος χρήστης, όπως είναι αποθηκευμένος στο localStorage.
export interface SessionUser {
  first_name?: string;
  last_name?: string;
  role_name?: string;
}
