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

// Rota para iniciar a sessão e obter o QR Code (usando WPPConnect)
// ALTERADO DE app.post PARA app.get para compatibilidade com iframe.src
app.get('/start-session', async (req, res) => {
  console.log('>>> /start-session RECEBIDA <<<');

  let sessionQrCode = null;
  let qrAttempts = 0;
  const MAX_QR_ATTEMPTS = 120; // Aumentado para dar mais tempo

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
      headless: 'new', // Garante que o navegador seja iniciado em modo headless
      autoClose: false, // Não fechar automaticamente (importante para manter conectado para depurar)
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
      // autocoCloseTimeout: 60 * 1000, // Adicionar/ajustar se o timeout ainda for problema
                                     // (com MAX_QR_ATTEMPTS = 120, o timeout já é longo)
    });

    console.log('🟢 Cliente WPPConnect criado. Verificando conexão...');

    // Aguarda o QR Code ser capturado ou a conexão ser estabelecida
    while (!sessionQrCode && qrAttempts < MAX_QR_ATTEMPTS) {
      const state = await client.getConnectionState();
      console.log(`⌛ Estado da sessão: ${state}`);
      if (['CONNECTED', 'AUTHENTICATED', 'NORMAL'].includes(state)) {
        console.log('✨ Instância já conectada.');
        sessionQrCode = "DATA_IMAGEM_QR_CODE_JA_CONECTADO"; // Sinaliza para sair do loop
        return res.status(200).json({ success: true, message: 'Instância já conectada.', status: state });
      }
      await new Promise(resolve => setTimeout(resolve, 500)); // Espera 500ms
      qrAttempts++;
    }

    if (sessionQrCode && sessionQrCode !== "DATA_IMAGEM_QR_CODE_JA_CONECTADO") {
      console.log('📤 Enviando QR Code para o frontend...');
      res.status(200).json({ success: true, qr: sessionQrCode });
    } else if (sessionQrCode === "DATA_IMAGEM_QR_CODE_JA_CONECTADO") {
        // Já enviou a resposta de conectado
    }
    else {
      console.warn('⏱️ Timeout: QR Code não gerado após tentativas.');
      res.status(500).json({ success: false, message: 'Timeout aguardando QR Code.' });
    }

  } catch (error) {
    console.error('❌ ERRO GERAL NO /start-session:', error);
    // Tenta limpar a sessão em caso de erro para tentar novamente
    await fs.rm(sessionDir, { recursive: true, force: true }).catch(err => {
      if (err.code !== 'ENOENT') console.error('Erro limpando após falha (catch):', err);
    });
    res.status(500).json({ success: false, message: `Erro ao iniciar conexão: ${error.message}` });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor WhatsApp rodando na porta ${PORT}`));
