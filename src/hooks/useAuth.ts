import { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types/firebase';
import { getUserAccessLogs, signOut, resetPassword, changePassword, updateUserProfile } from '../services/firebase/auth';

interface AuthLogout {
  (): Promise<void>;
}

interface AuthPasswordReset {
  (email: string): Promise<void>;
}

interface AuthPasswordChange {
  (currentPassword: string, newPassword: string): Promise<void>;
}

interface AuthProfileUpdate {
  (userId: string, data: Partial<User>): Promise<User>;
}

interface AuthGetLogs {
  (userId: string, limit?: number): Promise<any[]>;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Efeito para monitorar autenticação e dados do usuário
  useEffect(() => {
    // Monitorar estado de autenticação
    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Configurar listener para dados do usuário no Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeUser = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setUser({ id: doc.id, ...doc.data() } as User);
          } else {
            setUser(null);
          }
          setLoading(false);
        }, (error) => {
          console.error('Erro ao monitorar dados do usuário:', error);
          setLoading(false);
        });
        
        return () => unsubscribeUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Função para carregar logs de acesso do usuário
  const loadUserLogs: AuthGetLogs = async (userId, limit = 10) => {
    try {
      setLogsLoading(true);
      const userLogs = await getUserAccessLogs(userId, limit);
      setLogs(userLogs);
      return userLogs;
    } catch (error) {
      console.error('Erro ao carregar logs de acesso:', error);
      throw error;
    } finally {
      setLogsLoading(false);
    }
  };

  // Função para fazer logout
  const logout: AuthLogout = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      throw error;
    }
  };

  // Função para recuperar senha
  const passwordReset: AuthPasswordReset = async (email) => {
    try {
      await resetPassword(email);
    } catch (error) {
      console.error('Erro ao solicitar redefinição de senha:', error);
      throw error;
    }
  };

  // Função para alterar senha
  const passwordChange: AuthPasswordChange = async (currentPassword, newPassword) => {
    try {
      await changePassword(currentPassword, newPassword);
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      throw error;
    }
  };

  // Função para atualizar perfil
  const updateProfile: AuthProfileUpdate = async (userId, data) => {
    try {
      const updatedUser = await updateUserProfile(userId, data);
      return updatedUser;
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  };

  return { 
    user, 
    loading,
    logs,
    logsLoading,
    loadUserLogs,
    logout,
    passwordReset,
    passwordChange,
    updateProfile
  };
}