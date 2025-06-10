import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

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

        // MUDANÇA AQUI:
        // Se a resposta contém a chave 'qrcode', consideramos sucesso e retornamos.
        // Se não, é um erro.
        if (data && data.qrcode) { 
            console.log('QR Code recebido do UltraMsg com sucesso!');
            // UltraMsg retorna o QR code na chave 'qrcode'.
            res.status(200).json({ success: true, qr: data.qrcode }); 
        } else {
            console.error('Erro ou QR Code não encontrado na resposta do UltraMsg:', data);
            res.status(response.status || 500).json({ 
                success: false, 
                message: data.error || 'Erro desconhecido ao obter QR Code do UltraMsg. Resposta: ' + JSON.stringify(data)
            });
        }

    } catch (error) {
        console.error('Erro na comunicação com a API do UltraMsg:', error);
        res.status(500).json({ success: false, message: `Erro interno do servidor ao conectar com UltraMsg: ${error.message}` });
    }
});

app.listen(PORT, () => console.log(`🚀 Servidor WhatsApp rodando na porta ${PORT}`));
