const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const { create } = require("@wppconnect-team/wppconnect");
const { executablePath } = require("puppeteer-core");
const fs = require("fs");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.error("❌ Erro MongoDB:", err));

let session = null;
let currentQr = null;

app.get("/start-session", async (req, res) => {
  try {
    if (!fs.existsSync("/usr/bin/chromium")) {
      return res.status(500).json({ error: "Chromium não encontrado" });
    }

    if (session) {
      await session.close();
      session = null;
      currentQr = null;
    }

    await create({
      session: "eco-crm",
      headless: true,
      useChrome: false,
      browserPath: process.env.BROWSER_PATH || executablePath(),
      debug: false,
      userDataDir: "/tmp/wpp-session-" + Date.now(),
      catchQR: (base64Qrimg) => {
        currentQr = `data:image/png;base64,${base64Qrimg}`;
      },
      browserArgs: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    }).then(client => {
      session = client;
      console.log("✅ Sessão WhatsApp iniciada.");
    }).catch(err => {
      console.error("❌ Erro ao iniciar sessão:", err);
      if (!res.headersSent) res.status(500).json({ error: "Erro ao iniciar sessão" });
    });

    let tentativas = 0;
    while (!currentQr && tentativas < 20) {
      await new Promise(resolve => setTimeout(resolve, 500));
      tentativas++;
    }

    if (currentQr) {
      const html = `<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${currentQr}" style="width:300px;height:300px;" /></body></html>`;
      return res.send(html);
    } else {
      return res.status(500).send("QR Code não disponível ainda.");
    }
  } catch (err) {
    console.error("❌ Erro geral:", err);
    if (!res.headersSent) res.status(500).json({ error: "Erro ao iniciar sessão" });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
