# Dockerfile corrigido para Render com Puppeteer e Chromium

FROM node:18-slim

# Variáveis de ambiente corretas
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Instalar o Chromium e dependências
RUN apt-get update && apt-get install -y \
    chromium \
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
    wget \
    --no-install-recommends \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Criar diretório da aplicação
WORKDIR /usr/src/app

# Copiar e instalar dependências
COPY package*.json ./
RUN npm install

# Copiar código-fonte
COPY . .

# Expor porta
EXPOSE 3001

# Iniciar servidor
CMD ["npm", "start"]
