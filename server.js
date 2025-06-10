import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch'; // Adicione esta importação para fazer requisições HTTP

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
    origin: '*' // Permite pedidos de qualquer origem
}));
app.use(express.json());

// Rota para verificar se o servidor está online
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Servidor WhatsApp EcoCRM está a funcionar!' });
});

// Rota para iniciar a sessão e obter o QR Code do UltraMsg
app.post('/start-session', async (req, res) => {
    console.log('Recebido pedido para iniciar a sessão com UltraMsg...');

    // Pega as variáveis de ambiente que configuramos no Render
    const ULTRAMSG_API_URL = process.env.ULTRAMSG_API_URL; // Ex: https://api.ultramsg.com/instance124883/
    const ULTRAMSG_INSTANCE_ID = process.env.ULTRAMSG_INSTANCE_ID;
    const ULTRAMSG_TOKEN = process.env.ULTRAMSG_TOKEN;

    // Verifica se as variáveis estão configuradas
    if (!ULTRAMSG_API_URL || !ULTRAMSG_INSTANCE_ID || !ULTRAMSG_TOKEN) {
        console.error('Erro: Variáveis de ambiente do UltraMsg não configuradas!');
        return res.status(500).json({ 
            success: false, 
            message: 'Erro de configuração do servidor. Variáveis do UltraMsg ausentes.' 
        });
    }

    // CONSTRÓI A URL CORRETAMENTE AGORA
    // A API_URL já tem o ID da instância no final, então basta adicionar o '/instance/qrCode?token='
    const qrCodeApiUrl = `${ULTRAMSG_API_URL}instance/qrCode?token=${ULTRAMSG_TOKEN}`;
    console.log(`Chamando UltraMsg API para QR Code: ${qrCodeApiUrl}`);

    try {
        // Faz a requisição GET para a API do UltraMsg
        const response = await fetch(qrCodeApiUrl, { method: 'GET' });
        const data = await response.json();

        // Verifica a resposta da API do UltraMsg
        if (response.ok && data.qrcode) { // UltraMsg retorna o QR code na chave 'qrcode'
            console.log('QR Code recebido do UltraMsg com sucesso!');
            res.status(200).json({ success: true, qr: data.qrcode }); // Retorna a string do QR code
        } else {
            console.error('Erro ao obter QR Code do UltraMsg:', data);
            res.status(response.status).json({ 
                success: false, 
                message: data.error || 'Erro desconhecido ao obter QR Code do UltraMsg.' 
            });
        }

    } catch (error) {
        console.error('Erro na comunicação com a API do UltraMsg:', error);
        res.status(500).json({ success: false, message: `Erro interno do servidor ao conectar com UltraMsg: ${error.message}` });
    }
});

app.listen(PORT, () => console.log(`🚀 Servidor WhatsApp rodando na porta ${PORT}`));
