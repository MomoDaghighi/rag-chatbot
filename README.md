```markdown
# RAG Chatbot – Node.js + TypeScript + Docker

A **production-ready RAG-based chatbot** with **semantic caching**, **chat history**, **Swagger docs**, **rate limiting**, and **structured logging**.

---

## Features

| Feature | Description |
|--------|-------------|
| **RAG** | Uses `knowledge.txt` + embedding similarity |
| **Semantic Caching** | Redis caches responses by **>90% embedding similarity** |
| **Chat History** | MongoDB stores messages with `userId` & `sessionId` |
| **Swagger UI** | Interactive API docs at `/docs` |
| **Rate Limiting** | 60 req/min per IP |
| **Zod Validation** | Strong input validation |
| **Winston Logging** | Structured logs with timestamps |
| **Docker + Compose** | Fully containerized (Node, MongoDB, Redis) |

---

## Tech Stack

```
Node.js 18+ | TypeScript | Express
MongoDB (Mongoose) | Redis (ioredis)
OpenRouter LLM | Mock Embeddings (fallback)
Zod | Rate-limit | Swagger | Winston
Docker + docker-compose
```

---

## Project Structure

```
src/
├── config/           # Environment config
├── models/           # Mongoose models
├── services/         # Core logic (chat, cache, embedding, llm)
├── utils/            # Logger, cosine, chunker
├── swagger.ts        # Swagger docs
├── index.ts          # Entry point
knowledge.txt         # RAG knowledge base
docker-compose.yml
Dockerfile
.env.example
```

---

## Setup

### 1. Clone & Install

```bash
git clone <your-repo>
cd rag-chatbot
cp .env.example .env
```

### 2. Edit `.env`

```env
PORT=3000
MONGODB_URI=mongodb://mongo:27017/rag-chat
REDIS_URL=redis://redis:6379

# Optional: Real LLM & Embeddings
OPENROUTER_API_KEY=sk-or-v1-...
OPENAI_API_KEY=sk-...
COHERE_API_KEY=...
EMBEDDING_PROVIDER=mock  # or "openai", "cohere"
```

### 3. Run with Docker

```bash
docker compose up --build
```

Server: `http://localhost:3000`  
Swagger: `http://localhost:3000/docs`

---

## API Endpoints

### `POST /chat`

Send a message to the chatbot.

```json
{
  "message": "How to install the product?",
  "userId": "u1",
  "sessionId": "s1"
}
```

#### Response

```json
{
  "response": "Step 1: Download...\nStep 2: npm install...",
  "cached": true,
  "timestamp": "2025-10-28T...",
  "duration": 45
}
```

> `cached: true` → Answer from **semantic cache**

---

### `GET /history/:userId`

Get chat history (paginated).

```bash
curl "http://localhost:3000/history/u1?page=1&limit=10"
```

#### Response

```json
{
  "data": [ /* messages */ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

---

### `GET /health`

```json
{ "status": "OK", "timestamp": "..." }
```

---

## How Semantic Caching Works

1. User asks: `"How to install?"`
2. Embedding generated → stored in Redis with key: `cache:msg:How to install?`
3. Next time: `"Installation steps?"`
4. Embedding compared → **>90% similarity** → **cache hit**

> Fast, smart, and saves LLM cost!

---

## Development

```bash
npm run dev        # Hot reload
npm run build      # Compile TS
npm start          # Run built app
```

---

## Testing Cache

```bash
# First question
curl -X POST http://localhost:3000/chat -d '{"message":"How to install?","userId":"u1","sessionId":"s1"}' -H "Content-Type: application/json"

# Similar question → should be cached
curl -X POST http://localhost:3000/chat -d '{"message":"Installation steps?","userId":"u1","sessionId":"s1"}' -H "Content-Type: application/json"
```

Look for:
```log
[Cache] Hit by similarity: 0.945
```

---

## Production Tips

- Use real `OPENAI_API_KEY` or `COHERE_API_KEY`
- Set `EMBEDDING_PROVIDER=openai`
- Add `OPENROUTER_API_KEY` for real LLM
- Increase Redis TTL: `3600` → `86400` (24h)
- Add Redis persistence in `docker-compose.yml`

---

## Docker Compose

```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    depends_on: [mongo, redis]
    environment:
      - MONGODB_URI=mongodb://mongo:27017/rag-chat
      - REDIS_URL=redis://redis:6379

  mongo:
    image: mongo:6
    ports: ["27017:27017"]
    volumes: ["mongo-data:/data/db"]

  redis:
    image: redis:7
    ports: ["6379:6379"]
```

---

## Author

**Mohammad Mahdi**  
Full-Stack Developer | AI & Backend Specialist

---

## License

MIT
