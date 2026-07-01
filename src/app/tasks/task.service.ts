import { Injectable } from '@angular/core';
import { Task, TaskItem, TaskFile } from './task.model';
import { ApiMessage } from '../shared/api.model';
import { ApiService } from '../shared/api.service';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  constructor(private api: ApiService) {}


  // TASKS

  getTasks(): Promise<Task[]> {
    return this.api.select<Task[]>('/api/tasks');
  }

  createTask(title: string): Promise<ApiMessage> {
    return this.api.post<ApiMessage>('/api/tasks', { title });
  }

  updateTaskTitle(id: number, title: string): Promise<ApiMessage> {
    return this.api.put<ApiMessage>(`/api/tasks/${id}`, { title });
  }

  updateTaskStatus(id: number, status: string): Promise<ApiMessage> {
    return this.api.put<ApiMessage>(`/api/tasks/${id}/status`, { status });
  }

  deleteTask(id: number): Promise<ApiMessage> {
    return this.api.delete<ApiMessage>(`/api/tasks/${id}`);
  }


  // TASK ITEMS

  getTaskItems(taskId: number): Promise<TaskItem[]> {
    return this.api.select<TaskItem[]>(`/api/tasks/${taskId}/items`);
  }

  addTaskItem(taskId: number, description: string): Promise<ApiMessage> {
    return this.api.post<ApiMessage>(`/api/tasks/${taskId}/items`, { description });
  }

  updateTaskItem(itemId: number, description: string): Promise<ApiMessage> {
    return this.api.put<ApiMessage>(`/api/task-items/${itemId}`, { description });
  }

  deleteTaskItem(itemId: number): Promise<ApiMessage> {
    return this.api.delete<ApiMessage>(`/api/task-items/${itemId}`);
  }


  // ΑΡΧΕΙΑ

  getTaskFiles(taskId: number): Promise<TaskFile[]> {
    return this.api.select<TaskFile[]>(`/api/tasks/${taskId}/files`);
  }

  uploadFile(taskId: number, formData: FormData): Promise<ApiMessage> {
    return this.api.post<ApiMessage>(`/api/tasks/${taskId}/files`, formData);
  }

  downloadFile(fileId: number): Promise<Blob> {
    return this.api.select<Blob>(`/api/files/${fileId}/download`, { responseType: 'blob' });
  }

  deleteFile(fileId: number): Promise<ApiMessage> {
    return this.api.delete<ApiMessage>(`/api/files/${fileId}`);
  }
}
