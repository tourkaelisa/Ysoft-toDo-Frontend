export interface TaskItem {
  id: number;
  description: string;
}

export interface TaskFile {
  id: number;

  original_name: string;
  mime_type: string;
  size: number;
}

export interface Task {
  id: number;
  title: string;
  status: string; // 'completed' | 'pending'
  created_at?: string;

  items?: TaskItem[];
  files?: TaskFile[];
  newItemDescription?: string;
  uploading?: boolean;
}
