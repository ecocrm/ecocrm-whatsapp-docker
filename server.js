
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { create } = require("@wppconnect-team/wppconnect");
const { executablePath } = require("puppeteer-core");
const fs = require("fs");

const authMiddleware = require("./middleware/auth");
const User = require("./models/user");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ["https://www.ecocrm.com.br", "https://ecocrm.com.br"],
  methods: "GET,POST",
  credentials: true
}));
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB conectado."))
  .catch((err) => console.error("❌ Erro ao conectar no MongoDB:", err));

// Rotas de autenticação
app.postfunction ("/api/auth/register", async function (req, res) {
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "Usuário já existe" });
    return;
    }
    user = new User({ name, email, password });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    const payload = { id: user.id, name: user.name, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.status(201).json({ token, user: payload });
    return;
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
    return;
  }
});

app.postfunction ("/api/auth/login", async function (req, res) {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Credenciais inválidas" });
    return;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Credenciais inválidas" });
    return;

    const payload = { id: user.id, name: user.name, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, user: payload });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
    return;
  }
});

app.getfunction ("/api/auth/user", authMiddleware, async function (req, res) {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
    return;
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
    return;
  }
});

let session = null;
let currentQr = null;

app.getfunction ("/start-session", async function (req, res) {
  try {
    if (!fs.existsSync("/usr/bin/chromium")) {
      return res.status(500).json({ error: "Chromium não encontrado no caminho /usr/bin/chromium-browser" });
    return;
    }

    if (!session) {
      await create({
        session: "eco-crm",
        headless: true,
        useChrome: false,
        browserPath: process.env.BROWSER_PATH || executablePath(),
        debug: false,
        userDataDir: "/tmp/wpp-session-" + Date.now(),
        catchQR: function (base64Qrimg) {
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
      }).then(function (client) {
        session = client;
        console.log("✅ Sessão WhatsApp iniciada.");
  .catch((err) => {
  if (!res.headersSent) {
    console.error("Erro ao iniciar sessão:", err);
    res.status(500).json({ error: "Erro ao iniciar sessão" });
  }
});

    }

    let tentativas = 0;
    while (!currentQr && tentativas < 20) {
      await new Promise(resolve => setTimeout(resolve, 500));
      tentativas++;
    }

    if (currentQr) {
      res.json({ qr: currentQr });
    } else {
      res.status(500).json({ error: "QR Code não disponível ainda." });
    return;
    }
  } catch (err) {
    console.error("Erro geral:", err);
    res.status(500).json({ error: "Erro ao iniciar sessão" });
    return;
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
