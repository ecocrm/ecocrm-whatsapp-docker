
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { create } = require("@wppconnect-team/wppconnect");
const { executablePath } = require("puppeteer-core");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/user");
const auth = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("MongoDB conectado.");
}).catch((err) => {
  console.error("Erro MongoDB:", err);
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Credenciais inválidas" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Credenciais inválidas" });

    const payload = { user: { id: user.id, name: user.name, email: user.email } };
    jwt.sign(payload, process.env.JWT_SECRET || "ecocrm_secret_key", { expiresIn: 3600 }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    });
  } catch (error) {
    console.error("Erro no login:", error.message);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "Usuário já existe" });

    user = new User({ name, email, password });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    const payload = { user: { id: user.id, name: user.name, email: user.email } };
    jwt.sign(payload, process.env.JWT_SECRET || "ecocrm_secret_key", { expiresIn: 3600 }, (err, token) => {
      if (err) throw err;
      res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
    });
  } catch (error) {
    console.error("Erro no registro:", error.message);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});

app.get("/api/auth/user", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
    res.json(user);
  } catch (error) {
    console.error("Erro ao buscar dados do usuário:", error.message);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});

let session = null;
let currentQr = null;

app.get("/start-session", async (req, res) => {
  try {
    if (!session) {
      await create({
        session: "eco-crm",
        headless: true,
        useChrome: false,
        browserPath: executablePath(),
        debug: false,
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
          "--disable-gpu"
        ]
      }).then((client) => {
        session = client;
        console.log("✅ Sessão WPPConnect iniciada.");
      }).catch(err => {
        console.error("Erro ao iniciar sessão:", err);
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
    }

  } catch (err) {
    console.error("Erro geral:", err);
    res.status(500).json({ error: "Erro ao iniciar sessão" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
