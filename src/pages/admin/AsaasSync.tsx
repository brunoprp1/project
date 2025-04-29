import React, { useState, useEffect } from 'react';
import { syncService } from '../../services/firebase/syncService';
import { SyncReport } from '../../types/asaas';

const AsaasSync: React.FC = () => {
  const [syncInProgress, setSyncInProgress] = useState<boolean>(false);
  const [currentSyncId, setCurrentSyncId] = useState<string | null>(null);
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncReport[]>([]);

  // Check if there's an active sync on component mount
  useEffect(() => {
    const checkActiveSyncs = async () => {
      try {
        const activeSyncs = await syncService.getActiveSyncs();
        if (activeSyncs.length > 0) {
          const activeSync = activeSyncs[0];
          setSyncInProgress(true);
          setCurrentSyncId(activeSync.id || null);
          setSyncReport(activeSync);
        } else {
          // Load sync history
          loadSyncHistory();
        }
      } catch (err: any) {
        console.error('Error checking active syncs:', err);
        setError('Erro ao verificar sincronizações ativas');
      }
    };

    checkActiveSyncs();
  }, []);

  // Poll for updates if there's a sync in progress
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (syncInProgress && currentSyncId) {
      interval = setInterval(async () => {
        try {
          const report = await syncService.getSyncReport(currentSyncId);
          if (report) {
            setSyncReport(report);

            // Calculate progress (assuming we know the total count)
            if (report.totalProcessed > 0) {
              // This is an estimation since we don't know the total count in advance
              // We'll use a combination of processed items and status
              if (report.status === 'completed') {
                setProgress(100);
                setSyncInProgress(false);
                clearInterval(interval!);
                // Reload sync history
                loadSyncHistory();
              } else if (report.status === 'failed') {
                setSyncInProgress(false);
                clearInterval(interval!);
                setError('A sincronização falhou. Verifique os logs para mais detalhes.');
                // Reload sync history
                loadSyncHistory();
              } else {
                // Estimate progress based on processed items
                // This is just an estimation, will go up to 90% until completion
                const estimatedProgress = Math.min(90, (report.totalProcessed / (report.totalProcessed + 10)) * 100);
                setProgress(estimatedProgress);
              }
            }
          }
        } catch (err) {
          console.error('Error polling sync status:', err);
        }
      }, 2000); // Poll every 2 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [syncInProgress, currentSyncId]);

  const loadSyncHistory = async () => {
    try {
      const reports = await syncService.getAllSyncReports();
      // Sort by startedAt date, newest first
      reports.sort((a, b) => {
        const dateA = a.startedAt instanceof Date ? a.startedAt : new Date(a.startedAt);
        const dateB = b.startedAt instanceof Date ? b.startedAt : new Date(b.startedAt);
        return dateB.getTime() - dateA.getTime();
      });
      setSyncHistory(reports);
    } catch (err) {
      console.error('Error loading sync history:', err);
      setError('Erro ao carregar histórico de sincronizações');
    }
  };

  const handleStartSync = async () => {
    try {
      setError(null);
      setSyncInProgress(true);
      
      const report = await syncService.startSync();
      setCurrentSyncId(report.id || null);
      setSyncReport(report);
      setProgress(0);
    } catch (err: any) {
      console.error('Error starting sync:', err);
      setError(err.message || 'Erro ao iniciar sincronização');
      setSyncInProgress(false);
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleString('pt-BR');
  };

  const downloadReport = (report: SyncReport) => {
    // Create a JSON blob and download it
    const data = JSON.stringify(report, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sync-report-${report.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Sincronização de Clientes Asaas</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Sincronização Manual</h2>
        
        <p className="mb-4">
          Esta ferramenta irá sincronizar todos os clientes ativos da Asaas com o banco de dados Firebase.
          Clientes existentes serão atualizados e novos clientes serão criados automaticamente.
        </p>
        
        <button
          onClick={handleStartSync}
          disabled={syncInProgress}
          className={`px-4 py-2 rounded font-semibold ${
            syncInProgress
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {syncInProgress ? 'Sincronização em Andamento...' : 'Iniciar Sincronização Manual'}
        </button>
        
        {syncInProgress && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Progresso da Sincronização</h3>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {syncReport && (
                <>
                  <p>Processados: {syncReport.totalProcessed}</p>
                  <p>Criados: {syncReport.created}</p>
                  <p>Atualizados: {syncReport.updated}</p>
                  <p>Falhas: {syncReport.failed}</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Sync History */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Histórico de Sincronizações</h2>
        
        {syncHistory.length === 0 ? (
          <p className="text-gray-500">Nenhuma sincronização realizada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Data Início</th>
                  <th className="py-3 px-6 text-left">Data Fim</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6 text-center">Processados</th>
                  <th className="py-3 px-6 text-center">Criados</th>
                  <th className="py-3 px-6 text-center">Atualizados</th>
                  <th className="py-3 px-6 text-center">Falhas</th>
                  <th className="py-3 px-6 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm">
                {syncHistory.map((report) => (
                  <tr key={report.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-6 text-left">{formatDate(report.startedAt)}</td>
                    <td className="py-3 px-6 text-left">{formatDate(report.endedAt)}</td>
                    <td className="py-3 px-6 text-center">
                      <span
                        className={`py-1 px-3 rounded-full text-xs ${
                          report.status === 'completed'
                            ? 'bg-green-200 text-green-700'
                            : report.status === 'failed'
                            ? 'bg-red-200 text-red-700'
                            : 'bg-yellow-200 text-yellow-700'
                        }`}
                      >
                        {report.status === 'completed'
                          ? 'Concluído'
                          : report.status === 'failed'
                          ? 'Falhou'
                          : 'Em Andamento'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center">{report.totalProcessed}</td>
                    <td className="py-3 px-6 text-center">{report.created}</td>
                    <td className="py-3 px-6 text-center">{report.updated}</td>
                    <td className="py-3 px-6 text-center">{report.failed}</td>
                    <td className="py-3 px-6 text-center">
                      <button
                        onClick={() => downloadReport(report)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        Baixar Relatório
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Error Details */}
      {syncReport && syncReport.errors && syncReport.errors.length > 0 && (
        <div className="bg-white shadow-md rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Detalhes de Erros</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Email</th>
                  <th className="py-3 px-6 text-left">Erro</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm">
                {syncReport.errors.map((error, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-6 text-left">{error.email}</td>
                    <td className="py-3 px-6 text-left">{error.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AsaasSync;
