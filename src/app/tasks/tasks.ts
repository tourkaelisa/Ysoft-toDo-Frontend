import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl, SafeResourceUrl } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TaskService } from './task.service';
import { Task, TaskItem, TaskFile } from './task.model';

type PreviewKind = 'image' | 'pdf' | 'video' | 'audio' | 'text' | 'none';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './tasks.html',
  styleUrl: './tasks.css'
})
export class TasksComponent implements OnInit {
  tasks = signal<Task[]>([]);
  errorMessage = signal('');

  newTaskTitle = '';

  selectedTask = signal<Task | null>(null);

  constructor(private taskService: TaskService, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.loadTasks();
  }

  async loadTasks() {
    try {
      const data = await this.taskService.getTasks();
      const currentTasks = this.tasks();
      const updatedTasks = data.map((newTask: Task) => {
        const existingTask = currentTasks.find((t: Task) => t.id === newTask.id);

        if (existingTask) {
          newTask.items = existingTask.items;
          newTask.files = existingTask.files;
          newTask.newItemDescription = existingTask.newItemDescription;
        }

        return newTask;
      });
      this.tasks.set(this.sortTasks(updatedTasks));

      // Φόρτωσε items για όλες τις εργασίες ώστε να φαίνεται ο αριθμός στη λίστα
      updatedTasks.forEach((task: Task) => {
        if (!task.items) {
          this.loadTaskItems(task);
        }
      });

      // Ενημέρωση του selectedTask αν υπάρχει
      const currentSelected = this.selectedTask();
      if (currentSelected) {
        const refreshed = updatedTasks.find((t: Task) => t.id === currentSelected.id);
        this.selectedTask.set(refreshed || null);
      }
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Σφάλμα κατά τη φόρτωση των εργασιών.');
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

  async addTask() {
    if (!this.newTaskTitle.trim()) return;

    try {
      await this.taskService.createTask(this.newTaskTitle);
      this.newTaskTitle = '';
      this.loadTasks();
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Αποτυχία προσθήκης εργασίας.');
    }
  }

  async toggleStatus(task: Task, event?: Event) {
    if (event) event.stopPropagation();
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';

    try {
      await this.taskService.updateTaskStatus(task.id, newStatus);
      this.loadTasks();
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Σφάλμα κατά την ενημέρωση της κατάστασης.');
    }
  }

  selectTask(task: Task) {
    this.selectedTask.set(task);
    if (!task.items) {
      this.loadTaskItems(task);
    }
    if (!task.files) {
      this.loadTaskFiles(task);
    }
  }

  closeSidePanel() {
    this.selectedTask.set(null);
  }

  // Task-Items 

  async loadTaskItems(task: Task) {
    try {
      const items = await this.taskService.getTaskItems(task.id);
      task.items = items;
      this.tasks.update(tasks => [...tasks]);
    } catch {
      this.errorMessage.set('Σφάλμα φόρτωσης υπο-εργασιών.');
    }
  }

  async addTaskItem(task: Task) {
    if (!task.newItemDescription?.trim()) return;

    try {
      await this.taskService.addTaskItem(task.id, task.newItemDescription);
      task.newItemDescription = '';
      this.loadTaskItems(task);
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Σφάλμα προσθήκης item.');
    }
  }

  // ΑΡΧΕΙΑ - upload / λίστα / download / διαγραφή

  async loadTaskFiles(task: Task) {
    try {
      const files = await this.taskService.getTaskFiles(task.id);
      task.files = files;
      this.tasks.update(tasks => [...tasks]);
    } catch {
      this.errorMessage.set('Σφάλμα φόρτωσης αρχείων.');
    }
  }

  // Ανέβασμα αρχείου από το <input type="file">
  async uploadFile(task: Task, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    task.uploading = true;
    try {
      await this.taskService.uploadFile(task.id, formData);
      task.uploading = false;
      input.value = ''; // καθάρισμα ώστε να μπορεί να ξαναεπιλεγεί το ίδιο αρχείο
      this.loadTaskFiles(task);
    } catch (err: any) {
      task.uploading = false;
      input.value = '';
      this.errorMessage.set(err.error?.message || 'Αποτυχία ανεβάσματος αρχείου.');
    }
  }

  // Κατέβασμα αρχείου (binary -> blob -> τοπική λήψη)
  async downloadFile(file: TaskFile) {
    try {
      const blob = await this.taskService.downloadFile(file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      this.errorMessage.set('Σφάλμα κατά τη λήψη του αρχείου.');
    }
  }

  // ΠΡΟΒΟΛΗ ΑΡΧΕΙΟΥ ΣΕ MODAL

  // Signals: η εφαρμογή είναι zoneless, οπότε updates μετά από await
  // πρέπει να γίνονται σε signals για να ανανεωθεί η προβολή.
  isPreviewModalOpen = signal(false);
  previewFile = signal<TaskFile | null>(null);
  previewKind = signal<PreviewKind>('none');
  // img/video/audio θέλουν SafeUrl (URL context), το iframe (pdf) θέλει SafeResourceUrl
  previewUrl = signal<SafeUrl | SafeResourceUrl | null>(null);
  previewText = signal<string | null>(null); // περιεχόμενο για αρχεία κειμένου
  previewLoading = signal(false);
  private previewRawUrl: string | null = null; // για revoke + άμεσο download

  // Καθορίζει τι είδους προεπισκόπηση υποστηρίζει ο τύπος αρχείου
  getPreviewKind(mimeType: string): PreviewKind {
    if (!mimeType) return 'none';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('text/')) return 'text';
    return 'none';
  }

  // Άνοιγμα του modal και φόρτωση του αρχείου ως blob για προβολή inline
  async openPreview(file: TaskFile) {
    const kind = this.getPreviewKind(file.mime_type);
    this.previewFile.set(file);
    this.previewKind.set(kind);
    this.previewUrl.set(null);
    this.previewText.set(null);
    this.previewRawUrl = null;
    this.isPreviewModalOpen.set(true);

    // Μη προβλέψιμοι τύποι: δείχνουμε μήνυμα + κουμπί λήψης, χωρίς φόρτωση
    if (kind === 'none') return;

    this.previewLoading.set(true);
    try {
      const blob = await this.taskService.downloadFile(file.id);

      if (kind === 'text') {
        // Το κείμενο το διαβάζουμε και το δείχνουμε σε <pre> — το iframe
        // θα κατέβαζε τύπους που δεν αποδίδονται inline (π.χ. text/x-python).
        this.previewText.set(await blob.text());
      } else {
        // Εξασφαλίζουμε σωστό MIME type ώστε ο browser να αποδώσει σωστά το blob
        const typedBlob = blob.type ? blob : new Blob([blob], { type: file.mime_type });
        const rawUrl = window.URL.createObjectURL(typedBlob);
        this.previewRawUrl = rawUrl;
        // Το iframe (pdf) χρειάζεται resource URL, τα υπόλοιπα απλό safe URL
        this.previewUrl.set(
          kind === 'pdf'
            ? this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl)
            : this.sanitizer.bypassSecurityTrustUrl(rawUrl)
        );
      }
    } catch {
      this.errorMessage.set('Σφάλμα κατά την προβολή του αρχείου.');
      this.closePreview();
    } finally {
      this.previewLoading.set(false);
    }
  }

  // Λήψη του αρχείου που προβάλλεται αυτή τη στιγμή
  downloadPreviewFile() {
    const file = this.previewFile();
    if (file) this.downloadFile(file);
  }

  closePreview() {
    if (this.previewRawUrl) {
      window.URL.revokeObjectURL(this.previewRawUrl);
      this.previewRawUrl = null;
    }
    this.isPreviewModalOpen.set(false);
    this.previewFile.set(null);
    this.previewKind.set('none');
    this.previewUrl.set(null);
    this.previewText.set(null);
    this.previewLoading.set(false);
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

  // Μεταβλητές για το pop up της διαγραφής
  isDeleteModalOpen = false;
  deleteTarget: 'task' | 'subtask' | 'file' | null = null;
  itemToDelete: Task | TaskItem | TaskFile | null = null;
  parentTask: Task | null = null;

  openDeleteModal(item: Task | TaskItem | TaskFile, target: 'task' | 'subtask' | 'file', parent?: Task, event?: Event) {
    if (event) event.stopPropagation();
    this.deleteTarget = target;
    this.itemToDelete = item;
    this.parentTask = parent ?? null;
    this.isDeleteModalOpen = true;
  }

  async confirmDelete() {
    if (!this.itemToDelete) return;
    const itemId = this.itemToDelete.id;

    if (this.deleteTarget === 'task') {
      try {
        await this.taskService.deleteTask(itemId);
        // Αν διαγραφεί το επιλεγμένο, κλείσε το panel
        if (this.selectedTask()?.id === itemId) {
          this.selectedTask.set(null);
        }
        this.loadTasks();
        this.closeDeleteModal();
      } catch {}
    } else if (this.deleteTarget === 'subtask' && this.parentTask) {
      const parent = this.parentTask;
      try {
        await this.taskService.deleteTaskItem(itemId);
        this.loadTaskItems(parent);
        this.closeDeleteModal();
      } catch {}
    } else if (this.deleteTarget === 'file' && this.parentTask) {
      const parent = this.parentTask;
      try {
        await this.taskService.deleteFile(itemId);
        this.loadTaskFiles(parent);
        this.closeDeleteModal();
      } catch (err: any) {
        this.errorMessage.set(err.error?.message || 'Αποτυχία διαγραφής αρχείου.');
      }
    }
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.deleteTarget = null;
    this.itemToDelete = null;
    this.parentTask = null;
  }

  // Μεταβλήτές για το pop up της επεξεργασίας 
  isEditModalOpen = false;
  editTarget: 'task' | 'subtask' | null = null;
  taskBeingEdited: Task | null = null;
  subtaskBeingEdited: TaskItem | null = null;
  editTitle = '';
  editError = signal('');

  editTask(task: Task, event?: Event) {
    if (event) event.stopPropagation();
    this.editTarget = 'task';
    this.taskBeingEdited = task;
    this.editTitle = task.title;
    this.editError.set('');
    this.isEditModalOpen = true;
  }

  editTaskItem(item: TaskItem, task: Task) {
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

  async saveEdit() {
    if (!this.editTitle.trim()) {
      this.editError.set(
        this.editTarget === 'subtask'
          ? 'Το όνομα της υπο-εργασίας δεν μπορεί να είναι κενό.'
          : 'Ο τίτλος της εργασίας δεν μπορεί να είναι κενός.'
      );
      return;
    }
    this.editError.set('');

    if (this.editTarget === 'task' && this.taskBeingEdited) {
      try {
        await this.taskService.updateTaskTitle(this.taskBeingEdited.id, this.editTitle);
        this.errorMessage.set('');
        this.loadTasks();
        this.closeEditModal();
      } catch (err: any) {
        this.errorMessage.set(err.error?.message || 'Αποτυχία ανανέωσης της εργασίας.');
      }
    } else if (this.editTarget === 'subtask' && this.subtaskBeingEdited && this.taskBeingEdited) {
      const parent = this.taskBeingEdited;
      try {
        await this.taskService.updateTaskItem(this.subtaskBeingEdited.id, this.editTitle);
        this.loadTaskItems(parent);
        this.closeEditModal();
      } catch (err: any) {
        this.errorMessage.set(err.error?.message || 'Αποτυχία ενημέρωσης.');
      }
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
