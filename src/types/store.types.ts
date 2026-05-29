export interface Store {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  address?: string;
}
