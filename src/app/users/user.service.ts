import { Injectable } from '@angular/core';
import { ApiMessage } from '../shared/api.model';
import { ApiService } from '../shared/api.service';
import { Task } from '../tasks/task.model';
import { User, UserFormData, UserUpdateResponse } from './user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private api: ApiService) {}


  // ΧΡΗΣΤΕΣ — λίστα / αναζήτηση / φίλτρα

  getUsers(): Promise<User[]> {
    return this.api.select<User[]>('/api/users');
  }

  searchUsers(query: string): Promise<User[]> {
    return this.api.select<User[]>(`/api/users/search?query=${query}`);
  }

  filterByDate(startDate: string, endDate: string): Promise<User[]> {
    return this.api.select<User[]>(`/api/users/filter/by-date?startDate=${startDate}&endDate=${endDate}`);
  }

  getAdmins(): Promise<User[]> {
    return this.api.select<User[]>('/api/users/roles/admins');
  }

  getStandardUsers(): Promise<User[]> {
    return this.api.select<User[]>('/api/users/roles/users');
  }


  // ΧΡΗΣΤΕΣ — δημιουργία / επεξεργασία / διαγραφή

  createUser(data: UserFormData): Promise<ApiMessage> {
    return this.api.post<ApiMessage>('/api/admin/users', data);
  }

  updateUser(id: number, data: UserFormData): Promise<UserUpdateResponse> {
    return this.api.put<UserUpdateResponse>(`/api/admin/users/${id}`, data);
  }

  deleteUser(id: number): Promise<ApiMessage> {
    return this.api.delete<ApiMessage>(`/api/users/${id}`);
  }

  updateUserRole(id: number, roleId: number): Promise<UserUpdateResponse> {
    return this.api.put<UserUpdateResponse>(`/api/users/${id}/role`, { role_id: roleId });
  }


  //  TASKS ΧΡΗΣΤΗ προβολή admin & λήψη αρχείων

  getUserTasks(userId: number): Promise<Task[]> {
    return this.api.select<Task[]>(`/api/admin/users/${userId}/tasks`);
  }

  downloadFile(fileId: number): Promise<Blob> {
    return this.api.select<Blob>(`/api/files/${fileId}/download`, { responseType: 'blob' });
  }
}
