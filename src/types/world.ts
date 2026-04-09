export interface World {
  id: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorldInput {
  id: string;
  name: string;
  description?: string;
  color?: string;
}
