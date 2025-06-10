import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch'; // Adicione esta importação para fazer requisições HTTP

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
    origin: '*'
}));
app.use(express.json());

// Rota para verificar se o servidor está online
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Servidor WhatsApp EcoCRM está a funcionar!' });
});

// Rota para iniciar a sessão e obter o QR Code do Green API
app.post('/start-session', async (req, res) => {
    console.log('Recebido pedido para iniciar a sessão com Green API...');

    // Pega as variáveis de ambiente que configuramos no Render para o Green API
    const GREENAPI_API_URL = process.env.GREENAPI_API_URL;
    const GREENAPI_ID_INSTANCE = process.env.GREENAPI_ID_INSTANCE;
    const GREENAPI_API_TOKEN = process.env.GREENAPI_API_TOKEN;

    // Verifica se as variáveis estão configuradas
    if (!GREENAPI_API_URL || !GREENAPI_ID_INSTANCE || !GREENAPI_API_TOKEN) {
        console.error('Erro: Variáveis de ambiente do Green API não configuradas!');
        return res.status(500).json({ 
            success: false, 
            message: 'Erro de configuração do servidor. Variáveis do Green API ausentes.' 
        });
    }

    // Constrói a URL para a API do QR Code do Green API
    // Endpoint: GET /waInstance{idInstance}/getQrCode?token={apiTokenInstance}
    const qrCodeApiUrl = `${GREENAPI_API_URL}/waInstance${GREENAPI_ID_INSTANCE}/getQrCode?token=${GREENAPI_API_TOKEN}`;
    console.log(`Chamando Green API para QR Code: ${qrCodeApiUrl}`);

    try {
        // Faz a requisição GET para a API do Green API
        const response = await fetch(qrCodeApiUrl, { method: 'GET' });
        const data = await response.json(); // Tenta parsear a resposta como JSON

        // DEBUG: Loga a resposta completa do Green API para ver a estrutura exata
        console.log('Resposta COMPLETA do Green API (depois de JSON.parse):', JSON.stringify(data, null, 2));

        // Green API retorna o QR code na chave 'qrCode' quando não autorizado
        // Verifica se 'data' é um objeto e se tem a propriedade 'qrCode' que não é vazia.
        if (typeof data === 'object' && data !== null && typeof data.qrCode === 'string' && data.qrCode.length > 0) {
            console.log('QR Code recebido do Green API com sucesso!');
            // O Green API já retorna o QR code no formato 'data:image/png;base64,...' diretamente!
            res.status(200).json({ success: true, qr: data.qrCode }); 
        } else {
            console.error('Erro ou QR Code válido não encontrado na resposta do Green API. Resposta: ', JSON.stringify(data, null, 2));
            res.status(response.status || 500).json({ 
                success: false, 
                message: data.error || 'Erro desconhecido ou QR Code inválido/ausente do Green API.' 
            });
        }

    } catch (error) {
        console.error('Erro na comunicação com a API do Green API (verifique a URL ou conexão):', error);
        res.status(500).json({ success: false, message: `Erro interno do servidor ao conectar com Green API: ${error.message}` });
    }
});

app.listen(PORT, () => console.log(`🚀 Servidor WhatsApp rodando na porta ${PORT}`));
