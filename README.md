# Klaviyo Proxy Backend

Backend intermediário (proxy) para contornar problemas de CORS ao acessar a API da Klaviyo a partir do frontend.

## Configuração

1. Clone este repositório
2. Instale as dependências:
   ```
   npm install
   ```
3. Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:
   ```
   PORT=3000
   ```
4. Inicie o servidor:
   ```
   npm start
   ```

## Endpoints

### GET /klaviyo-proxy/klaviyo-revenue

Busca dados de receita da Klaviyo.

**Parâmetros de consulta:**
- `start_date`: Data de início (obrigatório)
- `end_date`: Data de fim (obrigatório)
- `api_key`: Chave privada da API da Klaviyo (obrigatório)
- `public_key`: Chave pública/ID do site da Klaviyo (opcional)

**Exemplo de uso:**
```
GET /klaviyo-proxy/klaviyo-revenue?start_date=2023-01-01&end_date=2023-01-31&api_key=sk_xxxxxxxx
```

### GET /klaviyo-proxy/health

Verifica se o servidor está funcionando corretamente.

## Compatibilidade com a API da Klaviyo

O backend tenta primeiro usar a API v3 da Klaviyo (mais recente) e, se falhar, faz fallback para a API v2. Isso garante compatibilidade com diferentes versões da API.

## Deploy no Railway

1. Crie uma conta no [Railway](https://railway.app/) (se ainda não tiver)
2. Conecte sua conta do GitHub ao Railway
3. Crie um novo projeto no Railway a partir do repositório GitHub
4. O Railway detectará automaticamente o `Procfile` e o `package.json` e fará o deploy

## Integração com o Frontend

Para usar este backend no seu frontend, você precisa:

1. Obter as chaves da API da Klaviyo do cliente que estão armazenadas no banco de dados
2. Fazer uma requisição para o endpoint `/klaviyo-revenue` passando as chaves como parâmetros

Exemplo de código para o frontend:

```javascript
// Obter as chaves da API do cliente do banco de dados
const clientDoc = await getDoc(doc(db, 'clients', user.uid));
const clientData = clientDoc.data();
const klaviyoConfig = clientData.integrations?.klaviyo;

// Verificar se as chaves existem
if (!klaviyoConfig?.enabled || !klaviyoConfig?.apiKey) {
  throw new Error('Please configure your Klaviyo API keys');
}

// Fazer a requisição para o backend proxy
const params = new URLSearchParams({
  api_key: klaviyoConfig.apiKey,
  public_key: klaviyoConfig.publicKey,
  start_date: '2023-01-01',
  end_date: '2023-01-31'
});

const response = await fetch(`https://seu-backend.railway.app/klaviyo-revenue?${params}`);
const data = await response.json();
```

## Alterando o Endpoint da Klaviyo

Para alterar o endpoint da Klaviyo ou adicionar novos endpoints, edite o arquivo `index.js`:

1. Para modificar o endpoint da API v3, altere a URL em `const klaviyoUrl = 'https://a.klaviyo.com/api/metrics/timeline';`
2. Para modificar o endpoint da API v2, altere a URL em `const klaviyoUrl = 'https://a.klaviyo.com/api/v2/metrics/timeline';`
3. Para modificar os parâmetros, ajuste os objetos `params` nas respectivas seções
4. Para adicionar novos endpoints, crie novas rotas seguindo o mesmo padrão
