import express from 'express';
import cors from 'cors';
import { create } from '@wppconnect-team/wppconnect';
import chromium from '@sparticuz/chromium';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Servidor WhatsApp EcoCRM está a funcionar!' });
});

app.get('/teste-log', (req, res) => {
  console.log('--- ROTA DE TESTE DE LOG ACESSADA COM SUCESSO ---');
  res.status(200).send('Log de teste registrado!');
});

app.post('/start-session', async (req, res) => {
  console.log('>>> REQUISIÇÃO RECEBIDA PELO BACKEND NO VPS <<<');

  let sessionQrCode = null;
  let qrAttempts = 0;
  const MAX_QR_ATTEMPTS = 120;

  const sessionDir = path.join('/root/ecocrm-whatsapp-docker', 'tokens', 'ecocrm-session-vps');

  try {
    console.log(`Tentando limpar a pasta da sessão: ${sessionDir}`);
    await fs.rm(sessionDir, { recursive: true, force: true }).catch(err => {
      if (err.code !== 'ENOENT') console.error('Erro ao limpar pasta da sessão:', err);
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
      catchQR: (base64Qr) => {
        console.log('QR Code recebido pelo WPPConnect!');
        sessionQrCode = `data:image/png;base64,${base64Qr}`;
      },
      browserArgs: chromium.args,
      executablePath,
      puppeteerOptions: {
        headless: 'new',
        args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    console.log('Cliente WPPConnect criado. Aguardando QR Code...');

    while (!sessionQrCode && qrAttempts < MAX_QR_ATTEMPTS) {
      const sessionState = await client.getConnectionState();
      if (['CONNECTED', 'AUTHENTICATED', 'NORMAL'].includes(sessionState)) {
        console.log('Instância já conectada/autenticada.');
        res.status(200).json({ success: true, message: 'Instância WhatsApp já conectada.', status: sessionState });
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      qrAttempts++;
    }

    if (sessionQrCode) {
      console.log('QR Code pronto. Enviando para o cliente...');
      res.status(200).json({ success: true, qr: sessionQrCode });
    } else {
      console.error('Timeout: QR Code não gerado a tempo.');
      res.status(500).json({ success: false, message: 'Timeout ao gerar QR Code ou instância não conectada.' });
    }

  } catch (error) {
    console.error('Erro geral na rota /start-session:', error);
    await fs.rm(sessionDir, { recursive: true, force: true }).catch(err => {
      if (err.code !== 'ENOENT') console.error('Erro ao limpar pasta da sessão após falha:', err);
    });
    res.status(500).json({ success: false, message: `Erro interno: ${error.message}` });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor WhatsApp rodando na porta ${PORT}`));
