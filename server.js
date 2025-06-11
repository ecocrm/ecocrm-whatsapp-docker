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

app.post('/start-session', async (req, res) => {
  console.log('>>> /start-session RECEBIDA <<<');

  let sessionQrCode = null;
  let qrAttempts = 0;
  const MAX_QR_ATTEMPTS = 120;

  const sessionDir = path.join('/root/ecocrm-whatsapp-docker', 'tokens', 'ecocrm-session-vps');

  try {
    console.log(`🧹 Limpando pasta da sessão: ${sessionDir}`);
    await fs.rm(sessionDir, { recursive: true, force: true }).catch(err => {
      if (err.code !== 'ENOENT') console.error('Erro ao limpar sessão:', err);
    });

    const executablePath = await chromium.executablePath;
    console.log('🔍 Chromium path:', executablePath);
    if (!executablePath) {
      return res.status(500).json({ success: false, message: 'Chromium não encontrado.' });
    }

    const client = await create({
      session: 'ecocrm-session-vps',
      headless: 'new',
      autoClose: false,
      catchQR: (base64Qr) => {
        console.log('✅ QR Code capturado com sucesso');
        sessionQrCode = `data:image/png;base64,${base64Qr}`;
      },
      browserArgs: chromium.args,
      executablePath,
      puppeteerOptions: {
        headless: 'new',
        args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    console.log('🟢 Cliente WPPConnect criado. Verificando conexão...');

    while (!sessionQrCode && qrAttempts < MAX_QR_ATTEMPTS) {
      const state = await client.getConnectionState();
      console.log(`⌛ Estado da sessão: ${state}`);
      if (['CONNECTED', 'AUTHENTICATED', 'NORMAL'].includes(state)) {
        return res.status(200).json({ success: true, message: 'Instância já conectada.', status: state });
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      qrAttempts++;
    }

    if (sessionQrCode) {
      console.log('📤 Enviando QR Code para o frontend...');
      res.status(200).json({ success: true, qr: sessionQrCode });
    } else {
      console.warn('⏱️ Timeout: QR Code não gerado.');
      res.status(500).json({ success: false, message: 'Timeout aguardando QR Code.' });
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
    await fs.rm(sessionDir, { recursive: true, force: true }).catch(err => {
      if (err.code !== 'ENOENT') console.error('Erro limpando após falha:', err);
    });
    res.status(500).json({ success: false, message: `Erro: ${error.message}` });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor WhatsApp rodando na porta ${PORT}`));
