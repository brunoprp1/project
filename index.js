require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsing de JSON
app.use(express.json());

// Configuração do CORS - Permitindo requisições dos domínios especificados
const corsOptions = {
  origin: ['https://maio-convertfy-production.up.railway.app', 'http://localhost:5173'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Prefixos para as rotas
const API_PREFIX = '/api-proxy';
const KLAVIYO_PREFIX = `${API_PREFIX}/klaviyo`;
const ASAAS_PREFIX = `${API_PREFIX}/asaas`;

// URLs base das APIs
const KLAVIYO_API_URL_V2 = 'https://a.klaviyo.com/api/v2';
const KLAVIYO_API_URL_V3 = 'https://a.klaviyo.com/api/metrics';
const ASAAS_API_URL = 'https://sandbox.asaas.com/api/v3';

// Endpoint para buscar dados de receita da Klaviyo
app.get(`${KLAVIYO_PREFIX}/revenue`, async (req, res) => {
  try {
    const { start_date, end_date, api_key, public_key } = req.query;
    
    // Validação dos parâmetros
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Os parâmetros start_date e end_date são obrigatórios' });
    }

    if (!api_key) {
      return res.status(400).json({ error: 'O parâmetro api_key (chave privada) é obrigatório' });
    }

    // Verificar qual versão da API usar (v2 ou v3)
    // Tentaremos primeiro a API v3 (mais recente), e se falhar, tentaremos a v2
    try {
      // Tentativa com a API v3
      const klaviyoUrl = 'https://a.klaviyo.com/api/metrics/timeline';
      
      // Headers para a API v3
      const headers = {
        'Accept': 'application/json',
        'Authorization': `Klaviyo-API-Key ${api_key}`,
        'revision': '2023-02-22'
      };

      // Parâmetros para a API v3
      const params = {
        'filter': `equals(metric.id,"ordered_product")`,
        'page[size]': 100,
        'sort': '-datetime',
        'additional-fields[metric-aggregate]': 'value',
        'filter-by': `greater-or-equal(datetime,"${start_date}"),less-or-equal(datetime,"${end_date}")`
      };

      // Fazendo a requisição para a API v3 da Klaviyo
      const response = await axios.get(klaviyoUrl, { 
        headers,
        params
      });
      
      // Retornando os dados para o cliente
      return res.json(response.data);
    } catch (v3Error) {
      console.log('Erro na API v3, tentando API v2:', v3Error.message);
      
      // Se a API v3 falhar, tentamos a v2
      const klaviyoUrl = 'https://a.klaviyo.com/api/v2/metrics/timeline';
      
      // Parâmetros para a API v2
      const params = {
        api_key,
        start_date,
        end_date,
        metric_id: 'ordered_product',
        count: 100,
        unit: 'day',
        measurement: 'revenue'
      };

      // Fazendo a requisição para a API v2 da Klaviyo
      const response = await axios.get(klaviyoUrl, { params });
      
      // Retornando os dados para o cliente
      return res.json(response.data);
    }
  } catch (error) {
    console.error('Erro ao buscar dados da Klaviyo:', error.message);
    
    // Retornando o erro para o cliente de forma mais detalhada
    if (error.response) {
      // A requisição foi feita e o servidor respondeu com um status fora do range 2xx
      return res.status(error.response.status).json({
        error: 'Erro na API da Klaviyo',
        details: error.response.data
      });
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      return res.status(503).json({
        error: 'Sem resposta da API da Klaviyo',
        details: 'A requisição foi feita, mas não houve resposta do servidor'
      });
    } else {
      // Algo aconteceu na configuração da requisição que causou um erro
      return res.status(500).json({
        error: 'Erro ao configurar a requisição',
        details: error.message
      });
    }
  }
});

// Endpoints para a API do Asaas

// Endpoint para buscar pagamentos do Asaas
app.get(`${ASAAS_PREFIX}/payments`, async (req, res) => {
  try {
    const { startDueDate, endDueDate } = req.query;
    const apiKey = req.headers['access-token'] || req.query.access_token;
    
    // Validação dos parâmetros
    if (!apiKey) {
      return res.status(400).json({ error: 'O header access-token ou o parâmetro access_token é obrigatório' });
    }

    // Construir a URL com os parâmetros de consulta
    let url = `${ASAAS_API_URL}/payments`;
    const params = new URLSearchParams();
    
    if (startDueDate) params.append('startDueDate', startDueDate);
    if (endDueDate) params.append('endDueDate', endDueDate);
    
    // Adicionar outros parâmetros de consulta que foram passados
    for (const [key, value] of Object.entries(req.query)) {
      if (key !== 'access_token' && key !== 'startDueDate' && key !== 'endDueDate') {
        params.append(key, value);
      }
    }
    
    // Adicionar os parâmetros à URL se houver algum
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    // Fazendo a requisição para a API do Asaas
    const response = await axios.get(url, {
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    // Retornando os dados para o cliente
    return res.json(response.data);
  } catch (error) {
    console.error('Erro ao buscar dados do Asaas:', error.message);
    
    // Retornando o erro para o cliente de forma mais detalhada
    if (error.response) {
      // A requisição foi feita e o servidor respondeu com um status fora do range 2xx
      return res.status(error.response.status).json({
        error: 'Erro na API do Asaas',
        details: error.response.data
      });
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      return res.status(503).json({
        error: 'Sem resposta da API do Asaas',
        details: 'A requisição foi feita, mas não houve resposta do servidor'
      });
    } else {
      // Algo aconteceu na configuração da requisição que causou um erro
      return res.status(500).json({
        error: 'Erro ao configurar a requisição',
        details: error.message
      });
    }
  }
});

// Endpoint para buscar clientes do Asaas
app.get(`${ASAAS_PREFIX}/customers`, async (req, res) => {
  try {
    const apiKey = req.headers['access-token'] || req.query.access_token;
    
    // Validação dos parâmetros
    if (!apiKey) {
      return res.status(400).json({ error: 'O header access-token ou o parâmetro access_token é obrigatório' });
    }

    // Construir a URL com os parâmetros de consulta
    let url = `${ASAAS_API_URL}/customers`;
    const params = new URLSearchParams();
    
    // Adicionar parâmetros de consulta que foram passados
    for (const [key, value] of Object.entries(req.query)) {
      if (key !== 'access_token') {
        params.append(key, value);
      }
    }
    
    // Adicionar os parâmetros à URL se houver algum
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    // Fazendo a requisição para a API do Asaas
    const response = await axios.get(url, {
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    // Retornando os dados para o cliente
    return res.json(response.data);
  } catch (error) {
    console.error('Erro ao buscar clientes do Asaas:', error.message);
    
    // Retornando o erro para o cliente de forma mais detalhada
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'Erro na API do Asaas',
        details: error.response.data
      });
    } else if (error.request) {
      return res.status(503).json({
        error: 'Sem resposta da API do Asaas',
        details: 'A requisição foi feita, mas não houve resposta do servidor'
      });
    } else {
      return res.status(500).json({
        error: 'Erro ao configurar a requisição',
        details: error.message
      });
    }
  }
});

// Endpoint genérico para qualquer rota da API do Asaas
app.all(`${ASAAS_PREFIX}/*`, async (req, res) => {
  try {
    const apiKey = req.headers['access-token'] || req.query.access_token;
    
    // Validação dos parâmetros
    if (!apiKey) {
      return res.status(400).json({ error: 'O header access-token ou o parâmetro access_token é obrigatório' });
    }

    // Extrair o caminho da API do Asaas da URL
    const path = req.path.replace(`${ASAAS_PREFIX}`, '');
    
    // Construir a URL com os parâmetros de consulta
    let url = `${ASAAS_API_URL}${path}`;
    const params = new URLSearchParams();
    
    // Adicionar parâmetros de consulta que foram passados
    for (const [key, value] of Object.entries(req.query)) {
      if (key !== 'access_token') {
        params.append(key, value);
      }
    }
    
    // Adicionar os parâmetros à URL se houver algum
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    // Configurar a requisição para a API do Asaas
    const config = {
      method: req.method,
      url,
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    };
    
    // Adicionar corpo da requisição se for POST, PUT ou PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      config.data = req.body;
    }

    // Fazendo a requisição para a API do Asaas
    const response = await axios(config);
    
    // Retornando os dados para o cliente
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`Erro ao acessar ${req.method} ${req.path}:`, error.message);
    
    // Retornando o erro para o cliente de forma mais detalhada
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'Erro na API do Asaas',
        details: error.response.data
      });
    } else if (error.request) {
      return res.status(503).json({
        error: 'Sem resposta da API do Asaas',
        details: 'A requisição foi feita, mas não houve resposta do servidor'
      });
    } else {
      return res.status(500).json({
        error: 'Erro ao configurar a requisição',
        details: error.message
      });
    }
  }
});

// Rota de verificação de saúde do servidor
app.get(`${API_PREFIX}/health`, (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Servidor funcionando corretamente' });
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
