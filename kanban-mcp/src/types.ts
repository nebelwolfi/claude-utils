export interface Subtask {
  text: string;
  completed: boolean;
}

export interface Relation {
  type: string;
  taskId: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  subtasks: Subtask[];
  relations: Relation[];
  created: string;
  updated: string;
  started?: string;
  completed?: string;
  priority: "low" | "medium" | "high" | "critical";
  assignee: string;
  tags: string[];
  column?: string;
}

export interface BoardIndex {
  name: string;
  columns: string[];
  tasksByColumn: Record<string, string[]>;
  startedColumns: string[];
  completedColumns: string[];
}

export type Frontmatter = Record<string, string | number | string[] | undefined>;

export interface CreateTaskParams {
  title: string;
  column?: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "critical";
  assignee?: string;
  tags?: string[];
  position?: number;
  subtasks?: string[];
}

export interface FindTasksParams {
  query?: string;
  column?: string;
  assignee?: string;
  tag?: string;
  priority?: "low" | "medium" | "high" | "critical";
}
