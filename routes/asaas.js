import axios from 'axios';
import express from 'express';
const router = express.Router();

// Configuração da API da Asaas
const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';

// Token da Asaas - obtendo de variável de ambiente para maior segurança
const ASAAS_API_TOKEN = process.env.ASAAS_API_TOKEN || 'Bearer $aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6Ojk5NmQ5YjgxLTM3NzUtNGUyOS04ODNjLWE5OGIyNTQ3ODYyZTo6JGFhY2hfY2Q5YzMwMmUtZWEwMi00ZDYxLTk3MDUtNzJiMDZjMTkwNzcw';

// Verificação do token (sem expor o token completo)
const tokenPrefix = ASAAS_API_TOKEN.substring(0, 15);
const tokenSuffix = ASAAS_API_TOKEN.substring(ASAAS_API_TOKEN.length - 10);
console.log(`Token Asaas configurado: ${tokenPrefix}...${tokenSuffix}`);

// Rota para testar a conexão
router.get('/test-connection', async (req, res) => {
  try {
    console.log('=== TESTE DE CONEXÃO COM A API ASAAS ===');
    console.log(`URL da API: ${ASAAS_API_URL}`);
    console.log(`Token (primeiros 20 chars): ${ASAAS_API_TOKEN.substring(0, 20)}...`);
    console.log('Headers enviados:', {
      'Authorization': `${ASAAS_API_TOKEN.substring(0, 15)}...${ASAAS_API_TOKEN.substring(ASAAS_API_TOKEN.length - 10)}`,
      'Content-Type': 'application/json'
    });
    
    // Verificar formato do token
    if (!ASAAS_API_TOKEN.startsWith('Bearer $')) {
      console.warn('AVISO: Token pode estar em formato incorreto. Deve começar com "Bearer $"');
    }
    
    const response = await axios.get(`${ASAAS_API_URL}/customers`, {
      headers: {
        'Authorization': ASAAS_API_TOKEN,
        'Content-Type': 'application/json'
      },
      params: { limit: 1 },
      timeout: 10000
    });
    
    console.log('Conexão com a API da Asaas estabelecida com sucesso');
    console.log('Status da resposta:', response.status);
    console.log('=== FIM DO TESTE DE CONEXÃO ===');
    
    res.status(200).json({
      success: true,
      message: 'Conexão com a API da Asaas estabelecida com sucesso',
      data: response.data
    });
  } catch (error) {
    console.error('=== ERRO NA CONEXÃO COM A API ASAAS ===');
    console.error('Mensagem de erro:', error.message);
    
    if (error.response) {
      console.error('Status HTTP:', error.response.status);
      console.error('Dados da resposta:', JSON.stringify(error.response.data, null, 2));
      console.error('Headers da resposta:', JSON.stringify(error.response.headers, null, 2));
      
      // Tratamento específico para erro 401
      if (error.response.status === 401) {
        console.error('ERRO DE AUTENTICAÇÃO: O token da API Asaas é inválido ou expirou.');
        console.error('Verifique se o token está correto e se está ativo no painel da Asaas.');
      }
    } else if (error.request) {
      console.error('Sem resposta do servidor Asaas:', error.request);
    }
    
    console.error('=== FIM DO RELATÓRIO DE ERRO ===');
    
    // Retornar resposta detalhada para o cliente
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.message,
      status: error.response?.status,
      details: error.response?.data || null
    });
  }
});

// Proxy para clientes
router.get('/customers', async (req, res) => {
  try {
    console.log('Buscando clientes na API da Asaas...');
    const response = await axios.get(`${ASAAS_API_URL}/customers`, {
      headers: {
        'Authorization': ASAAS_API_TOKEN,
        'Content-Type': 'application/json'
      },
      params: req.query,
      timeout: 10000
    });

    console.log('Clientes recebidos com sucesso');
    res.json(response.data);
  } catch (error) {
    console.error('Erro ao conectar na Asaas:', error.response?.data || error.message);
    
    res.status(error.response?.status || 500).json({ 
      error: 'Erro ao conectar com a Asaas',
      details: error.response?.data || error.message
    });
  }
});

/**
 * Obter um cliente específico pelo ID
 */
router.get('/customers/:id', async (req, res) => {
  try {
    const customerId = req.params.id;
    console.log(`Buscando cliente com ID: ${customerId}`);

    const response = await axios.get(`${ASAAS_API_URL}/customers/${customerId}`, {
      headers: {
        'Authorization': ASAAS_API_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error(`Erro ao buscar cliente: ${error.response?.data || error.message}`);
    res.status(error.response?.status || 500).json({
      error: 'Erro ao buscar cliente no Asaas',
      details: error.response?.data || error.message
    });
  }
});

/**
 * Endpoint para testar a conexão com a API da Asaas
 * Retorna uma resposta de sucesso com amostra de dados da API 
 * quando a conexão estiver funcionando corretamente
 */
router.get('/test-connection', async (req, res) => {
  try {
    console.log('==========================================');
    console.log('Testando conexão com a API da Asaas...');
    console.log(`URL: ${ASAAS_API_URL}/customers?limit=1`);
    
    // Log de headers (sem expor o token completo)
    console.log('Headers enviados:', {
      'Authorization': `${tokenPrefix}...${tokenSuffix}`,
      'Content-Type': 'application/json'
    });
    
    // Verificações adicionais
    console.log('Ambiente Node.js:', process.version);
    console.log('Método de chamada:', 'GET');
    console.log('Timeout configurado:', '10 segundos');
    
    // Proxy request para a Asaas
    const response = await axios({
      method,
      url,
      headers: {
        'Authorization': ASAAS_API_TOKEN,
        'Content-Type': 'application/json'
      },
      params: req.query,
      data: req.body,
      timeout: 10000,
      validateStatus: status => status < 500 // repassa erros 4xx
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.message,
      details: error.response?.data || null
    });
  }
});

export default router;
