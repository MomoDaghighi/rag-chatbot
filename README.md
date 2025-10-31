```markdown
# RAG Chatbot – Node.js + TypeScript + Docker

A **production-ready RAG-based chatbot** with **semantic caching per session**, **chat history**, **Swagger docs**, **rate limiting**, and **structured logging**.

---

## Features

| Feature | Description |
|--------|-------------|
| **RAG** | Uses `knowledge.txt` + embedding similarity |
| **Semantic Caching** | Redis caches responses **per user + session** with **≥85% cosine similarity** |
| **Chat History** | MongoDB stores messages with `userId`, `sessionId`, and `cached` flag |
| **Swagger UI** | Interactive API docs at `/docs` |
| **Rate Limiting** | 60 req/min per IP |
| **Zod Validation** | Strong input validation |
| **Winston Logging** | Structured logs with timestamps |
| **Docker + Compose** | Fully containerized (Node, MongoDB, Redis) |
| **Mock Embeddings** | 384-dim smart mock (fallback) – works out-of-the-box |

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
├── config/           # Environment config (via .env)
├── models/           # Mongoose models (Chat)
├── services/         # Core logic (chat, cache, embedding, llm)
├── utils/            # Logger, cosineSimilarity, chunker
├── swagger.ts        # Swagger docs
├── index.ts          # Entry point
knowledge.txt         # RAG knowledge base
docker-compose.yml
Dockerfile
.env                  # Required (copied from .env.example)
```

---

## Setup

### 1. Clone & Install

```bash
git clone <your-repo>
cd rag-chatbot
cp .env.example .env
```

### 2. Edit `.env` (Required for Docker)

```env
PORT=3000
MONGODB_URI=mongodb://mongo:27017/rag-chat
REDIS_URL=redis://redis:6379
EMBEDDING_PROVIDER=mock   # Use mock for testing (384-dim)
```

> **Important**: `.env` **must** be loaded via `env_file` in `docker-compose.yml`

### 3. Run with Docker

```bash
docker compose down -v        # Clean start (optional)
docker compose up --build
```

Server: `http://localhost:3000`  
Swagger: `http://localhost:3000/docs`  
Health: `http://localhost:3000/health`

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
  "timestamp": "2025-10-31T...",
  "duration": 9
}
```

> `cached: true` → Answer from **semantic cache** (per `userId` + `sessionId`)

---

### `GET /history?userId=u1&sessionId=s1`

Get **session-specific** chat history (paginated).

```bash
curl "http://localhost:3000/history?userId=u1&sessionId=s1&page=1&limit=10"
```

#### Response

```json
{
  "data": [
    {
      "_id": "6904a8c8d0144c6820c1288b",
      "message": "Installation steps?",
      "response": "To install the HooshPod App...",
      "cached": true,
      "timestamp": "2025-10-31T12:17:12.867Z",
      "sessionId": "s1"
    },
    {
      "_id": "6904a8b6d0144c6820c12889",
      "message": "How to install the product?",
      "response": "To install the HooshPod App...",
      "cached": false,
      "timestamp": "2025-10-31T12:16:54.951Z",
      "sessionId": "s1"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "pages": 1
  }
}
```

> **Note**: `cached: true` means response was **reused from Redis cache**

---

### `GET /health`

```json
{ "status": "OK", "timestamp": "2025-10-31T..." }
```

---

## How Semantic Caching Works

1. User asks: `"How to install?"` → embedding → stored in Redis  
   Key: `cache:u1:s1`
2. Next time: `"Installation steps?"` → same embedding → **cosine similarity ≥ 0.85** → **cache hit**
3. Response returned instantly → **no LLM call**
4. `cached: true` saved in **MongoDB history**

> Fast, smart, and saves LLM cost!

---

## Development

```bash
npm run dev        # Hot reload (ts-node-dev)
npm run build      # Compile TS → dist/
npm start          # Run built app
```

---

## Testing Cache & History

```bash
# 1. First question
curl -X POST http://localhost:3000/chat -d '{
  "message":"How to install the product?",
  "userId":"u1",
  "sessionId":"s1"
}' -H "Content-Type: application/json"

# 2. Similar question → should be cached
curl -X POST http://localhost:3000/chat -d '{
  "message":"Installation steps?",
  "userId":"u1",
  "sessionId":"s1"
}' -H "Content-Type: application/json"

# 3. Check history
curl "http://localhost:3000/history?userId=u1&sessionId=s1"
```

**Look for in logs:**
```log
Using smart mock embedding (384-dim)
[Cache] Hit by similarity: 0.94
Chat saved to DB { cached: true }
```

---

## Production Tips

- Use real `OPENAI_API_KEY` or `COHERE_API_KEY`
- Set `EMBEDDING_PROVIDER=openai` or `cohere`
- Add `OPENROUTER_API_KEY` for real LLM
- Increase Redis TTL: `86400` (24h) — already set
- Add Redis persistence in `docker-compose.yml`:

```yaml
redis:
  image: redis:7
  command: redis-server --appendonly yes
  volumes:
    - redis-data:/data
```

---

## Docker Compose (Updated)

```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file:
      - .env
    depends_on: [mongo, redis]
    volumes:
      - .:/app
      - /app/node_modules

  mongo:
    image: mongo:6
    ports: ["27017:27017"]
    volumes: ["mongo-data:/data/db"]

  redis:
    image: redis:7
    ports: ["6379:6379"]
    command: redis-server --appendonly yes
    volumes: ["redis-data:/data"]

volumes:
  mongo-data:
  redis-data:
```

---

## Author

**Mohammad Mahdi Daghighi**  
Full-Stack Developer | AI & Backend Specialist

---

## License

MIT
```