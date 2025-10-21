const fs = require("fs");
const path = require("path");

/**
 * Convert Mistral JSONL format to Ollama training format
 */
function convertToOllamaFormat(mistralData) {
  const ollamaExamples = [];

  mistralData.forEach((example) => {
    if (example.messages && example.messages.length >= 2) {
      const userMessage = example.messages.find((m) => m.role === "user");
      const assistantMessage = example.messages.find(
        (m) => m.role === "assistant"
      );

      if (userMessage && assistantMessage) {
        // Ollama format: simple instruction-response pairs
        ollamaExamples.push({
          instruction: userMessage.content,
          output: assistantMessage.content,
        });
      }
    }
  });

  return ollamaExamples;
}

/**
 * Create Ollama training file
 */
function createOllamaTrainingFile() {
  try {
    console.log("🔄 Converting training data for Ollama...");

    // Read existing Mistral training data
    const trainingPath = path.join(__dirname, "mistral_training_data.jsonl");
    const validationPath = path.join(
      __dirname,
      "mistral_validation_data.jsonl"
    );

    if (!fs.existsSync(trainingPath)) {
      throw new Error(
        "Mistral training data not found. Run prepareMistralTrainingData.js first."
      );
    }

    // Read and parse training data
    const trainingContent = fs.readFileSync(trainingPath, "utf8");
    const trainingLines = trainingContent.trim().split("\n");
    const trainingData = trainingLines.map((line) => JSON.parse(line));

    // Read and parse validation data
    const validationContent = fs.readFileSync(validationPath, "utf8");
    const validationLines = validationContent.trim().split("\n");
    const validationData = validationLines.map((line) => JSON.parse(line));

    console.log(`📊 Converting ${trainingData.length} training examples...`);

    // Convert to Ollama format
    const ollamaTraining = convertToOllamaFormat(trainingData);
    const ollamaValidation = convertToOllamaFormat(validationData);

    // Save in Ollama format (simple JSON array)
    const ollamaTrainingPath = path.join(__dirname, "ollama_training.json");
    const ollamaValidationPath = path.join(__dirname, "ollama_validation.json");

    fs.writeFileSync(
      ollamaTrainingPath,
      JSON.stringify(ollamaTraining, null, 2)
    );
    fs.writeFileSync(
      ollamaValidationPath,
      JSON.stringify(ollamaValidation, null, 2)
    );

    console.log(`✅ Created Ollama training file: ${ollamaTrainingPath}`);
    console.log(`✅ Created Ollama validation file: ${ollamaValidationPath}`);
    console.log(`📈 Training examples: ${ollamaTraining.length}`);
    console.log(`📊 Validation examples: ${ollamaValidation.length}`);

    return {
      trainingFile: ollamaTrainingPath,
      validationFile: ollamaValidationPath,
      trainingCount: ollamaTraining.length,
      validationCount: ollamaValidation.length,
    };
  } catch (error) {
    console.error("❌ Error converting data for Ollama:", error);
    throw error;
  }
}

/**
 * Show sample of converted data
 */
function showSample() {
  try {
    const trainingPath = path.join(__dirname, "ollama_training.json");
    const data = JSON.parse(fs.readFileSync(trainingPath, "utf8"));

    console.log("\n📝 Sample training examples:");
    data.slice(0, 3).forEach((example, i) => {
      console.log(
        `\n${i + 1}. Instruction: ${example.instruction.substring(0, 100)}...`
      );
      console.log(`   Response: ${example.output.substring(0, 100)}...`);
    });
  } catch (error) {
    console.log("Could not show sample:", error.message);
  }
}

module.exports = {
  createOllamaTrainingFile,
  showSample,
  convertToOllamaFormat,
};

// Run if called directly
if (require.main === module) {
  const result = createOllamaTrainingFile();
  showSample();

  console.log("\n🚀 Next steps:");
  console.log("1. Run: ollama create geosante-chatbot -f ../Modelfile");
  console.log(
    '2. Test: ollama run geosante-chatbot "Quel est le risque à Paris ?"'
  );
  console.log("3. Update your chatbot route to use the fine-tuned model");
}
