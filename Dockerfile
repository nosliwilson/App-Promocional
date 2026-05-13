# Build Stage
FROM node:20-slim AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar todas as dependências (incluindo dev para o build)
RUN npm install

# Copiar o restante do código
COPY . .

# Rodar o build (Vite + Server Bundle)
RUN npm run build

# Production Stage
FROM node:20-slim

WORKDIR /app

# Variável de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

# Copiar apenas os arquivos necessários da fase de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Expor a porta 3000
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["npm", "start"]
