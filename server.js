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

// Rota para iniciar a sessão e obter o QR Code do UltraMsg
app.post('/start-session', async (req, res) => {
    console.log('Recebido pedido para iniciar a sessão com UltraMsg...');

    const ULTRAMSG_API_URL = process.env.ULTRAMSG_API_URL;
    const ULTRAMSG_INSTANCE_ID = process.env.ULTRAMSG_INSTANCE_ID;
    const ULTRAMSG_TOKEN = process.env.ULTRAMSG_TOKEN;

    if (!ULTRAMSG_API_URL || !ULTRAMSG_INSTANCE_ID || !ULTRAMSG_TOKEN) {
        console.error('Erro: Variáveis de ambiente do UltraMsg não configuradas!');
        return res.status(500).json({ 
            success: false, 
            message: 'Erro de configuração do servidor. Variáveis do UltraMsg ausentes.' 
        });
    }

    const qrCodeApiUrl = `${ULTRAMSG_API_URL}instance/qrCode?token=${ULTRAMSG_TOKEN}`;
    console.log(`Chamando UltraMsg API para QR Code: ${qrCodeApiUrl}`);

    try {
        const response = await fetch(qrCodeApiUrl, { method: 'GET' });
        const data = await response.json(); // Tenta parsear a resposta como JSON

        // DEBUG: Loga a resposta completa do UltraMsg para ver a estrutura exata
        console.log('Resposta COMPLETA do UltraMsg (depois de JSON.parse):', JSON.stringify(data, null, 2));

        // MUDANÇA AQUI: Condição mais robusta para verificar o QR Code
        // Verifica se 'data' é um objeto e se tem uma propriedade 'qrcode' que não é vazia.
        if (typeof data === 'object' && data !== null && typeof data.qrcode === 'string' && data.qrcode.length > 0) {
            console.log('QR Code recebido do UltraMsg com sucesso!');
            res.status(200).json({ success: true, qr: data.qrcode }); 
        } else {
            // Este bloco agora só será acionado se realmente não houver um QR Code válido.
            console.error('Erro ou QR Code válido não encontrado na resposta do UltraMsg. Resposta: ', JSON.stringify(data, null, 2));
            res.status(response.status || 500).json({ 
                success: false, 
                message: data.error || 'Erro desconhecido ou QR Code inválido/ausente do UltraMsg.' 
            });
        }

    } catch (error) {
        console.error('Erro na comunicação com a API do UltraMsg (verifique a URL ou conexão):', error);
        res.status(500).json({ success: false, message: `Erro interno do servidor ao conectar com UltraMsg: ${error.message}` });
    }
});

app.listen(PORT, () => console.log(`🚀 Servidor WhatsApp rodando na porta ${PORT}`));
