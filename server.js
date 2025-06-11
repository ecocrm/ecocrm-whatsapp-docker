import express from 'express';
import cors from 'cors';
import { create } from '@wppconnect-team/wppconnect'; // Importa o WPPConnect
import chromium from '@sparticuz/chromium'; // Importa o Chromium otimizado

const app = express();
const PORT = process.env.PORT || 3001; // Usará a porta 3001 que você definiu no VPS

// Middlewares
app.use(cors({
  origin: '*' // Permite pedidos de qualquer origem
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
  console.log('>>> REQUISIÇÃO RECEBIDA PELO BACKEND NO VPS <<<'); // Log de que a requisição chegou
  console.log('Recebido pedido para iniciar a sessão com WPPConnect...');

  // As variáveis para UltraMsg/Green API NÃO SÃO USADAS AQUI, APENAS MONGO_URI e PORT.
  // A MONGO_URI é usada se seu código de DB (não incluído aqui) a utiliza.

  let sessionQrCode = null;
  let qrAttempts = 0;
  const MAX_QR_ATTEMPTS = 60; // 30 segundos de espera (60 * 500ms)

  try {
    // Assegura que o caminho para o Chromium é o correto para o ambiente Linux do VPS
    const executablePath = await chromium.executablePath; // .executablePath é uma propriedade, não um método

    if (!executablePath) {
        console.error('Chromium não encontrado ou caminho inválido!');
        return res.status(500).json({ success: false, message: 'Não foi possível encontrar o navegador Chromium.' });
    }

    console.log(`Usando Chromium em: ${executablePath}`);

    // Cria o cliente wppconnect
    const client = await create({
      session: 'ecocrm-session-vps', // Nome da sessão para o WhatsApp
      headless: 'new', // Garante que o navegador seja iniciado em modo headless
      autoClose: false, // Não fecha a sessão automaticamente (importante para manter conectado)
      catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
        console.log('QR Code recebido pelo WPPConnect!');
        sessionQrCode = `data:image/png;base64,${base64Qr}`;
      },
      browserArgs: chromium.args, // Argumentos otimizados para o navegador (sem sandbox)
      executablePath: executablePath, // Caminho do Chromium otimizado
      puppeteerOptions: {
        headless: 'new',
        args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'], // Adiciona args de sandbox explicitamente
      },
    });

    console.log('Cliente WPPConnect criado. A aguardar o QR Code...');

    // Espera pelo QR Code
    while (!sessionQrCode && qrAttempts < MAX_QR_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, 500));
      qrAttempts++;
    }

    if (sessionQrCode) {
      console.log('QR Code pronto. A enviar para o cliente.');
      res.status(200).json({ success: true, qr: sessionQrCode });
    } else {
      console.error('Timeout: QR Code não foi gerado a tempo.');
      res.status(500).json({ success: false, message: 'Timeout ao gerar QR Code.' });
    }

  } catch (error) {
    console.error('Erro geral na rota /start-session (WPPConnect):', error);
    res.status(500).json({ success: false, message: `Erro interno do servidor ao iniciar a sessão WPPConnect: ${error.message}` });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor WhatsApp rodando na porta ${PORT}`));
