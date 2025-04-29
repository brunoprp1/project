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
import { Subscription, Client } from '../../types/firebase';
import axios from 'axios';
import { logActivity } from '../firebase/auth';

// API base URL para o proxy do Asaas
const API_BASE_URL = '/api/asaas';

/**
 * Interface para comunicação com a API de assinaturas do Asaas
 */
interface AsaasSubscription {
  id: string;
  customer: string;
  value: number;
  nextDueDate: string;
  billingType: string;
  cycle: string;
  description: string;
  status: string;
  externalReference: string;
}

/**
 * Interface para filtragem de assinaturas
 */
interface SubscriptionFilters {
  clientId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Classe para gerenciamento de assinaturas e pagamentos recorrentes
 */
class SubscriptionService {
  /**
   * Busca todas as assinaturas
   */
  async getAllSubscriptions(): Promise<Subscription[]> {
    try {
      const subscriptionsRef = collection(db, 'subscriptions');
      const q = query(subscriptionsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Subscription[];
    } catch (error) {
      console.error('Erro ao buscar assinaturas:', error);
      throw error;
    }
  }

  /**
   * Busca assinaturas por cliente
   */
  async getSubscriptionsByClient(clientId: string): Promise<Subscription[]> {
    try {
      const subscriptionsRef = collection(db, 'subscriptions');
      const q = query(
        subscriptionsRef, 
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Subscription[];
    } catch (error) {
      console.error(`Erro ao buscar assinaturas para o cliente ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Busca uma assinatura pelo ID
   */
  async getSubscriptionById(id: string): Promise<Subscription | null> {
    try {
      const subscriptionDoc = await getDoc(doc(db, 'subscriptions', id));
      
      if (!subscriptionDoc.exists()) {
        return null;
      }
      
      return { 
        id: subscriptionDoc.id, 
        ...subscriptionDoc.data() 
      } as Subscription;
    } catch (error) {
      console.error(`Erro ao buscar assinatura com ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Cria uma nova assinatura
   */
  async createSubscription(subscriptionData: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription> {
    try {
      // Criar assinatura no Firestore
      const subscriptionRef = doc(collection(db, 'subscriptions'));
      
      const newSubscription: Omit<Subscription, 'id'> = {
        ...subscriptionData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(subscriptionRef, newSubscription);
      
      // Se tiver ID do Asaas do cliente, criar assinatura no Asaas
      if (subscriptionData.asaasId) {
        try {
          // Buscar cliente para obter asaasId
          const clientDoc = await getDoc(doc(db, 'clients', subscriptionData.clientId));
          
          if (clientDoc.exists()) {
            const clientData = clientDoc.data() as Client;
            
            if (clientData.asaasId) {
              const asaasSubscription = await this.createAsaasSubscription(subscriptionData, clientData.asaasId);
              
              // Atualizar o ID da assinatura do Asaas no documento
              await updateDoc(subscriptionRef, {
                asaasId: asaasSubscription.id,
                updatedAt: serverTimestamp()
              });
            }
          }
        } catch (asaasError) {
          console.error('Erro ao criar assinatura no Asaas:', asaasError);
          // Continua com o fluxo mesmo sem o Asaas, mas registra o erro
        }
      }
      
      // Registrar atividade
      await logActivity({
        type: 'subscription_updated',
        description: `Nova assinatura criada para cliente ${subscriptionData.clientId}`,
        userId: 'system', // Substituir pelo ID do usuário que está fazendo a ação
        clientId: subscriptionData.clientId,
        metadata: {
          subscriptionId: subscriptionRef.id,
          value: subscriptionData.value,
          status: subscriptionData.status
        }
      });
      
      return {
        id: subscriptionRef.id,
        ...newSubscription
      } as Subscription;
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      throw error;
    }
  }

  /**
   * Atualiza uma assinatura existente
   */
  async updateSubscription(id: string, subscriptionData: Partial<Subscription>): Promise<Subscription> {
    try {
      const subscriptionRef = doc(db, 'subscriptions', id);
      const subscriptionDoc = await getDoc(subscriptionRef);
      
      if (!subscriptionDoc.exists()) {
        throw new Error(`Assinatura com ID ${id} não encontrada`);
      }
      
      const currentData = subscriptionDoc.data() as Subscription;
      
      // Preparar dados para atualização
      const updatedData: Partial<Subscription> = {
        ...subscriptionData,
        updatedAt: serverTimestamp()
      };
      
      // Atualizar no Firestore
      await updateDoc(subscriptionRef, updatedData);
      
      // Atualizar no Asaas se tiver ID
      if (currentData.asaasId) {
        try {
          await this.updateAsaasSubscription(currentData.asaasId, subscriptionData);
        } catch (asaasError) {
          console.error(`Erro ao atualizar assinatura ${id} no Asaas:`, asaasError);
        }
      }
      
      // Registrar atividade
      await logActivity({
        type: 'subscription_updated',
        description: `Assinatura atualizada para cliente ${currentData.clientId}`,
        userId: 'system', // Substituir pelo ID do usuário que está fazendo a ação
        clientId: currentData.clientId,
        metadata: {
          subscriptionId: id,
          changes: subscriptionData
        }
      });
      
      // Buscar dados atualizados
      const updatedSubscriptionDoc = await getDoc(subscriptionRef);
      
      return {
        id,
        ...updatedSubscriptionDoc.data()
      } as Subscription;
    } catch (error) {
      console.error(`Erro ao atualizar assinatura ${id}:`, error);
      throw error;
    }
  }

  /**
   * Cancela uma assinatura
   */
  async cancelSubscription(id: string, reason: string): Promise<Subscription> {
    try {
      const subscriptionRef = doc(db, 'subscriptions', id);
      const subscriptionDoc = await getDoc(subscriptionRef);
      
      if (!subscriptionDoc.exists()) {
        throw new Error(`Assinatura com ID ${id} não encontrada`);
      }
      
      const currentData = subscriptionDoc.data() as Subscription;
      
      // Atualizar status para cancelada
      await updateDoc(subscriptionRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
        cancellationReason: reason
      });
      
      // Cancelar no Asaas se tiver ID
      if (currentData.asaasId) {
        try {
          await this.cancelAsaasSubscription(currentData.asaasId, reason);
        } catch (asaasError) {
          console.error(`Erro ao cancelar assinatura ${id} no Asaas:`, asaasError);
        }
      }
      
      // Registrar atividade
      await logActivity({
        type: 'subscription_updated',
        description: `Assinatura cancelada para cliente ${currentData.clientId}`,
        userId: 'system', // Substituir pelo ID do usuário que está fazendo a ação
        clientId: currentData.clientId,
        metadata: {
          subscriptionId: id,
          reason: reason
        }
      });
      
      // Buscar dados atualizados
      const updatedSubscriptionDoc = await getDoc(subscriptionRef);
      
      return {
        id,
        ...updatedSubscriptionDoc.data()
      } as Subscription;
    } catch (error) {
      console.error(`Erro ao cancelar assinatura ${id}:`, error);
      throw error;
    }
  }

  /**
   * Busca assinaturas com filtros
   */
  async getFilteredSubscriptions(filters: SubscriptionFilters): Promise<Subscription[]> {
    try {
      const subscriptionsRef = collection(db, 'subscriptions');
      let q = query(subscriptionsRef);
      
      // Aplicar filtros
      if (filters.clientId) {
        q = query(q, where('clientId', '==', filters.clientId));
      }
      
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      
      // Note: Para filtros de data precisamos fazer pós-processamento
      
      const querySnapshot = await getDocs(q);
      let subscriptions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Subscription[];
      
      // Filtrar por data se necessário
      if (filters.startDate || filters.endDate) {
        subscriptions = subscriptions.filter(subscription => {
          const nextPaymentTimestamp = subscription.nextPaymentDate as unknown as Timestamp;
          const nextPaymentDate = nextPaymentTimestamp?.toDate?.() || new Date();
          
          if (filters.startDate && filters.endDate) {
            return nextPaymentDate >= filters.startDate && nextPaymentDate <= filters.endDate;
          } else if (filters.startDate) {
            return nextPaymentDate >= filters.startDate;
          } else if (filters.endDate) {
            return nextPaymentDate <= filters.endDate;
          }
          
          return true;
        });
      }
      
      return subscriptions;
    } catch (error) {
      console.error('Erro ao buscar assinaturas filtradas:', error);
      throw error;
    }
  }
  
  /**
   * Cria uma assinatura no Asaas
   */
  private async createAsaasSubscription(
    subscriptionData: Partial<Subscription>,
    customerAsaasId: string
  ): Promise<AsaasSubscription> {
    try {
      const dueDate = subscriptionData.dueDate || 10;
      
      // Determinar próxima data de vencimento
      const today = new Date();
      let nextDueDate = new Date(today.getFullYear(), today.getMonth(), dueDate);
      
      // Se a data já passou no mês atual, usa o próximo mês
      if (nextDueDate.getTime() < today.getTime()) {
        nextDueDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDate);
      }
      
      // Formatação de data para a API Asaas: YYYY-MM-DD
      const formattedNextDueDate = nextDueDate.toISOString().split('T')[0];
      
      const asaasSubscriptionData = {
        customer: customerAsaasId,
        billingType: 'BOLETO', // Pode ser parametrizado
        value: subscriptionData.value,
        nextDueDate: formattedNextDueDate,
        cycle: 'MONTHLY', // Pode ser parametrizado
        description: `Assinatura Convertfy - Plano ${subscriptionData.planType}`,
        externalReference: subscriptionData.id || ''
      };
      
      const response = await axios.post(`${API_BASE_URL}/subscriptions`, asaasSubscriptionData);
      
      return response.data;
    } catch (error) {
      console.error('Erro ao criar assinatura no Asaas:', error);
      throw error;
    }
  }
  
  /**
   * Atualiza uma assinatura no Asaas
   */
  private async updateAsaasSubscription(
    asaasId: string,
    subscriptionData: Partial<Subscription>
  ): Promise<AsaasSubscription> {
    try {
      const asaasSubscriptionData: any = {};
      
      // Mapear apenas os campos que precisam ser atualizados
      if (subscriptionData.value !== undefined) {
        asaasSubscriptionData.value = subscriptionData.value;
      }
      
      if (subscriptionData.dueDate !== undefined) {
        // Calcular próxima data de vencimento com base no dia informado
        const today = new Date();
        let nextDueDate = new Date(today.getFullYear(), today.getMonth(), subscriptionData.dueDate);
        
        // Se a data já passou no mês atual, usa o próximo mês
        if (nextDueDate.getTime() < today.getTime()) {
          nextDueDate = new Date(today.getFullYear(), today.getMonth() + 1, subscriptionData.dueDate);
        }
        
        // Formatação de data para a API Asaas: YYYY-MM-DD
        asaasSubscriptionData.nextDueDate = nextDueDate.toISOString().split('T')[0];
      }
      
      if (subscriptionData.planType !== undefined) {
        asaasSubscriptionData.description = `Assinatura Convertfy - Plano ${subscriptionData.planType}`;
      }
      
      // Não enviar requisição se não houver dados para atualizar
      if (Object.keys(asaasSubscriptionData).length === 0) {
        throw new Error('Nenhum dado válido para atualização da assinatura no Asaas');
      }
      
      const response = await axios.put(`${API_BASE_URL}/subscriptions/${asaasId}`, asaasSubscriptionData);
      
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar assinatura ${asaasId} no Asaas:`, error);
      throw error;
    }
  }
  
  /**
   * Cancela uma assinatura no Asaas
   */
  private async cancelAsaasSubscription(asaasId: string, reason: string): Promise<void> {
    try {
      await axios.post(`${API_BASE_URL}/subscriptions/${asaasId}/cancel`, {
        description: reason || 'Cancelado pelo sistema'
      });
    } catch (error) {
      console.error(`Erro ao cancelar assinatura ${asaasId} no Asaas:`, error);
      throw error;
    }
  }
  
  /**
   * Sincroniza status de pagamentos do Asaas
   */
  async syncPaymentStatus(): Promise<number> {
    try {
      let updatedCount = 0;
      
      // Buscar assinaturas ativas
      const subscriptionsRef = collection(db, 'subscriptions');
      const q = query(subscriptionsRef, where('status', '==', 'active'));
      const querySnapshot = await getDocs(q);
      
      const subscriptions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Subscription[];
      
      // Processar cada assinatura
      for (const subscription of subscriptions) {
        if (subscription.asaasId) {
          try {
            // Buscar status da assinatura no Asaas
            const response = await axios.get(`${API_BASE_URL}/subscriptions/${subscription.asaasId}`);
            const asaasSubscription = response.data;
            
            // Verificar se o status mudou
            let statusChanged = false;
            let statusUpdate: Partial<Subscription> = {};
            
            if (asaasSubscription.status === 'INACTIVE' && subscription.status !== 'cancelled') {
              statusUpdate.status = 'cancelled';
              statusChanged = true;
            } else if (asaasSubscription.status === 'ACTIVE' && subscription.status !== 'active') {
              statusUpdate.status = 'active';
              statusChanged = true;
            }
            
            // Atualizar próxima data de pagamento
            if (asaasSubscription.nextDueDate) {
              const nextDueDate = new Date(asaasSubscription.nextDueDate);
              statusUpdate.nextPaymentDate = Timestamp.fromDate(nextDueDate);
              statusChanged = true;
            }
            
            // Atualizar no Firestore se houve mudanças
            if (statusChanged) {
              await updateDoc(doc(db, 'subscriptions', subscription.id), {
                ...statusUpdate,
                updatedAt: serverTimestamp()
              });
              
              updatedCount++;
            }
          } catch (error) {
            console.error(`Erro ao sincronizar status da assinatura ${subscription.id}:`, error);
          }
        }
      }
      
      return updatedCount;
    } catch (error) {
      console.error('Erro ao sincronizar status de pagamentos:', error);
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
