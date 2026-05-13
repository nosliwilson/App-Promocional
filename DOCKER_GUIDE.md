# 🚀 Guia de Implantação com Docker

Este guia explica como transformar este sistema em uma imagem Docker, como rodá-lo e onde realizar as personalizações locais.

---

## 📦 1. Preparação e Build

Certifique-se de ter o **Docker** instalado em sua máquina.

### Construindo a Imagem
No diretório raiz do projeto, execute:

```bash
docker build -t raspadinha-ktour .
```

---

## 🏃 2. Rodando o Container

Para rodar o sistema, você deve mapear a porta interna (3000) e, opcionalmente, o volume do banco de dados para não perder os dados caso o container seja reiniciado.

```bash
docker run -d \
  -p 3000:3000 \
  --name app-raspadinha \
  -v $(pwd)/db:/app/db \
  raspadinha-ktour
```

*Nota: O volume `-v $(pwd)/db:/app/db` garante que o banco de dados SQLite seja salvo na sua pasta local `./db`.*

---

## ⚙️ 3. Onde Personalizar (Arquivos Locais)

O sistema foi desenhado para ser altamente flexível. Aqui estão os pontos principais de personalização:

### A. Variáveis de Ambiente (`.env`)
Você pode criar um arquivo `.env` localmente e passá-lo para o Docker no momento de rodar:

```bash
# Exemplo de comando com arquivo env
docker run -d -p 3000:3000 --env-file .env raspadinha-ktour
```

**Variáveis suportadas:**
- `VITE_ADMIN_BRAND`: Altera o nome da marca no painel administrativo (Ex: "K-TOUR").
- `JWT_SECRET`: Chave secreta para os tokens de login (Recomendado alterar em produção).

### B. Branding e Configurações via Painel
A maioria das personalizações **não exige alteração de código**, apenas acesso ao painel `/admin`:
- **Nome do App**: Título que aparece no navegador.
- **Logotipo e Fundo**: Upload direto via interface.
- **Cores**: Definição hexadecimal para botões e identidade visual.
- **Prêmios e Probabilidades**: Gerenciamento total de estoque e chances.

### C. Segurança (Cabeçalhos HTTP)
O arquivo `server.ts` já contém diretivas de **Content Security Policy (CSP)** e **Cache-Control**. Caso precise liberar novos domínios (ex: um novo servidor de imagens), altere a constante `csp` no `server.ts` antes de fazer o build da imagem.

---

## 🛠 4. Manutenção e Logs

Para ver o que está acontecendo dentro do container:
```bash
docker logs -f app-raspadinha
```

Para reiniciar o serviço:
```bash
docker restart app-raspadinha
```

---

## 🏗️ 5. Composição com Docker Compose (Opcional)

Se preferir usar Docker Compose, crie um arquivo `docker-compose.yml`:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./db:/app/db
    restart: always
```

E rode com: `docker-compose up -d`.
