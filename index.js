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

// Endpoint para buscar dados de receita da Klaviyo
app.get('/klaviyo-revenue', async (req, res) => {
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

// Rota de verificação de saúde do servidor
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Servidor funcionando corretamente' });
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
