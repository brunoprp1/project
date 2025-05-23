import React, { useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import { Camera, Key, Shield } from 'lucide-react';

const AdminProfile: React.FC = () => {
  const [activeTab, setActiveTab] = useState('personal');

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Meu Perfil</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <Avatar name="Admin User" size="lg" className="w-24 h-24 text-2xl" />
              <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 border border-gray-200">
                <Camera size={16} className="text-gray-600" />
              </button>
            </div>
            <h2 className="mt-4 font-medium text-lg">Admin User</h2>
            <p className="text-sm text-gray-500">admin@convertfy.com</p>
          </div>

          <div className="mt-6 space-y-1">
            <button
              onClick={() => setActiveTab('personal')}
              className={`w-full text-left px-4 py-2 rounded-md text-sm ${
                activeTab === 'personal' 
                  ? 'bg-[#0066FF] text-white' 
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              Dados Pessoais
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full text-left px-4 py-2 rounded-md text-sm ${
                activeTab === 'security' 
                  ? 'bg-[#0066FF] text-white' 
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              Segurança
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`w-full text-left px-4 py-2 rounded-md text-sm ${
                activeTab === 'permissions' 
                  ? 'bg-[#0066FF] text-white' 
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              Permissões
            </button>
          </div>
        </Card>

        <div className="md:col-span-3">
          {activeTab === 'personal' && (
            <Card>
              <h3 className="text-lg font-medium mb-6">Dados Pessoais</h3>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                      defaultValue="Admin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sobrenome
                    </label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                      defaultValue="User"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                    defaultValue="admin@convertfy.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="(11) 98765-4321"
                  />
                </div>

                <Button variant="primary">Salvar Alterações</Button>
              </form>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <div className="flex items-center gap-3 mb-6">
                <Key className="h-6 w-6 text-gray-400" />
                <h3 className="text-lg font-medium">Segurança</h3>
              </div>

              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha Atual
                  </label>
                  <input
                    type="password"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <Button variant="primary">Alterar Senha</Button>
              </form>
            </Card>
          )}

          {activeTab === 'permissions' && (
            <Card>
              <div className="flex items-center gap-3 mb-6">
                <Shield className="h-6 w-6 text-gray-400" />
                <h3 className="text-lg font-medium">Permissões</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Administrador</h4>
                    <p className="text-sm text-gray-500">Acesso total ao sistema</p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    Ativo
                  </span>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">Permissões Detalhadas</h4>
                  <div className="space-y-2">
                    {[
                      'Gerenciar usuários',
                      'Gerenciar clientes',
                      'Acessar relatórios',
                      'Gerenciar configurações',
                      'Gerenciar integrações',
                      'Acessar dados financeiros'
                    ].map((permission) => (
                      <div key={permission} className="flex items-center">
                        <input
                          type="checkbox"
                          checked
                          readOnly
                          className="h-4 w-4 text-[#0066FF] border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">
                          {permission}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;