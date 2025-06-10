# Usa uma imagem Node.js leve
FROM node:18-slim

# Atualiza os pacotes e instala APENAS as dependências que o @sparticuz/chromium precisa para funcionar,
# sem instalar o Chromium completo, que é muito pesado.
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libgbm-dev \
    libxshmfence-dev \
    libglu1-mesa \
    libpangocairo-1.0-0 \
    libpangoft2-1.0-0 \
    libgtk-3-0 \
    # REMOVEMOS: chromium # Não precisamos instalar o Chromium aqui, @sparticuz/chromium já cuida disso.
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia todos os arquivos do seu projeto para o diretório de trabalho
COPY . .

# Instala as dependências do Node.js
RUN npm install

# REMOVEMOS: ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
# Essa variável faria o Puppeteer usar o Chromium do sistema, mas queremos que ele use a versão otimizada do @sparticuz/chromium.
# O seu código 'servidor.js' já chama `chromium.executablePath()`, o que é o correto.

# Define o comando que será executado quando o contêiner iniciar
CMD ["node", "servidor.js"]
