import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import asaasRouter from './routes/asaas.js';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Detectar ambiente
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors({
  origin: isProduction 
    ? [process.env.FRONTEND_URL || '*'] 
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Configuração das rotas da API

// Adicionar rota de teste para verificar se o servidor está funcionando
app.get('/api/test', (req, res) => {
  res.json({ message: 'API server is working!' });
});

// Usar o router da API da Asaas
app.use('/api/asaas', asaasRouter);

// Serve static assets in production
if (isProduction) {
  // Caminho para os arquivos estáticos do frontend
  const distPath = path.join(__dirname, 'dist');
  
  // Verificar se o diretório existe
  try {
    if (fs.existsSync(distPath)) {
      console.log('Serving static files from:', distPath);
      app.use(express.static(distPath));
      
      // Todas as rotas não-API redirecionam para o frontend
      app.get('*', (req, res, next) => {
        // Pular para o próximo middleware se for uma rota de API
        if (req.path.startsWith('/api/')) {
          return next();
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn('Warning: dist directory not found at', distPath);
    }
  } catch (err) {
    console.error('Error checking dist directory:', err);
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
