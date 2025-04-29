import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Client } from '../../types/firebase';
import { AsaasCustomer, SyncReport } from '../../types/asaas';
import axios from 'axios';
import { getRefreshToken } from '../firebase/auth';

// API base URL para o proxy do Asaas
const API_BASE_URL = '/api/asaas';

/**
 * Classe para gerenciamento de clientes com integração ao Asaas
 */
class ClientService {
  /**
   * Busca todos os clientes do Firebase
   */
  async getAllClients(): Promise<Client[]> {
    try {
      const clientsRef = collection(db, 'clients');
      const q = query(clientsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Client[];
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      throw error;
    }
  }

  /**
   * Busca um cliente pelo ID
   */
  async getClientById(id: string): Promise<Client | null> {
    try {
      const clientDoc = await getDoc(doc(db, 'clients', id));
      
      if (!clientDoc.exists()) {
        return null;
      }
      
      return { 
        id: clientDoc.id, 
        ...clientDoc.data() 
      } as Client;
    } catch (error) {
      console.error(`Erro ao buscar cliente com ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Busca cliente pelo ID do usuário
   */
  async getClientByUserId(userId: string): Promise<Client | null> {
    try {
      const clientsRef = collection(db, 'clients');
      const q = query(clientsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const doc = querySnapshot.docs[0];
      return { 
        id: doc.id, 
        ...doc.data() 
      } as Client;
    } catch (error) {
      console.error(`Erro ao buscar cliente para o usuário ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Cria um novo cliente no Firebase e opcionalmente no Asaas
   */
  async createClient(clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>, syncWithAsaas: boolean = true): Promise<Client> {
    try {
      // Criar cliente no Firestore
      const clientRef = doc(collection(db, 'clients'));
      
      const newClient: Omit<Client, 'id'> = {
        ...clientData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(clientRef, newClient);
      
      // Sincronizar com Asaas se necessário
      if (syncWithAsaas) {
        try {
          const asaasCustomer = await this.createAsaasCustomer(clientData);
          
          // Atualizar o ID do Asaas no documento do cliente
          await updateDoc(clientRef, {
            asaasId: asaasCustomer.id,
            updatedAt: serverTimestamp()
          });
          
          return {
            id: clientRef.id,
            ...newClient,
            asaasId: asaasCustomer.id
          } as Client;
        } catch (asaasError) {
          console.error('Erro ao criar cliente no Asaas:', asaasError);
          // Continua com o fluxo mesmo sem o Asaas, mas registra o erro
        }
      }
      
      return {
        id: clientRef.id,
        ...newClient
      } as Client;
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      throw error;
    }
  }

  /**
   * Atualiza um cliente existente
   */
  async updateClient(id: string, clientData: Partial<Client>, syncWithAsaas: boolean = true): Promise<Client> {
    try {
      const clientRef = doc(db, 'clients', id);
      const clientDoc = await getDoc(clientRef);
      
      if (!clientDoc.exists()) {
        throw new Error(`Cliente com ID ${id} não encontrado`);
      }
      
      const currentData = clientDoc.data() as Client;
      
      // Preparar dados para atualização
      const updatedData: Partial<Client> = {
        ...clientData,
        updatedAt: serverTimestamp()
      };
      
      // Atualizar no Firestore
      await updateDoc(clientRef, updatedData);
      
      // Sincronizar com Asaas se necessário
      if (syncWithAsaas && currentData.asaasId) {
        try {
          await this.updateAsaasCustomer(currentData.asaasId, clientData);
        } catch (asaasError) {
          console.error(`Erro ao atualizar cliente ${id} no Asaas:`, asaasError);
          // Continua com o fluxo mesmo sem o Asaas, mas registra o erro
        }
      }
      
      // Buscar dados atualizados
      const updatedClientDoc = await getDoc(clientRef);
      
      return {
        id,
        ...updatedClientDoc.data()
      } as Client;
    } catch (error) {
      console.error(`Erro ao atualizar cliente ${id}:`, error);
      throw error;
    }
  }

  /**
   * Remove um cliente
   */
  async deleteClient(id: string): Promise<void> {
    try {
      const clientRef = doc(db, 'clients', id);
      const clientDoc = await getDoc(clientRef);
      
      if (!clientDoc.exists()) {
        throw new Error(`Cliente com ID ${id} não encontrado`);
      }
      
      const clientData = clientDoc.data() as Client;
      
      // Deletar do Firestore
      await deleteDoc(clientRef);
      
      // Não excluímos o cliente do Asaas, apenas desativamos
      if (clientData.asaasId) {
        try {
          await this.updateAsaasCustomer(clientData.asaasId, { subscriptionStatus: 'inactive' });
        } catch (asaasError) {
          console.error(`Erro ao desativar cliente ${id} no Asaas:`, asaasError);
        }
      }
    } catch (error) {
      console.error(`Erro ao deletar cliente ${id}:`, error);
      throw error;
    }
  }

  /**
   * Busca clientes do Asaas
   */
  async getAsaasCustomers(params: { limit?: number; offset?: number; status?: 'ACTIVE' | 'INACTIVE' } = {}): Promise<AsaasCustomer[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/customers`, { params });
      return response.data.data;
    } catch (error) {
      console.error('Erro ao buscar clientes do Asaas:', error);
      throw error;
    }
  }

  /**
   * Cria um cliente no Asaas
   */
  private async createAsaasCustomer(clientData: Partial<Client>): Promise<AsaasCustomer> {
    try {
      // Mapear dados do cliente para o formato do Asaas
      const asaasData = this.mapClientToAsaasCustomer(clientData);
      
      // Enviar para a API do Asaas via proxy
      const response = await axios.post(`${API_BASE_URL}/customers`, asaasData);
      
      return response.data;
    } catch (error) {
      console.error('Erro ao criar cliente no Asaas:', error);
      throw error;
    }
  }

  /**
   * Atualiza um cliente no Asaas
   */
  private async updateAsaasCustomer(asaasId: string, clientData: Partial<Client>): Promise<AsaasCustomer> {
    try {
      // Mapear dados do cliente para o formato do Asaas
      const asaasData = this.mapClientToAsaasCustomer(clientData);
      
      // Enviar para a API do Asaas via proxy
      const response = await axios.put(`${API_BASE_URL}/customers/${asaasId}`, asaasData);
      
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar cliente ${asaasId} no Asaas:`, error);
      throw error;
    }
  }

  /**
   * Mapeia dados do cliente para o formato do Asaas
   */
  private mapClientToAsaasCustomer(clientData: Partial<Client>): Partial<AsaasCustomer> {
    // Conversor para objetos Asaas customer
    return {
      name: clientData.contactName,
      email: clientData.contactEmail,
      phone: clientData.contactPhone,
      mobilePhone: clientData.contactPhone,
      cpfCnpj: clientData.cnpj,
      address: clientData.address,
      personType: 'JURIDICA', // Assumimos que são empresas
      observations: `Plano: ${clientData.plan}. Valor: ${clientData.subscriptionValue}`,
      externalReference: clientData.id || '',
      additionalEmails: '',
      status: clientData.subscriptionStatus === 'active' ? 'ACTIVE' : 'INACTIVE'
    };
  }

  /**
   * Sincroniza clientes do Asaas para o Firestore
   */
  async syncAsaasCustomersToFirestore(): Promise<SyncReport> {
    try {
      // Iniciar relatório de sincronização
      const report: SyncReport = {
        totalProcessed: 0,
        created: 0,
        updated: 0,
        failed: 0,
        errors: [],
        startedAt: new Date(),
        status: 'running'
      };
      
      // Registrar início da sincronização
      const syncReportRef = await addDoc(collection(db, 'sync_reports'), {
        ...report,
        startedAt: serverTimestamp(),
        type: 'asaas_customers'
      });
      
      try {
        // Buscar todos os clientes do Asaas
        let offset = 0;
        const limit = 50;
        let hasMore = true;
        
        while (hasMore) {
          const asaasCustomers = await this.getAsaasCustomers({ 
            limit, 
            offset, 
            status: 'ACTIVE' 
          });
          
          // Processar clientes em lote
          for (const customer of asaasCustomers) {
            report.totalProcessed++;
            
            try {
              // Verificar se o cliente já existe no Firestore
              const clientsRef = collection(db, 'clients');
              const q = query(clientsRef, where('asaasId', '==', customer.id));
              const querySnapshot = await getDocs(q);
              
              if (querySnapshot.empty) {
                // Cliente não existe, criar novo
                const newClientData = this.mapAsaasCustomerToClient(customer);
                
                await this.createClient({
                  ...newClientData,
                  asaasId: customer.id
                }, false); // Não sincronizar de volta com o Asaas
                
                report.created++;
              } else {
                // Cliente existe, atualizar
                const clientDoc = querySnapshot.docs[0];
                const clientData = this.mapAsaasCustomerToClient(customer, true);
                
                await updateDoc(clientDoc.ref, {
                  ...clientData,
                  updatedAt: serverTimestamp()
                });
                
                report.updated++;
              }
            } catch (error) {
              report.failed++;
              report.errors.push({
                email: customer.email,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
              });
            }
          }
          
          // Verificar se há mais clientes para buscar
          hasMore = asaasCustomers.length === limit;
          offset += limit;
        }
        
        // Atualizar relatório de sincronização
        await updateDoc(syncReportRef, {
          ...report,
          endedAt: serverTimestamp(),
          status: 'completed'
        });
        
        return {
          ...report,
          id: syncReportRef.id,
          endedAt: new Date(),
          status: 'completed'
        };
      } catch (error) {
        // Atualizar relatório com erro
        await updateDoc(syncReportRef, {
          ...report,
          endedAt: serverTimestamp(),
          status: 'failed',
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
        
        throw error;
      }
    } catch (error) {
      console.error('Erro ao sincronizar clientes do Asaas:', error);
      throw error;
    }
  }

  /**
   * Mapeia dados do cliente Asaas para o formato do Firestore
   */
  private mapAsaasCustomerToClient(customer: AsaasCustomer, isUpdate: boolean = false): Partial<Client> {
    // Dados básicos que podemos extrair do Asaas
    const clientData: Partial<Client> = {
      contactName: customer.name,
      contactEmail: customer.email,
      contactPhone: customer.phone || customer.mobilePhone,
      cnpj: customer.cpfCnpj,
      address: `${customer.address}, ${customer.addressNumber} ${customer.complement ? '- ' + customer.complement : ''}`,
      subscriptionStatus: customer.status === 'ACTIVE' ? 'active' : 'inactive',
    };
    
    // Se não for uma atualização, incluir campos obrigatórios
    if (!isUpdate) {
      return {
        ...clientData,
        userId: '', // Precisa ser vinculado manualmente
        storeName: customer.company || customer.name,
        storeUrl: '',
        platform: '',
        plan: 'standard', // Plano padrão
        subscriptionValue: 0, // Valor padrão
        dueDate: 10, // Dia de vencimento padrão
        contractStartDate: new Date().toISOString(),
        commissionPercentage: 0,
        settings: {
          notificationEmail: true,
          notificationSystem: true,
          notificationWhatsapp: false
        }
      };
    }
    
    return clientData;
  }

  /**
   * Busca clientes com filtros
   */
  async getFilteredClients(filters: {
    status?: string;
    plan?: string;
    platform?: string;
    search?: string;
  }): Promise<Client[]> {
    try {
      // Buscar todos os clientes inicialmente
      const clientsRef = collection(db, 'clients');
      let clientsQuery = query(clientsRef);
      
      // Aplicar filtros
      if (filters.status) {
        clientsQuery = query(clientsQuery, where('subscriptionStatus', '==', filters.status));
      }
      
      if (filters.plan) {
        clientsQuery = query(clientsQuery, where('plan', '==', filters.plan));
      }
      
      if (filters.platform) {
        clientsQuery = query(clientsQuery, where('platform', '==', filters.platform));
      }
      
      const querySnapshot = await getDocs(clientsQuery);
      let clients = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Client[];
      
      // Filtrar por termo de busca se fornecido
      if (filters.search && filters.search.trim() !== '') {
        const searchTerm = filters.search.toLowerCase();
        clients = clients.filter(client => 
          client.contactName.toLowerCase().includes(searchTerm) ||
          client.contactEmail.toLowerCase().includes(searchTerm) ||
          client.storeName.toLowerCase().includes(searchTerm) ||
          client.storeUrl.toLowerCase().includes(searchTerm)
        );
      }
      
      return clients;
    } catch (error) {
      console.error('Erro ao buscar clientes filtrados:', error);
      throw error;
    }
  }
}

export const clientService = new ClientService();
export default clientService;
