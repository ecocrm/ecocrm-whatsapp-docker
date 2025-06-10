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

    // Pega as variáveis de ambiente que configuramos no Render para o UltraMsg
    const ULTRAMSG_API_URL = process.env.ULTRAMSG_API_URL; // Ex: https://api.ultramsg.com/instance124883/
    const ULTRAMSG_TOKEN = process.env.ULTRAMSG_TOKEN; // Seu token

    // Verifica se as variáveis estão configuradas
    if (!ULTRAMSG_API_URL || !ULTRAMSG_TOKEN) {
        console.error('Erro: Variáveis de ambiente do UltraMsg não configuradas!');
        return res.status(500).json({ 
            success: false, 
            message: 'Erro de configuração do servidor. Variáveis do UltraMsg ausentes.' 
        });
    }

    // CONSTRÓI A URL PARA O ENDPOINT CORRETO DO QR CODE (MUDANÇA FINAL AQUI!)
    // Base: ULTRAMSG_API_URL (que já é https://api.ultramsg.com/instance[ID]/)
    // Adiciona o novo caminho: api/get/instance/qr
    const qrCodeApiUrl = `${ULTRAMSG_API_URL}api/get/instance/qr?token=${ULTRAMSG_TOKEN}`; 
    console.log(`Chamando UltraMsg API para QR Code (via get/instance/qr): ${qrCodeApiUrl}`);

    try {
        const response = await fetch(qrCodeApiUrl, { method: 'GET' });
        const data = await response.json(); // Tenta parsear a resposta como JSON

        // DEBUG: Loga a resposta completa do UltraMsg para ver a estrutura exata
        console.log('Resposta COMPLETA do UltraMsg (depois de JSON.parse):', JSON.stringify(data, null, 2));

        // Lógica para tratar a resposta:
        // O UltraMsg retorna o QR code na chave 'qrCode' (se não autenticado) ou 'authenticated'/'status'
        if (typeof data === 'object' && data !== null) {
            if (data.status === 'authenticated') {
                console.log('Instância UltraMsg já está AUTENTICADA. Nenhum QR code necessário.');
                res.status(200).json({ success: true, message: 'Instância WhatsApp já conectada.', status: 'authenticated' });
            } else if (typeof data.qrCode === 'string' && data.qrCode.length > 0) {
                console.log('QR Code recebido do UltraMsg com sucesso (instância NÃO AUTORIZADA)!');
                res.status(200).json({ success: true, qr: data.qrCode, status: data.status || 'not_authenticated' });
            } else {
                console.error('Resposta inesperada ou QR Code ausente/inválido:', JSON.stringify(data, null, 2));
                res.status(response.status || 500).json({ 
                    success: false, 
                    message: data.error || 'Erro desconhecido ou QR Code/status inválido/ausente do UltraMsg. Resposta: ' + JSON.stringify(data)
                });
            }
        } else {
            console.error('Erro ou estrutura de resposta inesperada do UltraMsg. Resposta: ', JSON.stringify(data, null, 2));
            res.status(response.status || 500).json({ 
                success: false, 
                message: data.error || 'Erro na resposta da API do UltraMsg. Resposta: ' + JSON.stringify(data)
            });
        }

    } catch (error) {
        console.error('Erro na comunicação com a API do UltraMsg (verifique a URL ou conexão):', error);
        res.status(500).json({ success: false, message: `Erro interno do servidor ao conectar com UltraMsg: ${error.message}` });
    }
});

app.listen(PORT, () => console.log(`🚀 Servidor WhatsApp rodando na porta ${PORT}`));
