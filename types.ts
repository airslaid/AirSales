
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
  allowed_modules?: string[]; // Lista de IDs dos módulos permitidos
  processo?: string | null; // Processo ao qual o usuário pertence
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

export interface CRMAppointment {
  id: string;
  title: string;
  client_id?: number;
  client_name?: string;
  rep_in_codigo: number;
  start_date: string; // ISO String
  end_date: string;   // ISO String
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
  activity_type: 'REUNIAO' | 'TELEFONEMA' | 'COMPROMISSO' | 'VISITA' | 'EMAIL';
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  status: 'AGENDADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
  recurrence: 'UNICO' | 'DIARIA' | 'SEMANAL' | 'MENSAL' | 'ANUAL';
  description?: string;
  location?: string;
  req_confirmation: boolean;
  notify_email: boolean;
  hide_appointment: boolean;
}

export interface CRMTask {
  id: string;
  title: string;
  description: string;
  client_id?: number;
  client_name?: string;
  rep_in_codigo: number;
  rep_nome: string;
  created_by_id: string;
  created_by_name: string;
  created_at: string;
  status: 'PENDENTE' | 'CONCLUIDA' | 'CANCELADA';
  completed_at?: string;
  due_date?: string;
  priority: 'BAIXA' | 'MEDIA' | 'ALTA';
}

export interface Ocorrencia {
  id: string;
  ro_number: string;
  requester: string;
  type: string;
  origin: string;
  description: string;
  receipt_date: string;
  registration_date: string;
  company: string;
  process: string;
  sub_process: string;
  responsible: string;
  proceeds: boolean;
  opening_notice: boolean;
  immediate_action_deadline: string | null;
  immediate_action_completed: string | null;
  cause_analysis_deadline: string | null;
  cause_analysis_completed: string | null;
  corrective_action_deadline: string | null;
  corrective_action_completed: string | null;
  created_at?: string;
}

export interface OcorrenciaAcao {
  id: string;
  ocorrencia_id: string;
  description: string;
  responsible: string;
  deadline: string | null;
  completed_at: string | null;
  created_at?: string;
}

export interface VisitReport {
  id: string;
  type: string; // 'Filtro Prensa' default
  solicitante: string;
  data_visita: string;
  created_at: string;
  rep_in_codigo: number;
  
  // Dados do Cliente
  cliente_nome: string;
  cnpj?: string;
  cidade?: string;
  estado?: string;
  transportadora?: string;
  
  // Contatos
  contato_tecnico_nome?: string;
  contato_tecnico_depto?: string;
  contato_tecnico_email?: string;
  contato_tecnico_fone?: string;
  
  contato_comprador_nome?: string;
  contato_comprador_email?: string;
  contato_comprador_fone?: string;
  
  contato_gerente_nome?: string;
  contato_gerente_email?: string;
  contato_gerente_fone?: string;
  
  contato_coordenador_nome?: string;
  contato_coordenador_email?: string;
  contato_coordenador_fone?: string;
  
  contato_engenheiro_nome?: string;
  contato_engenheiro_email?: string;
  contato_engenheiro_fone?: string;

  // Dados do Equipamento
  marca_fabricante?: string;
  material_placas?: string;
  temperatura?: string;
  equipamento?: string;
  dimensoes?: string;
  ph_agua_lavagem?: string;
  qtde_placas?: string;
  ph?: string;
  produto_filtrar?: string;
  tempo_secagem?: string;
  percent_solidos?: string;
  tempo_filtracao?: string;
  tipo_abertura?: string;
  tipo_limpeza?: string;
  tipo_bomba?: string;
  qtde_setores?: string;
  pressao_sopro?: string;
  umidade_torta?: string;
  pressao_filtracao?: string;
  aux_filtracao?: string;

  // Outros
  motivo_substituicao?: string;
  tecido_atual?: string;
  cfm?: string;
  fornecedor_atual?: string;
  vida_util?: string;
  data_ultima_compra?: string;
  valor_pago?: string;
  situacao_lonas?: string;
  previsao_compra?: string;

  observacoes?: string;
  acoes?: string;
  medidas_desenho?: Record<string, string>;
}

export interface ServicePrincipalConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

export type AuthMode = 'manual' | 'servicePrincipal';

export type DataSource = 'mock' | 'powerbi' | 'supabase';
