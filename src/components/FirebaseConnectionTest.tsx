import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';

const FirebaseConnectionTest = () => {
  const [connectionStatus, setConnectionStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message: string;
    error?: string;
    documents?: number;
  }>({
    loading: true,
    message: 'Verificando conexão com o Firebase...'
  });

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Iniciando teste de conexão com o Firebase...');
        
        // Tenta obter uma referência a uma coleção
        const testCollection = collection(db, 'test_connection');
        
        // Tenta fazer uma consulta simples
        const snapshot = await getDocs(testCollection);
        
        console.log('Conexão com o Firebase estabelecida com sucesso!');
        console.log(`Documentos encontrados na coleção de teste: ${snapshot.size}`);
        
        setConnectionStatus({
          loading: false,
          success: true,
          message: 'Conexão com o Firebase estabelecida com sucesso!',
          documents: snapshot.size
        });
      } catch (error: any) {
        console.error('Erro ao conectar com o Firebase:', error);
        
        setConnectionStatus({
          loading: false,
          success: false,
          message: 'Falha na conexão com o Firebase',
          error: error.message
        });
      }
    };

    testConnection();
  }, []);

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4">Teste de Conexão com Firebase</h2>
      
      {connectionStatus.loading ? (
        <div className="text-blue-500">Carregando...</div>
      ) : connectionStatus.success ? (
        <div className="text-green-500">
          <p>{connectionStatus.message}</p>
          <p>Documentos encontrados: {connectionStatus.documents}</p>
        </div>
      ) : (
        <div className="text-red-500">
          <p>{connectionStatus.message}</p>
          {connectionStatus.error && (
            <p className="mt-2 text-sm">Erro: {connectionStatus.error}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default FirebaseConnectionTest;
