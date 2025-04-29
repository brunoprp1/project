import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { clientService } from '../../services/clients/client.service';
import { Client } from '../../types/firebase';

const ClientsManager: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    plan: '',
    platform: '',
  });
  
  const { isAdmin } = useAuthContext();
  const navigate = useNavigate();
  
  useEffect(() => {
    loadClients();
  }, []);
  
  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let fetchedClients: Client[];
      
      if (Object.values(filters).some(value => value !== '') || searchTerm !== '') {
        fetchedClients = await clientService.getFilteredClients({
          ...filters,
          search: searchTerm,
        });
      } else {
        fetchedClients = await clientService.getAllClients();
      }
      
      setClients(fetchedClients);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
      setError('Falha ao carregar a lista de clientes. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadClients();
  };
  
  const handleResetFilters = () => {
    setFilters({
      status: '',
      plan: '',
      platform: '',
    });
    setSearchTerm('');
    // Recarregar clientes sem filtros
    loadClients();
  };
  
  const handleAsaasSync = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await clientService.syncAsaasCustomersToFirestore();
      
      // Recarregar clientes após sincronização
      await loadClients();
      
      alert('Sincronização com Asaas concluída com sucesso!');
    } catch (err) {
      console.error('Erro ao sincronizar com Asaas:', err);
      setError('Falha ao sincronizar com Asaas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewClient = (id: string) => {
    navigate(`/admin/clients/${id}`);
  };
  
  const handleEditClient = (id: string) => {
    navigate(`/admin/clients/${id}/edit`);
  };
  
  // Renderização de status com cores
  const renderStatus = (status: string) => {
    let bgColor = 'bg-gray-200';
    let textColor = 'text-gray-700';
    
    if (status === 'active') {
      bgColor = 'bg-green-100';
      textColor = 'text-green-800';
    } else if (status === 'inactive' || status === 'cancelled') {
      bgColor = 'bg-red-100';
      textColor = 'text-red-800';
    } else if (status === 'pending') {
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-800';
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {status}
      </span>
    );
  };
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Clientes</h1>
        
        <div className="flex space-x-3">
          {isAdmin && (
            <button
              onClick={handleAsaasSync}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Sincronizar com Asaas
            </button>
          )}
          
          <button
            onClick={() => navigate('/admin/clients/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Novo Cliente
          </button>
        </div>
      </div>
      
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Nome, e-mail ou loja..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="w-[200px]">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="pending">Pendente</option>
            </select>
          </div>
          
          <div className="w-[200px]">
            <label htmlFor="plan" className="block text-sm font-medium text-gray-700 mb-1">
              Plano
            </label>
            <select
              id="plan"
              name="plan"
              value={filters.plan}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="partner">Partner</option>
            </select>
          </div>
          
          <div className="w-[200px]">
            <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-1">
              Plataforma
            </label>
            <select
              id="platform"
              name="platform"
              value={filters.platform}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              <option value="shopify">Shopify</option>
              <option value="vtex">VTEX</option>
              <option value="woocommerce">WooCommerce</option>
            </select>
          </div>
          
          <div className="flex items-end space-x-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Filtrar
            </button>
            
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Limpar
            </button>
          </div>
        </form>
      </div>
      
      {/* Lista de clientes */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Carregando clientes...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600">Nenhum cliente encontrado.</p>
          {(Object.values(filters).some(value => value !== '') || searchTerm !== '') && (
            <button
              onClick={handleResetFilters}
              className="mt-2 text-blue-600 hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empresa
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contato
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plano / Valor
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plataforma
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{client.contactName}</div>
                    <div className="text-sm text-gray-500">{client.contactEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{client.contactName}</div>
                    <div className="text-sm text-gray-500">{client.contactEmail}</div>
                    <div className="text-sm text-gray-500">{client.contactPhone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{client.plan}</div>
                    <div className="text-sm text-gray-500">
                      {client.plan === 'premium' ? 'R$ 997,00' : client.plan === 'partner' ? 'R$ 497,00' : 'R$ 297,00'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">-</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderStatus(client.subscriptionStatus)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleViewClient(client.id!)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => handleEditClient(client.id!)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ClientsManager;
