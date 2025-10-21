# 🤖 Ollama Fine-tuning Setup for GeoSante

## 🎯 **Current Status: Ollama Integration Complete**

Your chatbot is running with Ollama's `llama3.2:3b` model for local AI inference!

### ✅ **Ready Files:**
- `server/data/convertForOllama.js` - Training data conversion
- `ollama_training.json` - 341 training examples
- `ollama_validation.json` - 86 validation examples
- `Modelfile` - Ollama model configuration
- `server/routes/chatbot.js` - Ollama integration

## 🚀 **How to Use:**

1. **Start Ollama service:**
   ```bash
   brew services start ollama
   ```

2. **Start your server:**
   ```bash
   cd server
   PORT=3002 npm run dev
   ```

3. **Test the chatbot:**
   ```bash
   curl -X POST http://localhost:3002/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "Quel est le risque de grippe à Paris ?"}'
   ```

## 🔄 **Advanced Fine-tuning:**

### **Create a Specialized Model:**
```bash
# Fine-tune for your health data
ollama create geosante-health-bot -f Modelfile
```

### **Use the Fine-tuned Model:**
```bash
echo "OLLAMA_MODEL=geosante-health-bot" >> .env
```

## 📊 **Training Data:**
- **341 examples** from real Sentiweb + vaccination data
- **86 validation examples** for evaluation
- **French health terminology** optimization
- **Department-specific risk analysis**

## 🎉 **Ready to Chat!**

Your AI chatbot is now powered by Ollama with specialized knowledge of French health data! 🚀
