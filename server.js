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

        // MUDANÇA AQUI: Condição mais explícita para verificar a propriedade 'qrcode'
        // Usa Object.prototype.hasOwnProperty.call para checar se a propriedade existe.
        if (typeof data === 'object' && data !== null && Object.prototype.hasOwnProperty.call(data, 'qrcode')) {
            const qrCodeString = data.qrcode; // Pega o valor do QR code
            
            // Verifica se o valor é uma string e não está vazia.
            if (typeof qrCodeString === 'string' && qrCodeString.length > 0) {
                console.log('QR Code recebido do UltraMsg com sucesso!');
                res.status(200).json({ success: true, qr: qrCodeString }); 
            } else {
                console.error('Propriedade qrcode encontrada, mas valor não é string válida/não vazia:', JSON.stringify(data, null, 2));
                res.status(response.status || 500).json({
                    success: false,
                    message: 'QR Code recebido, mas formato inválido. Resposta: ' + JSON.stringify(data)
                });
            }
        } else {
            // Este bloco será acionado se 'data' não for objeto ou não tiver a propriedade 'qrcode'.
            console.error('Erro ou propriedade qrcode ausente na resposta do UltraMsg. Resposta: ', JSON.stringify(data, null, 2));
            res.status(response.status || 500).json({
                success: false,
                message: data.error || 'Erro desconhecido ou QR Code ausente do UltraMsg.'
            });
        }

    } catch (error) {
        console.error('Erro na comunicação com a API do UltraMsg (verifique a URL ou conexão):', error);
        res.status(500).json({ success: false, message: `Erro interno do servidor ao conectar com UltraMsg: ${error.message}` });
    }
});

app.listen(PORT, () => console.log(`🚀 Servidor WhatsApp rodando na porta ${PORT}`));
