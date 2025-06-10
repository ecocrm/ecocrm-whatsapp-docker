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

// Nova rota de teste para verificar logs (ADICIONADA AQUI!)
app.get('/teste-log', (req, res) => {
    console.log('--- ROTA DE TESTE DE LOG ACESSADA COM SUCESSO ---');
    res.status(200).send('Log de teste registrado!');
});

// Rota para iniciar a sessão e obter o QR Code do UltraMsg
app.post('/start-session', async (req, res) => {
    console.log('>>> REQUISIÇÃO RECEBIDA PELO BACKEND NO RENDER <<<'); // LINHA ADICIONADA PARA TESTE DE LOG
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

    // Constrói a URL para a API do QR Code do UltraMsg
    // Endpoint: GET https://api.ultramsg.com/instance[Instance_id]/qrcode?token=[token]
    // A ULTRAMSG_API_URL já deve conter o ID da instância no final.
    const statusApiUrl = `${ULTRAMSG_API_URL}status?token=${ULTRAMSG_TOKEN}`; // Endpoint para status
    console.log(`Chamando UltraMsg API para Status: ${statusApiUrl}`);

    try {
        const response = await fetch(statusApiUrl, { method: 'GET' });
        const data = await response.json(); // Tenta parsear a resposta como JSON

        // DEBUG: Loga a resposta completa do UltraMsg para ver a estrutura exata
        console.log('Resposta COMPLETA do UltraMsg (depois de JSON.parse):', JSON.stringify(data, null, 2));

        // Lógica para tratar a resposta do STATUS
        if (typeof data === 'object' && data !== null && typeof data.status === 'string') {
            switch (data.status) {
                case 'authenticated':
                    console.log('Instância UltraMsg já está AUTENTICADA. Nenhum QR code necessário.');
                    res.status(200).json({ success: true, message: 'Instância WhatsApp já conectada.', status: 'authenticated' });
                    break;
                case 'not_authorized':
                case 'qr': // Quando o status é 'qr', o QR Code deve estar na resposta
                    if (typeof data.qrcode === 'string' && data.qrcode.length > 0) {
                        console.log('QR Code recebido do UltraMsg (instância NÃO AUTORIZADA)!');
                        res.status(200).json({ success: true, qr: data.qrcode, status: data.status });
                    } else {
                        // Status 'not_authorized'/'qr' mas sem o QR Code (erro inesperado)
                        console.error('Status ' + data.status + ' mas QR Code ausente na resposta:', JSON.stringify(data, null, 2));
                        res.status(response.status || 500).json({ 
                            success: false, 
                            message: 'Instância não autorizada, mas QR Code ausente ou inválido.',
                            status: data.status 
                        });
                    }
                    break;
                case 'loading':
                case 'initialize':
                case 'standby':
                    console.log('Instância UltraMsg em estado de carregamento/inicialização. Aguardando...');
                    res.status(200).json({ success: false, message: 'Instância em inicialização. Tente novamente em breve.', status: data.status });
                    break;
                default:
                    console.error('Status desconhecido da instância UltraMsg:', JSON.stringify(data, null, 2));
                    res.status(response.status || 500).json({ 
                        success: false, 
                        message: 'Status desconhecido da instância UltraMsg.',
                        status: data.status
                    });
            }
        } else {
            console.error('Erro ou estrutura de resposta inesperada do UltraMsg. Resposta: ', JSON.stringify(data, null, 2));
            res.status(response.status || 500).json({ 
                success: false, 
                message: data.error || 'Erro na resposta da API de status do UltraMsg. Resposta: ' + JSON.stringify(data)
            });
        }

    } catch (error) {
        console.error('Erro na comunicação com a API do UltraMsg (verifique a URL ou conexão):', error);
        res.status(500).json({ success: false, message: `Erro interno do servidor ao conectar com UltraMsg: ${error.message}` });
    }
});

app.listen(PORT, () => console.log(`🚀 Servidor WhatsApp rodando na porta ${PORT}`));
