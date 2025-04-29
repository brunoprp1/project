// Types for Asaas API integration

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  mobilePhone: string;
  address: string;
  addressNumber: string;
  complement: string;
  province: string;
  postalCode: string;
  cpfCnpj: string;
  personType: 'FISICA' | 'JURIDICA';
  status: 'ACTIVE' | 'INACTIVE';
  externalReference: string;
  notificationDisabled: boolean;
  additionalEmails: string;
  municipalInscription: string;
  stateInscription: string;
  observations: string;
  groupName: string;
  company: string;
  dateCreated: string;
}

export interface AsaasCustomerResponse {
  data: AsaasCustomer[];
  totalCount: number;
  hasMore: boolean;
  limit: number;
  offset: number;
}

export interface SyncReport {
  id?: string;
  totalProcessed: number;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ email: string; error: string; }>;
  startedAt: Date;
  endedAt?: Date;
  status: 'running' | 'completed' | 'failed';
}

export interface User {
  id?: string; // ID gerado pelo Firebase
  name: string;
  email: string;
  phone: string;
  password: string; // Senha criptografada (bcrypt)
  asaasId: string;
  importedFromAsaas: boolean;
  role: 'admin' | 'client';
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  firstLogin?: boolean;
}

export interface Client {
  id?: string;
  address: string;
  cnpj: string;
  commissionPercentage: number;
  contactEmail: string;
  contactName: string;
  contactPhone: string;
  contractStartDate: string; // formato ISO ou UTC
  createdAt: Date;
  dueDate: number;
  plan: string;
  platform: string;
  settings: {
    notificationEmail: boolean;
    notificationSystem: boolean;
    notificationWhatsapp: boolean;
  };
  storeName: string;
  storeUrl: string;
  subscriptionStatus: string;
  subscriptionValue: number;
  updatedAt: Date;
  userId: string; // ID do usuário vinculado
}
