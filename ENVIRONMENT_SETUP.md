# Environment Setup for GeoSante Chatbot

## Required Environment Variables

Create a `.env` file in your project root with the following variables:

```bash
# Mistral AI Configuration (optional if using Ollama)
MISTRAL_API_KEY=your-mistral-api-key-here

# Model Selection
# Set USE_OLLAMA=true to use local Ollama, false for Mistral API
USE_OLLAMA=true

# Ollama Model Configuration
OLLAMA_MODEL=llama3.2:3b

# Fine-tuned Model (when available from Mistral)
# FINE_TUNED_MODEL=ft:mistral-small:your-project-id

# Server Configuration
PORT=3002
HOST=127.0.0.1
```

## Setup Instructions

### Option 1: Use Ollama (Recommended - Local & Free)

1. **Install Ollama** (already done):

   ```bash
   brew install ollama
   brew services start ollama
   ollama pull llama3.2:3b
   ```

2. **Set environment variable**:

   ```bash
   echo "USE_OLLAMA=true" >> .env
   echo "OLLAMA_MODEL=llama3.2:3b" >> .env
   ```

3. **Start your server**:
   ```bash
   cd server
   npm run dev
   ```

### Option 2: Use Mistral API (Cloud)

1. **Get Mistral API key** from [mistral.ai](https://mistral.ai)

2. **Set environment variables**:

   ```bash
   echo "USE_OLLAMA=false" >> .env
   echo "MISTRAL_API_KEY=your-key-here" >> .env
   ```

3. **Start your server**:
   ```bash
   cd server
   npm run dev
   ```

## Testing Your Setup

### Test Ollama Directly

```bash
# Test if Ollama is working
ollama run llama3.2:3b "Bonjour, pouvez-vous m'aider avec l'analyse de données de santé ?"

# Expected: Should respond in French about health data analysis
```

### Test the Chatbot API

```bash
# Start server in one terminal
cd server && PORT=3002 npm run dev

# Test in another terminal
curl -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Quel est le risque de grippe à Paris ?"}'
```

### Expected Response Format

```json
{
  "response": "**Paris (75)**: Risque moyen (0.45). Couverture vaccinale: 45%. Surveillance recommandée.",
  "timestamp": "2024-12-15T10:30:00.000Z",
  "model": "llama3.2:3b",
  "provider": "ollama"
}
```

## Troubleshooting

### Ollama Not Responding

```bash
# Check if Ollama service is running
brew services list | grep ollama

# Restart Ollama if needed
brew services restart ollama

# Check Ollama version
ollama --version
```

### Server Port Issues

```bash
# Try a different port
PORT=3003 npm run dev

# Check what's using port 3002
lsof -i :3002
```

### Model Not Found

```bash
# List available models
ollama list

# Pull the model if missing
ollama pull llama3.2:3b
```
