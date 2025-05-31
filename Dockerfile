# Imagem base oficial do Node.js com suporte para Chromium
FROM node:18-slim

# Variáveis de ambiente para evitar prompts
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false     PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Instalar dependências necessárias para o Chromium funcionar
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

# Copiar arquivos da aplicação
COPY package*.json ./
RUN npm install
COPY . .

# Expor porta do servidor
EXPOSE 3001

# Comando para iniciar o servidor
CMD ["npm", "start"]
