import express from 'express';
import cors from 'cors';
import { create } from '@wppconnect-team/wppconnect';
import chromium from '@sparticuz/chromium';
import fs from 'fs/promises'; // Importa o módulo 'fs' para manipulação de arquivos (de forma assíncrona)
import path from 'path'; // Importa o módulo 'path' para lidar com caminhos

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

// Rota de teste para verificar logs (você pode remover depois)
app.get('/teste-log', (req, res) => {
    console.log('--- ROTA DE TESTE DE LOG ACESSADA COM SUCESSO ---');
    res.status(200).send('Log de teste registrado!');
});

// Rota para iniciar a sessão e obter o QR Code (usando WPPConnect)
app.post('/start-session', async (req, res) => {
    console.log('>>> REQUISIÇÃO RECEBIDA PELO BACKEND NO VPS <<<');
    console.log('Recebido pedido para iniciar a sessão com WPPConnect...');

    let sessionQrCode = null;
    let qrAttempts = 0;
    const MAX_QR_ATTEMPTS = 120; // AUMENTADO PARA 60 SEGUNDOS (120 * 500ms)

    const sessionDir = path.join('/root/ecocrm-whatsapp-docker', 'tokens', 'ecocrm-session-vps'); // Caminho da pasta da sessão

    try {
        // PASSO NOVO: Tentar remover a pasta da sessão antes de iniciar (para garantir uma limpeza)
        console.log(`Tentando limpar a pasta da sessão: ${sessionDir}`);
        await fs.rm(sessionDir, { recursive: true, force: true }).catch(err => {
            if (err.code !== 'ENOENT') { // 'ENOENT' significa que o arquivo/diretório não existe, o que é esperado se já estiver limpo
                console.error('Erro ao limpar pasta da sessão:', err);
            }
        });
        console.log('Pasta da sessão limpa ou não existente. Prosseguindo.');

        const executablePath = await chromium.executablePath;
        if (!executablePath) {
            console.error('Chromium não encontrado ou caminho inválido!');
            return res.status(500).json({ success: false, message: 'Não foi possível encontrar o navegador Chromium.' });
        }
        console.log(`Usando Chromium em: ${executablePath}`);

        const client = await create({
            session: 'ecocrm-session-vps',
            headless: 'new',
            autoClose: false,
            catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
                console.log('QR Code recebido pelo WPPConnect!');
                sessionQrCode = `data:image/png;base64,${base64Qr}`;
            },
            browserArgs: chromium.args,
            executablePath: executablePath,
            puppeteerOptions: {
                headless: 'new',
                args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
            },
        });

        console.log('Cliente WPPConnect criado. A aguardar o QR Code...');

        // Espera pelo QR Code ou autenticação
        while (!sessionQrCode && qrAttempts < MAX_QR_ATTEMPTS) {
            // Verifica o status da sessão para saber se já está autenticada
            const sessionState = await client.getConnectionState();
            if (sessionState === 'CONNECTED' || sessionState === 'AUTHENTICATED' || sessionState === 'NORMAL') {
                console.log('Instância já conectada/autenticada. Não é preciso esperar QR Code.');
                res.status(200).json({ success: true, message: 'Instância WhatsApp já conectada.', status: sessionState });
                return; // Sai da função após retornar a resposta
            }
            await new Promise(resolve => setTimeout(resolve, 500));
            qrAttempts++;
        }

        if (sessionQrCode) {
            console.log('QR Code pronto. A enviar para o cliente.');
            res.status(200).json({ success: true, qr: sessionQrCode });
        } else {
            console.error('Timeout: QR Code não foi gerado a tempo ou instância não conectada.');
            res.status(500).json({ success: false, message: 'Timeout ao gerar QR Code ou instância não conectada.' });
        }

    } catch (error) {
        console.error('Erro geral na rota /start-session (WPPConnect):', error);
        // Tentar limpar a pasta da sessão em caso de erro também
        await fs.rm(sessionDir, { recursive: true, force: true }).catch(err => {
            if (err.code !== 'ENOENT') console.error('Erro ao limpar pasta da sessão após falha:', err);
        });
        res.status(500).json({ success: false, message: `Erro interno do servidor ao iniciar a sessão WPPConnect: ${error.message}` });
    }
});

app.listen(PORT, () => console.log(`🚀 Servidor WhatsApp rodando na porta ${PORT}`));
