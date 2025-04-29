/**
 * Simples simulação de hash para evitar problemas com bcrypt no frontend
 * Em produção, use bcrypt ou outra biblioteca de criptografia segura
 * @param password The plain text password to hash
 * @returns The hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  // Simulação simples de hash - NÃO USE EM PRODUÇÃO
  return `hashed_${password}_${Date.now()}`;
};

/**
 * Simples simulação de comparação de senha para evitar problemas com bcrypt no frontend
 * Em produção, use bcrypt ou outra biblioteca de criptografia segura
 * @param password The plain text password
 * @param hashedPassword The hashed password
 * @returns Whether the password matches
 */
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  // Simulação simples de comparação - NÃO USE EM PRODUÇÃO
  const prefix = `hashed_${password}_`;
  return hashedPassword.startsWith(prefix);
};
