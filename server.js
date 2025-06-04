
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { create, ev } = require("@wppconnect-team/wppconnect");
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

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "Usuário já existe" });

    user = new User({ name, email, password });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    const payload = { id: user.id, name: user.name, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
    return res.status(201).json({ token, user: payload });
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: "Erro interno" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Credenciais inválidas" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Credenciais inválidas" });

    const payload = { id: user.id, name: user.name, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
    return res.json({ token, user: payload });
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: "Erro interno" });
  }
});

app.get("/api/auth/user", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
    return res.json(user);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: "Erro interno" });
  }
});

let session = null;
let currentQr = null;

app.get("/start-session", async (req, res) => {
  try {
    if (!fs.existsSync("/usr/bin/chromium")) {
      console.error("❌ Chromium não encontrado em /usr/bin/chromium");
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
      debug: true,
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
    }).then((client) => {
      session = client;
      console.log("✅ Sessão WhatsApp iniciada.");
    }).catch((err) => {
      console.error("❌ Erro dentro do .then() do create:");
      console.error(err);
      if (!res.headersSent) res.status(500).json({ error: "Erro ao iniciar sessão (create failed)" });
    });

    let tentativas = 0;
    while (!currentQr && tentativas < 20) {
      await new Promise(resolve => setTimeout(resolve, 500));
      tentativas++;
    }

    if (currentQr) {
      const html = `
        <html>
          <body style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f4f4f4;">
            <img src="${currentQr}" style="width:300px;height:300px;border:2px solid #333;" />
          </body>
        </html>
      `;
      return res.send(html);
    } else {
      return res.status(500).send("QR Code não disponível ainda.");
    }
  } catch (err) {
    console.error("❌ Erro geral no /start-session:");
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: "Erro ao iniciar sessão" });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
