import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './tasks.html',
  styleUrl: './tasks.css'
})
export class TasksComponent implements OnInit {
  tasks = signal<any[]>([]);
  errorMessage = signal('');

  newTaskTitle = '';

  // ΝΕΟ: η επιλεγμένη εργασία που εμφανίζεται στο side panel
  selectedTask = signal<any | null>(null);

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadTasks();
  }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  loadTasks() {
    this.http.get('http://localhost:5000/api/tasks', { headers: this.getHeaders() }).subscribe({
      next: (data: any ) => {
        const currentTasks = this.tasks();
        const updatedTasks = data.map((newTask: any) => {
          const existingTask = currentTasks.find((t: any) => t.id === newTask.id);

          if (existingTask) {
            newTask.items = existingTask.items;
            newTask.newItemDescription = existingTask.newItemDescription;
          }

          return newTask;
        });
        this.tasks.set(updatedTasks);

        // Φόρτωσε items για όλες τις εργασίες ώστε να φαίνεται ο αριθμός στη λίστα
        updatedTasks.forEach((task: any) => {
          if (!task.items) {
            this.loadTaskItems(task);
          }
        });

        // Ενημέρωση του selectedTask αν υπάρχει
        const currentSelected = this.selectedTask();
        if (currentSelected) {
          const refreshed = updatedTasks.find((t: any) => t.id === currentSelected.id);
          this.selectedTask.set(refreshed || null);
        }
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Σφάλμα κατά τη φόρτωση των εργασιών.');
      }
    });
  }

  addTask() {
    if (!this.newTaskTitle.trim()) return;

    const body = { title: this.newTaskTitle };

    this.http.post('http://localhost:5000/api/tasks', body, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.newTaskTitle = '';
        this.loadTasks();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Αποτυχία προσθήκης εργασίας.');
      }
    });
  }

  toggleStatus(task: any, event?: Event) {
    if (event) event.stopPropagation();
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';

    this.http.put(`http://localhost:5000/api/tasks/${task.id}/status`, { status: newStatus }, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.loadTasks();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Σφάλμα κατά την ενημέρωση της κατάστασης.');
      }
    });
  }

  // ΝΕΟ: επιλογή task για εμφάνιση στο side panel
  selectTask(task: any) {
    this.selectedTask.set(task);
    if (!task.items) {
      this.loadTaskItems(task);
    }
    if (!task.files) {
      this.loadTaskFiles(task);
    }
  }

  // ΝΕΟ: κλείσιμο του side panel
  closeSidePanel() {
    this.selectedTask.set(null);
  }

  loadTaskItems(task: any) {
    this.http.get(`http://localhost:5000/api/tasks/${task.id}/items`, { headers: this.getHeaders() }).subscribe({
      next: (items: any) => {
        task.items = items;
        this.tasks.update(tasks => [...tasks]);
      },
      error: () => this.errorMessage.set('Σφάλμα φόρτωσης υπο-εργασιών.')
    });
  }

  addTaskItem(task: any) {
    if (!task.newItemDescription?.trim()) return;

    this.http.post(`http://localhost:5000/api/tasks/${task.id}/items`, { description: task.newItemDescription }, { headers: this.getHeaders() }).subscribe({
      next: () => {
        task.newItemDescription = '';
        this.loadTaskItems(task);
      },
      error: (err) => this.errorMessage.set(err.error?.message || 'Σφάλμα προσθήκης item.')
    });
  }

  // =========================================================
  //  ΑΡΧΕΙΑ (FILES) — upload / λίστα / download / διαγραφή
  // =========================================================

  // Φόρτωση της λίστας αρχείων ενός task
  loadTaskFiles(task: any) {
    this.http.get(`http://localhost:5000/api/tasks/${task.id}/files`, { headers: this.getHeaders() }).subscribe({
      next: (files: any) => {
        task.files = files;
        this.tasks.update(tasks => [...tasks]);
      },
      error: () => this.errorMessage.set('Σφάλμα φόρτωσης αρχείων.')
    });
  }

  // Ανέβασμα αρχείου από το <input type="file">
  uploadFile(task: any, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    task.uploading = true;
    // Σημ.: ΔΕΝ βάζουμε Content-Type — ο browser το ορίζει μόνος του (multipart boundary)
    this.http.post(`http://localhost:5000/api/tasks/${task.id}/files`, formData, { headers: this.getHeaders() }).subscribe({
      next: () => {
        task.uploading = false;
        input.value = ''; // καθάρισμα ώστε να μπορεί να ξαναεπιλεγεί το ίδιο αρχείο
        this.loadTaskFiles(task);
      },
      error: (err) => {
        task.uploading = false;
        input.value = '';
        this.errorMessage.set(err.error?.message || 'Αποτυχία ανεβάσματος αρχείου.');
      }
    });
  }

  // Κατέβασμα αρχείου (binary -> blob -> τοπική λήψη)
  downloadFile(file: any) {
    this.http.get(`http://localhost:5000/api/files/${file.id}/download`, {
      headers: this.getHeaders(),
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
      error: () => this.errorMessage.set('Σφάλμα κατά τη λήψη του αρχείου.')
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

  // ΝΕΕΣ ΜΕΤΑΒΛΗΤΕΣ ΓΙΑ ΤΟ POP-UP ΔΙΑΓΡΑΦΗΣ
  isDeleteModalOpen = false;
  deleteTarget: 'task' | 'subtask' | 'file' | null = null;
  itemToDelete: any = null;
  parentTask: any = null;

  openDeleteModal(item: any, target: 'task' | 'subtask' | 'file', parent?: any, event?: Event) {
    if (event) event.stopPropagation();
    this.deleteTarget = target;
    this.itemToDelete = item;
    this.parentTask = parent;
    this.isDeleteModalOpen = true;
  }

  confirmDelete() {
    if (this.deleteTarget === 'task') {
      this.http.delete(`http://localhost:5000/api/tasks/${this.itemToDelete.id}`, { headers: this.getHeaders() }).subscribe({
        next: () => {
          // Αν διαγραφεί το επιλεγμένο, κλείσε το panel
          if (this.selectedTask()?.id === this.itemToDelete.id) {
            this.selectedTask.set(null);
          }
          this.loadTasks();
          this.closeDeleteModal();
        }
      });
    } else if (this.deleteTarget === 'subtask') {
      this.http.delete(`http://localhost:5000/api/task-items/${this.itemToDelete.id}`, { headers: this.getHeaders() }).subscribe({
        next: () => {
          this.loadTaskItems(this.parentTask);
          this.closeDeleteModal();
        }
      });
    } else if (this.deleteTarget === 'file') {
      this.http.delete(`http://localhost:5000/api/files/${this.itemToDelete.id}`, { headers: this.getHeaders() }).subscribe({
        next: () => {
          this.loadTaskFiles(this.parentTask);
          this.closeDeleteModal();
        },
        error: (err) => this.errorMessage.set(err.error?.message || 'Αποτυχία διαγραφής αρχείου.')
      });
    }
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.deleteTarget = null;
    this.itemToDelete = null;
    this.parentTask = null;
  }

  // ΝΕΕΣ ΜΕΤΑΒΛΗΤΕΣ ΓΙΑ ΤΟ POP-UP ΕΠΕΞΕΡΓΑΣΙΑΣ
  isEditModalOpen = false;
  editTarget: 'task' | 'subtask' | null = null;
  taskBeingEdited: any = null;
  subtaskBeingEdited: any = null;
  editTitle = '';
  editError = signal('');

  editTask(task: any, event?: Event) {
    if (event) event.stopPropagation();
    this.editTarget = 'task';
    this.taskBeingEdited = task;
    this.editTitle = task.title;
    this.editError.set('');
    this.isEditModalOpen = true;
  }

  editTaskItem(item: any, task: any) {
    this.editTarget = 'subtask';
    this.taskBeingEdited = task;
    this.subtaskBeingEdited = item;
    this.editTitle = item.description;
    this.editError.set('');
    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.editTarget = null;
    this.taskBeingEdited = null;
    this.subtaskBeingEdited = null;
    this.editTitle = '';
    this.editError.set('');
  }

  saveEdit() {
    if (!this.editTitle.trim()) {
      this.editError.set(
        this.editTarget === 'subtask'
          ? 'Το όνομα της υπο-εργασίας δεν μπορεί να είναι κενό.'
          : 'Ο τίτλος της εργασίας δεν μπορεί να είναι κενός.'
      );
      return;
    }
    this.editError.set('');

    if (this.editTarget === 'task') {
      this.http.put(`http://localhost:5000/api/tasks/${this.taskBeingEdited.id}`, { title: this.editTitle }, { headers: this.getHeaders() }).subscribe({
        next: () => {
          this.errorMessage.set('');
          this.loadTasks();
          this.closeEditModal();
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Αποτυχία ανανέωσης της εργασίας.');
        }
      });
    } else if (this.editTarget === 'subtask') {
      this.http.put(`http://localhost:5000/api/task-items/${this.subtaskBeingEdited.id}`, { description: this.editTitle }, { headers: this.getHeaders() }).subscribe({
        next: () => {
          this.loadTaskItems(this.taskBeingEdited);
          this.closeEditModal();
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Αποτυχία ενημέρωσης.');
        }
      });
    }
  }

  getTotalTasks(): number {
    return this.tasks().length;
  }

  getCompletedTasks(): number {
    return this.tasks().filter(task => task.status === 'completed').length;
  }

  getPendingTasks(): number {
    return this.tasks().filter(task => task.status !== 'completed').length;
  }

  getCompletionPercentage(): number {
    const total = this.getTotalTasks();
    if (total === 0) return 0;
    return Math.round((this.getCompletedTasks() / total) * 100);
  }

}