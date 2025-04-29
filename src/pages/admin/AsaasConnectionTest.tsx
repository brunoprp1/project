import React, { useState, ChangeEvent } from 'react';
import axios from 'axios';
import { asaasService } from '../../services/api/asaas';

const AsaasConnectionTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>('');
  const [customEndpoint, setCustomEndpoint] = useState<string>('');

  const testDirectConnection = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      // IMPORTANTE: Nunca faça chamadas diretas para a API da Asaas do front-end
      // Sempre use o proxy local para evitar problemas de CORS
      // Esta função é mantida apenas para demonstrar que chamadas diretas falharão por CORS
      
      console.log('NOTA: Chamadas diretas para a API da Asaas não são recomendadas devido a restrições de CORS.');
      console.log('Usando o proxy local para demonstrar o teste...');
      
      // Sempre use o proxy local para fazer chamadas à API da Asaas
      const response = await axios.get('/api/asaas/test-connection');
      
      setResult({
        status: response.status,
        statusText: response.statusText + ' (via proxy)',
        data: response.data
      });
    } catch (err: any) {
      console.error('Error testing connection:', err);
      setError(
        err.response 
          ? `Error ${err.response.status}: ${err.response.statusText}\n${JSON.stringify(err.response.data, null, 2)}`
          : err.message || 'Unknown error'
      );
    } finally {
      setLoading(false);
    }
  };

  const testProxyConnection = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      console.log('Testing connection through proxy server...');
      const response = await asaasService.testConnection();
      setResult({
        status: 200,
        statusText: 'OK',
        data: response
      });
    } catch (err: any) {
      console.error('Error testing proxy connection:', err);
      setError(
        err.response 
          ? `Error ${err.response.status}: ${err.response.statusText}\n${JSON.stringify(err.response.data, null, 2)}`
          : err.message || 'Unknown error'
      );
    } finally {
      setLoading(false);
    }
  };

  const testMockData = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      console.log('Testing with mock data...');
      // Use the mock data directly from the service
      const mockData = asaasService.getMockCustomers();
      
      setResult({
        status: 200,
        statusText: 'OK (Mock Data)',
        data: mockData
      });
    } catch (err: any) {
      console.error('Error using mock data:', err);
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3">
      <h2 className="text-2xl font-bold mb-4">
        Asaas API Connection Test
      </h2>
      
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <h3 className="text-lg font-semibold mb-4">
          Test Configuration
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Asaas API Token (required for direct API testing)</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded"
            value={token}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setToken(e.target.value)}
            placeholder="Enter your Asaas API token"
          />
          <p className="text-sm text-gray-500 mt-1">Required for direct API testing, not needed for proxy or mock tests</p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Custom Endpoint (optional)</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded"
            value={customEndpoint}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomEndpoint(e.target.value)}
            placeholder="https://www.asaas.com/api/v3/customers"
          />
          <p className="text-sm text-gray-500 mt-1">If empty, will use the default endpoint</p>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4 mb-6">
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          onClick={testDirectConnection}
          disabled={loading || !token}
          title={!token ? 'API token is required for direct connection' : ''}
        >
          Test Direct API Connection
        </button>
        
        <button 
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          onClick={testProxyConnection}
          disabled={loading}
        >
          Test Proxy Connection (Recommended)
        </button>
        
        <button 
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          onClick={testMockData}
          disabled={loading}
        >
          Test Mock Data
        </button>
      </div>
      
      {loading && (
        <div className="flex justify-center my-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-6 whitespace-pre-wrap">
          {error}
        </div>
      )}
      
      {result && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-2">
            Response Status: {result.status} {result.statusText}
          </h3>
          
          <h4 className="text-md font-medium mb-2">
            Response Data:
          </h4>
          
          <div 
            className="bg-gray-100 p-4 rounded overflow-auto max-h-[400px]"
          >
            <pre>{JSON.stringify(result.data, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default AsaasConnectionTest;
