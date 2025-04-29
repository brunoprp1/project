import axios from 'axios';
import { AsaasCustomerResponse } from '../../types/asaas';

// Configuração do proxy local
// Usando o caminho relativo para o proxy local para evitar problemas de CORS
// Não faça chamadas diretas para api.asaas.com, sempre use este proxy
const API_BASE_URL = '/api/asaas';

// Mock data for testing purposes
const MOCK_CUSTOMERS = [
  {
    id: 'cus_000001',
    name: 'João Silva',
    email: 'joao.silva@example.com',
    phone: '11999998888',
    mobilePhone: '11999998888',
    address: 'Rua das Flores',
    addressNumber: '123',
    complement: 'Apto 101',
    province: 'São Paulo',
    postalCode: '01234-567',
    cpfCnpj: '12345678901',
    personType: 'FISICA',
    status: 'ACTIVE',
    externalReference: '',
    notificationDisabled: false,
    additionalEmails: '',
    municipalInscription: '',
    stateInscription: '',
    observations: '',
    groupName: '',
    company: '',
    dateCreated: '2023-01-01'
  },
  {
    id: 'cus_000002',
    name: 'Maria Oliveira',
    email: 'maria.oliveira@example.com',
    phone: '11888887777',
    mobilePhone: '11888887777',
    address: 'Avenida Paulista',
    addressNumber: '1000',
    complement: 'Sala 200',
    province: 'São Paulo',
    postalCode: '01310-100',
    cpfCnpj: '98765432101',
    personType: 'FISICA',
    status: 'ACTIVE',
    externalReference: '',
    notificationDisabled: false,
    additionalEmails: '',
    municipalInscription: '',
    stateInscription: '',
    observations: '',
    groupName: '',
    company: '',
    dateCreated: '2023-01-02'
  },
  {
    id: 'cus_000003',
    name: 'Empresa ABC Ltda',
    email: 'contato@empresaabc.com.br',
    phone: '1133334444',
    mobilePhone: '11777776666',
    address: 'Rua do Comércio',
    addressNumber: '500',
    complement: '',
    province: 'São Paulo',
    postalCode: '04567-000',
    cpfCnpj: '12345678000190',
    personType: 'JURIDICA',
    status: 'ACTIVE',
    externalReference: '',
    notificationDisabled: false,
    additionalEmails: 'financeiro@empresaabc.com.br',
    municipalInscription: '123456',
    stateInscription: '987654',
    observations: 'Cliente VIP',
    groupName: 'Empresas',
    company: 'Empresa ABC Ltda',
    dateCreated: '2023-01-03'
  },
  {
    id: 'cus_000004',
    name: 'Carlos Mendes',
    email: 'carlos.mendes@example.com',
    phone: '11955554444',
    mobilePhone: '11955554444',
    address: 'Rua Augusta',
    addressNumber: '789',
    complement: 'Casa',
    province: 'São Paulo',
    postalCode: '01305-000',
    cpfCnpj: '45678912301',
    personType: 'FISICA',
    status: 'ACTIVE',
    externalReference: '',
    notificationDisabled: false,
    additionalEmails: '',
    municipalInscription: '',
    stateInscription: '',
    observations: '',
    groupName: '',
    company: '',
    dateCreated: '2023-01-04'
  },
  {
    id: 'cus_000005',
    name: 'Ana Souza',
    email: 'ana.souza@example.com',
    phone: '11922223333',
    mobilePhone: '11922223333',
    address: 'Alameda Santos',
    addressNumber: '456',
    complement: 'Apto 303',
    province: 'São Paulo',
    postalCode: '01419-000',
    cpfCnpj: '78945612301',
    personType: 'FISICA',
    status: 'ACTIVE',
    externalReference: '',
    notificationDisabled: false,
    additionalEmails: '',
    municipalInscription: '',
    stateInscription: '',
    observations: '',
    groupName: '',
    company: '',
    dateCreated: '2023-01-05'
  },
  {
    id: 'cus_000006',
    name: 'Empresa XYZ S.A.',
    email: 'contato@empresaxyz.com.br',
    phone: '1144445555',
    mobilePhone: '11988887777',
    address: 'Avenida Brigadeiro Faria Lima',
    addressNumber: '3000',
    complement: 'Andar 15',
    province: 'São Paulo',
    postalCode: '01452-000',
    cpfCnpj: '98765432000199',
    personType: 'JURIDICA',
    status: 'ACTIVE',
    externalReference: '',
    notificationDisabled: false,
    additionalEmails: 'financeiro@empresaxyz.com.br,cobranca@empresaxyz.com.br',
    municipalInscription: '654321',
    stateInscription: '123789',
    observations: 'Cliente Premium',
    groupName: 'Empresas',
    company: 'Empresa XYZ S.A.',
    dateCreated: '2023-01-06'
  },
  {
    id: 'cus_000007',
    name: 'Roberto Almeida',
    email: 'roberto.almeida@example.com',
    phone: '11933334444',
    mobilePhone: '11933334444',
    address: 'Rua Oscar Freire',
    addressNumber: '1500',
    complement: 'Casa 2',
    province: 'São Paulo',
    postalCode: '01426-000',
    cpfCnpj: '32165498701',
    personType: 'FISICA',
    status: 'ACTIVE',
    externalReference: '',
    notificationDisabled: false,
    additionalEmails: '',
    municipalInscription: '',
    stateInscription: '',
    observations: '',
    groupName: '',
    company: '',
    dateCreated: '2023-01-07'
  },
  {
    id: 'cus_000008',
    name: 'Lucia Ferreira',
    email: 'lucia.ferreira@example.com',
    phone: '11944445555',
    mobilePhone: '11944445555',
    address: 'Rua Haddock Lobo',
    addressNumber: '350',
    complement: 'Apto 501',
    province: 'São Paulo',
    postalCode: '01414-000',
    cpfCnpj: '65432198701',
    personType: 'FISICA',
    status: 'ACTIVE',
    externalReference: '',
    notificationDisabled: false,
    additionalEmails: '',
    municipalInscription: '',
    stateInscription: '',
    observations: '',
    groupName: '',
    company: '',
    dateCreated: '2023-01-08'
  },
  {
    id: 'cus_000009',
    name: 'Empresa 123 Ltda',
    email: 'contato@empresa123.com.br',
    phone: '1155556666',
    mobilePhone: '11999998888',
    address: 'Avenida Paulista',
    addressNumber: '2000',
    complement: 'Sala 1010',
    province: 'São Paulo',
    postalCode: '01310-200',
    cpfCnpj: '12345678000290',
    personType: 'JURIDICA',
    status: 'ACTIVE',
    externalReference: '',
    notificationDisabled: false,
    additionalEmails: 'financeiro@empresa123.com.br',
    municipalInscription: '987654',
    stateInscription: '654321',
    observations: '',
    groupName: 'Empresas',
    company: 'Empresa 123 Ltda',
    dateCreated: '2023-01-09'
  },
  {
    id: 'cus_000010',
    name: 'Pedro Santos',
    email: 'pedro.santos@example.com',
    phone: '11966667777',
    mobilePhone: '11966667777',
    address: 'Rua Consolação',
    addressNumber: '1200',
    complement: 'Apto 1501',
    province: 'São Paulo',
    postalCode: '01301-000',
    cpfCnpj: '98765432109',
    personType: 'FISICA',
    status: 'ACTIVE',
    externalReference: '',
    notificationDisabled: false,
    additionalEmails: '',
    municipalInscription: '',
    stateInscription: '',
    observations: '',
    groupName: '',
    company: '',
    dateCreated: '2023-01-10'
  }
];

/**
 * Service for interacting with Asaas API through the proxy server
 * 
 * IMPORTANTE: Este serviço utiliza um proxy local para fazer chamadas à API da Asaas,
 * evitando problemas de CORS e protegendo o token de API.
 */
export const asaasService = {
  /**
   * Fetch customers from Asaas with pagination
   * @param limit Number of records to fetch (default: 100)
   * @param offset Pagination offset (default: 0)
   * @param status Filter by status (default: 'ACTIVE')
   */
  getCustomers: async (limit = 100, offset = 0, status = 'ACTIVE'): Promise<AsaasCustomerResponse> => {
    try {
      console.log(`Fetching customers with limit=${limit}, offset=${offset}, status=${status}`);
      console.log(`Using proxy endpoint: ${API_BASE_URL}/customers`);
      
      // Fazer a chamada para o proxy em vez da API diretamente
      const response = await axios.get(`${API_BASE_URL}/customers`, {
        params: {
          limit,
          offset,
          status
        }
      });
      
      console.log(`Received ${response.data.data?.length || 0} customers`);
      console.log(`Total customers: ${response.data.totalCount || 0}`);
      console.log(`Has more: ${response.data.hasMore || false}`);
      
      return response.data;
    } catch (error: any) {
      console.error('Error fetching customers from Asaas:', error);
      throw error;
    }
  },

  /**
   * Fetch all customers from Asaas by handling pagination automatically
   * @param status Filter by status (default: 'ACTIVE')
   */
  getAllCustomers: async (status = 'ACTIVE') => {
    try {
      console.log('Fetching all customers from Asaas API');
      
      let allCustomers: Array<any> = [];
      let hasMore = true;
      let offset = 0;
      const limit = 100;
      
      console.log('Starting pagination process...');

      while (hasMore) {
        console.log(`Fetching page with offset=${offset}, limit=${limit}`);
        const response = await asaasService.getCustomers(limit, offset, status);
        
        if (response.data && Array.isArray(response.data)) {
          allCustomers = [...allCustomers, ...response.data];
          console.log(`Received ${response.data.length} customers in this page`);
        } else {
          console.warn('Unexpected response format, data is not an array:', response);
        }
        
        console.log(`Total customers fetched so far: ${allCustomers.length}`);
        
        hasMore = !!response.hasMore;
        offset += limit;
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      console.log(`Finished fetching all customers. Total: ${allCustomers.length}`);
      return allCustomers;
    } catch (error: any) {
      console.error('Error fetching all customers from Asaas:', error);
      throw error;
    }
  },

  /**
   * Test connection to Asaas API through the proxy server
   * This is the recommended way to test connection to avoid CORS issues
   */
  testConnection: async () => {
    try {
      console.log('Testando conexão com a API da Asaas via proxy...');
      console.log(`Endpoint: ${API_BASE_URL}/test-connection`);
      
      // Fazendo a chamada para o endpoint de teste do proxy
      const response = await axios.get(`${API_BASE_URL}/test-connection`, {
        // Aumentando o timeout para garantir que haja tempo suficiente
        timeout: 10000
      });
      
      console.log('Resultado do teste de conexão:', {
        status: response.status,
        success: response.data?.success,
        message: response.data?.message
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Erro ao testar conexão com a API da Asaas:');
      if (error.response) {
        // Erro com resposta do servidor
        console.error(`Status: ${error.response.status}`);
        console.error('Resposta:', error.response.data);
      } else if (error.request) {
        // Erro sem resposta (problema de conexão)
        console.error('Sem resposta do servidor. Verifique se o servidor está rodando.');
      } else {
        // Erro genérico
        console.error('Erro:', error.message);
      }
      throw error;
    }
  },
  
  /**
   * Get mock customer data for testing
   * This is only for development and should not be used in production
   */
  getMockCustomers: () => {
    return {
      data: MOCK_CUSTOMERS,
      totalCount: MOCK_CUSTOMERS.length,
      hasMore: false
    };
  }
};
