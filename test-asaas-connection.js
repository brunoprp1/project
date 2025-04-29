import axios from 'axios';

// Asaas API token
const ASAAS_API_TOKEN = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjA4NmI2NmZhLWMwYmMtNDViYi04YWFmLWZiNjEyYTAwZmYyMDo6JGFhY2hfYWI2NDg5NDgtMDhkNy00YWIwLWE2MTUtOWM3YmI0ZmMxMGVj';
const ASAAS_API_URL = 'https://www.asaas.com/api/v3';

// Test connection to Asaas API
const testAsaasConnection = async () => {
  try {
    console.log('Testing connection to Asaas API...');
    console.log(`URL: ${ASAAS_API_URL}/customers`);
    console.log(`Authorization: Bearer ${ASAAS_API_TOKEN.substring(0, 10)}...`);
    
    const response = await axios.get(`${ASAAS_API_URL}/customers`, {
      params: {
        limit: 1,
        offset: 0,
        status: 'ACTIVE'
      },
      headers: {
        'Authorization': `Bearer ${ASAAS_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Connection successful!');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error connecting to Asaas API:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
};

// Run the test
testAsaasConnection()
  .then(result => {
    console.log('Test completed.');
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
