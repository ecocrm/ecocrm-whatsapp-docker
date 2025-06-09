import express from 'express';
import cors from 'cors';
import { create } from '@wppconnect-team/wppconnect';
import chromium from '@sparticuz/chromium';

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

// Rota para iniciar a sessão e obter o QR Code
app.post('/start-session', async (req, res) => {
  console.log('Recebido pedido para iniciar a sessão...');
  
  let sessionQrCode = null;

  try {
    // Garante que o Chromium está disponível no ambiente serverless da Vercel
    const executablePath = await chromium.executablePath();
    
    if (!executablePath) {
        console.error('Chromium não encontrado!');
        return res.status(500).json({ success: false, message: 'Não foi possível encontrar o navegador Chromium.' });
    }

    console.log(`Usando Chromium em: ${executablePath}`);

    // Cria o cliente wppconnect
    const client = await create({
      session: 'ecocrm-session',
      headless: 'new',
      catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
        console.log('QR Code recebido pelo WPPConnect!');
        sessionQrCode = `data:image/png;base64,${base64Qr}`;
      },
      browserArgs: chromium.args,
      executablePath: executablePath,
      puppeteerOptions: {
        headless: 'new',
        args: chromium.args,
      },
    });

    console.log('Cliente WPPConnect criado. A aguardar o QR Code...');

    // Espera até 30 segundos pelo QR Code
    let attempts = 0;
    while (!sessionQrCode && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    if (sessionQrCode) {
      console.log('QR Code pronto. A enviar para o cliente.');
      res.status(200).json({ success: true, qr: sessionQrCode });
    } else {
      console.error('Timeout: QR Code não foi gerado a tempo.');
      res.status(500).json({ success: false, message: 'Timeout ao gerar QR Code.' });
    }

  } catch (error) {
    console.error('Erro geral na rota /start-session:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor ao iniciar a sessão.' });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor WhatsApp rodando na porta ${PORT}`));

