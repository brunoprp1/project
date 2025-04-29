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
  addDoc,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Client, Subscription, Revenue } from '../../types/firebase';
import { clientService } from './client.service';
import { subscriptionService } from './subscription.service';

/**
 * Interface para relatório de métricas financeiras
 */
interface FinancialMetricsReport {
  totalClients: number;
  activeClients: number;
  totalRevenue: number;
  convertfyRevenue: number;
  averageTicket: number;
  conversionRate: number;
  roiGeneral: number;
  byPlatform: Record<string, {
    clients: number;
    revenue: number;
  }>;
  byPlan: Record<string, {
    clients: number;
    revenue: number;
  }>;
  monthlyComparison?: {
    currentMonth: {
      revenue: number;
      clients: number;
    };
    previousMonth: {
      revenue: number;
      clients: number;
    };
    percentChange: {
      revenue: number;
      clients: number;
    };
  };
}

/**
 * Classe para cálculo e gerenciamento de métricas de clientes
 */
class ClientMetricsService {
  /**
   * Gera um relatório completo de métricas financeiras
   */
  async generateFinancialMetricsReport(): Promise<FinancialMetricsReport> {
    try {
      // Buscar todos os clientes
      const clients = await clientService.getAllClients();
      
      // Calcular métricas básicas
      const totalClients = clients.length;
      const activeClients = clients.filter(c => c.subscriptionStatus === 'active').length;
      
      // Inicializar contadores
      let totalRevenue = 0;
      let convertfyRevenue = 0;
      
      // Contadores por plataforma
      const byPlatform: Record<string, { clients: number; revenue: number }> = {};
      
      // Contadores por plano
      const byPlan: Record<string, { clients: number; revenue: number }> = {};
      
      // Calcular métricas por cliente
      for (const client of clients) {
        // Somar valores de assinatura para clientes ativos
        if (client.subscriptionStatus === 'active' && client.subscriptionValue) {
          totalRevenue += client.subscriptionValue;
          
          // Calcular receita da Convertfy com base na porcentagem de comissão
          const commissionValue = client.subscriptionValue * (client.commissionPercentage / 100);
          convertfyRevenue += commissionValue;
          
          // Agrupar por plataforma
          const platform = client.platform || 'other';
          if (!byPlatform[platform]) {
            byPlatform[platform] = { clients: 0, revenue: 0 };
          }
          byPlatform[platform].clients++;
          byPlatform[platform].revenue += client.subscriptionValue;
          
          // Agrupar por plano
          const plan = client.plan || 'standard';
          if (!byPlan[plan]) {
            byPlan[plan] = { clients: 0, revenue: 0 };
          }
          byPlan[plan].clients++;
          byPlan[plan].revenue += client.subscriptionValue;
        }
      }
      
      // Calcular métricas derivadas
      const averageTicket = activeClients > 0 ? totalRevenue / activeClients : 0;
      const conversionRate = totalClients > 0 ? (activeClients / totalClients) * 100 : 0;
      const roiGeneral = 0; // Para calcular o ROI precisamos de dados de marketing
      
      return {
        totalClients,
        activeClients,
        totalRevenue,
        convertfyRevenue,
        averageTicket,
        conversionRate,
        roiGeneral,
        byPlatform,
        byPlan
      };
    } catch (error) {
      console.error('Erro ao gerar relatório de métricas financeiras:', error);
      throw error;
    }
  }

  /**
   * Gera o relatório de métricas financeiras comparando com o mês anterior
   */
  async generateMonthlyComparisonReport(): Promise<FinancialMetricsReport> {
    try {
      // Gerar relatório atual
      const currentReport = await this.generateFinancialMetricsReport();
      
      // Buscar dados do mês anterior
      const previousMonthData = await this.getRevenueFromPreviousMonth();
      
      // Adicionar comparação mensal ao relatório
      currentReport.monthlyComparison = {
        currentMonth: {
          revenue: currentReport.totalRevenue,
          clients: currentReport.activeClients
        },
        previousMonth: {
          revenue: previousMonthData.revenue,
          clients: previousMonthData.clients
        },
        percentChange: {
          revenue: this.calculatePercentChange(
            previousMonthData.revenue, 
            currentReport.totalRevenue
          ),
          clients: this.calculatePercentChange(
            previousMonthData.clients, 
            currentReport.activeClients
          )
        }
      };
      
      return currentReport;
    } catch (error) {
      console.error('Erro ao gerar relatório de comparação mensal:', error);
      throw error;
    }
  }

  /**
   * Busca receita do mês anterior
   */
  private async getRevenueFromPreviousMonth(): Promise<{revenue: number; clients: number}> {
    try {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      // Determinar mês e ano anterior
      let previousMonth = currentMonth - 1;
      let previousYear = currentYear;
      
      if (previousMonth < 0) {
        previousMonth = 11; // Dezembro
        previousYear = currentYear - 1;
      }
      
      // Buscar dados de receita do mês anterior
      const revenuesRef = collection(db, 'revenues');
      const q = query(
        revenuesRef,
        where('referenceMonth', '==', previousMonth),
        where('referenceYear', '==', previousYear)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Se não houver dados do mês anterior, retorna zeros
      if (querySnapshot.empty) {
        return { revenue: 0, clients: 0 };
      }
      
      // Somar dados de todas as receitas do mês anterior
      let totalRevenue = 0;
      let totalClients = 0;
      
      querySnapshot.forEach(doc => {
        const revenue = doc.data() as Revenue;
        totalRevenue += revenue.totalRevenue || 0;
        totalClients += 1; // Cada documento representa um cliente
      });
      
      return { revenue: totalRevenue, clients: totalClients };
    } catch (error) {
      console.error('Erro ao buscar receita do mês anterior:', error);
      return { revenue: 0, clients: 0 };
    }
  }

  /**
   * Calcula a variação percentual entre dois valores
   */
  private calculatePercentChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) {
      return newValue > 0 ? 100 : 0;
    }
    
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Gera e armazena as métricas mensais para todos os clientes
   */
  async generateMonthlyRevenues(): Promise<number> {
    try {
      const today = new Date();
      const referenceMonth = today.getMonth();
      const referenceYear = today.getFullYear();
      
      // Buscar todos os clientes ativos
      const clients = await clientService.getFilteredClients({ status: 'active' });
      
      let processedCount = 0;
      const batch = writeBatch(db);
      
      for (const client of clients) {
        try {
          // Criar documento de receita para o mês atual
          const revenueRef = doc(collection(db, 'revenues'));
          
          // Buscar assinaturas do cliente
          const subscriptions = await subscriptionService.getFilteredSubscriptions({
            clientId: client.id,
            status: 'active'
          });
          
          // Calcular receita total do cliente
          const totalRevenue = subscriptions.reduce((sum, sub) => sum + (sub.value || 0), 0);
          
          // Calcular receita da Convertfy (comissão)
          const convertfyRevenue = totalRevenue * (client.commissionPercentage / 100);
          
          // Dados dummy para fontes de receita
          const sourceSplit = {
            email: totalRevenue * 0.6,    // 60% via email
            whatsapp: totalRevenue * 0.3, // 30% via whatsapp
            sms: totalRevenue * 0.1       // 10% via sms
          };
          
          // Métricas dummy
          const metrics = {
            averageTicket: totalRevenue,
            conversionRate: 2.5,
            roiGeneral: 3.2
          };
          
          // Criar documento de receita
          const revenueData: Omit<Revenue, 'id'> = {
            clientId: client.id,
            totalRevenue,
            convertfyRevenue,
            referenceMonth,
            referenceYear,
            source: sourceSplit,
            metrics,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          batch.set(revenueRef, revenueData);
          processedCount++;
          
          // Executar o batch a cada 500 documentos (limite do Firestore)
          if (processedCount % 500 === 0) {
            await batch.commit();
          }
        } catch (error) {
          console.error(`Erro ao processar cliente ${client.id}:`, error);
        }
      }
      
      // Executar o batch final se houver documentos pendentes
      if (processedCount % 500 !== 0) {
        await batch.commit();
      }
      
      return processedCount;
    } catch (error) {
      console.error('Erro ao gerar receitas mensais:', error);
      throw error;
    }
  }

  /**
   * Calcula o MRR (Monthly Recurring Revenue)
   */
  async calculateMRR(): Promise<number> {
    try {
      // Buscar todos os clientes ativos
      const clients = await clientService.getFilteredClients({ status: 'active' });
      
      // Somar valores de assinatura
      let mrr = 0;
      
      for (const client of clients) {
        if (client.subscriptionValue) {
          mrr += client.subscriptionValue;
        }
      }
      
      return mrr;
    } catch (error) {
      console.error('Erro ao calcular MRR:', error);
      throw error;
    }
  }

  /**
   * Calcula a taxa de Churn
   */
  async calculateChurnRate(): Promise<number> {
    try {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      // Determinar mês e ano anterior
      let previousMonth = currentMonth - 1;
      let previousYear = currentYear;
      
      if (previousMonth < 0) {
        previousMonth = 11; // Dezembro
        previousYear = currentYear - 1;
      }
      
      // Buscar clientes que cancelaram no mês atual
      const clientsRef = collection(db, 'clients');
      const q = query(
        clientsRef,
        where('subscriptionStatus', '==', 'inactive'),
        where('updatedAt', '>=', new Date(currentYear, currentMonth, 1)),
        where('updatedAt', '<=', new Date(currentYear, currentMonth + 1, 0))
      );
      
      const cancelledClientsSnapshot = await getDocs(q);
      const cancelledClientsCount = cancelledClientsSnapshot.size;
      
      // Buscar total de clientes no mês anterior
      const qPrevious = query(
        clientsRef,
        where('subscriptionStatus', '==', 'active'),
        where('createdAt', '<=', new Date(previousYear, previousMonth + 1, 0))
      );
      
      const previousClientsSnapshot = await getDocs(qPrevious);
      const previousClientsCount = previousClientsSnapshot.size;
      
      // Calcular taxa de churn
      if (previousClientsCount === 0) {
        return 0;
      }
      
      return (cancelledClientsCount / previousClientsCount) * 100;
    } catch (error) {
      console.error('Erro ao calcular taxa de Churn:', error);
      throw error;
    }
  }

  /**
   * Calcula o LTV (Lifetime Value) médio
   */
  async calculateAverageLTV(): Promise<number> {
    try {
      // Calcular MRR
      const mrr = await this.calculateMRR();
      
      // Calcular Churn
      const churnRate = await this.calculateChurnRate();
      
      // Se não há churn, o LTV seria infinito, então usamos um valor default
      if (churnRate === 0) {
        return mrr * 24; // Assumindo 24 meses como período médio
      }
      
      // LTV = MRR / (Churn Rate / 100)
      const ltv = mrr / (churnRate / 100);
      
      return ltv;
    } catch (error) {
      console.error('Erro ao calcular LTV médio:', error);
      throw error;
    }
  }
}

export const clientMetricsService = new ClientMetricsService();
export default clientMetricsService;
