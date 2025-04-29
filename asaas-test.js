import axios from 'axios';

const ASAAS_API_URL = 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_TOKEN = 'Bearer $aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjBhOWU3MmE3LTJjMjktNDIxMC1hNzI0LTlhYzMwZmYyNGI2NDo6JGFhY2hfZGExNmE0MGUtMjA3Zi00ODMyLTkwZmYtMWZiZjA4N2EyNjI1';

async function testAsaas() {
  try {
    const response = await axios.get(`${ASAAS_API_URL}/customers`, {
      headers: {
        Authorization: ASAAS_API_TOKEN,
        'Content-Type': 'application/json'
      },
      params: {
        limit: 1
      },
      timeout: 10000
    });

    console.log('Conexão OK:', response.data);
  } catch (error) {
    console.error('Erro na conexão direta:', error.response?.status, error.response?.data || error.message);
  }
}

testAsaas();
