
export type Sale = Record<string, any>;

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface FilterConfig {
  globalSearch: string;
  cliente?: string;
  filial?: string;
  representante?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  type?: 'string' | 'number' | 'date' | 'boolean';
  format?: (val: any) => string;
}

export interface AppUser {
  id?: string;
  name: string;
  email: string;
  password?: string;
  rep_in_codigo: number | null;
  is_admin: boolean;
}

export interface SalesGoal {
  id?: string;
  rep_in_codigo: number;
  rep_nome: string;
  ano: number;
  mes: number;
  valor_meta: number;
  created_at?: string;
}

export interface ServicePrincipalConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

export type AuthMode = 'manual' | 'servicePrincipal';

export type DataSource = 'mock' | 'powerbi' | 'supabase';
