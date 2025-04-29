// Teste de conexão com o Firebase
import { db } from './config/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function testFirebaseConnection() {
  console.log('Iniciando teste de conexão com o Firebase...');
  
  try {
    // Tenta obter uma referência a uma coleção
    const testCollection = collection(db, 'test_connection');
    
    // Tenta fazer uma consulta simples
    const snapshot = await getDocs(testCollection);
    
    console.log('Conexão com o Firebase estabelecida com sucesso!');
    console.log(`Documentos encontrados na coleção de teste: ${snapshot.size}`);
    
    return {
      success: true,
      message: 'Conexão com o Firebase estabelecida com sucesso!',
      documents: snapshot.size
    };
  } catch (error) {
    console.error('Erro ao conectar com o Firebase:', error);
    
    return {
      success: false,
      message: 'Falha na conexão com o Firebase',
      error: error.message
    };
  }
}

// Executa o teste
testFirebaseConnection()
  .then(result => {
    console.log('Resultado do teste:', result);
  })
  .catch(error => {
    console.error('Erro ao executar o teste:', error);
  });

export default testFirebaseConnection;
