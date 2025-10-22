const fs = require("fs");
const path = require("path");

/**
 * Convert training data to OpenAI fine-tuning format
 * OpenAI expects: {"messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
 */
function convertToOpenAIFormat(data) {
  const openaiExamples = [];

  data.forEach((item) => {
    // Create proper conversation format for OpenAI
    const example = {
      messages: [
        {
          role: "system",
          content:
            "Vous êtes un assistant spécialisé dans l'analyse des données de santé publique française, particulièrement les risques de grippe et la couverture vaccinale par département. Vous répondez uniquement en français et utilisez les données exactes fournies dans les conversations.",
        },
        {
          role: "user",
          content: item.instruction,
        },
        {
          role: "assistant",
          content: item.output,
        },
      ],
    };
    openaiExamples.push(example);
  });

  return openaiExamples;
}

/**
 * Create OpenAI training and validation files
 */
function createOpenAIFiles() {
  try {
    console.log("🔄 Converting training data to OpenAI format...");

    // Read existing Ollama training data
    const trainingPath = path.join(__dirname, "ollama_training.json");
    const validationPath = path.join(__dirname, "ollama_validation.json");

    if (!fs.existsSync(trainingPath)) {
      throw new Error(
        "Training data not found. Run convertForOllama.js first."
      );
    }

    // Load and convert training data
    const trainData = JSON.parse(fs.readFileSync(trainingPath, "utf8"));
    const valData = JSON.parse(fs.readFileSync(validationPath, "utf8"));

    console.log(`📊 Converting ${trainData.length} training examples...`);

    // Add PREDICTIVE training examples to teach the model forecasting
    const predictiveExamples = [
      {
        instruction: "Quelle sera la tendance grippale pour 2026 ?",
        output:
          "Basé sur les données historiques des 5 dernières années, la tendance grippale pour 2026 devrait suivre les patterns saisonniers observés. Les périodes hivernales montrent généralement une augmentation du risque, avec un pic entre décembre et février. L'amélioration de la couverture vaccinale pourrait atténuer l'intensité des épidémies.",
      },
      {
        instruction:
          "Prédisez l'évolution du risque de grippe pour les prochaines années",
        output:
          "En analysant les tendances des 5 dernières années, je peux extrapoler que le risque de grippe devrait diminuer progressivement grâce à l'amélioration des couvertures vaccinales. Cependant, des facteurs externes comme les variants viraux ou les comportements saisonniers peuvent influencer ces prédictions.",
      },
      {
        instruction: "Comment sera l'hiver grippal 2026 ?",
        output:
          "D'après les patterns historiques, l'hiver 2026 devrait connaître une activité grippale modérée à élevée entre novembre et mars, avec un pic probable en janvier-février. La vaccination et les mesures d'hygiène joueront un rôle crucial dans l'atténuation de l'épidémie.",
      },
      {
        instruction: "Prévisions grippe 2026 en France",
        output:
          "Mes prévisions pour 2026, basées sur les données 2019-2024, indiquent une saison grippale de moyenne intensité. Les régions du nord-est (Grand Est, Hauts-de-France) pourraient être plus touchées, tandis que l'Île-de-France bénéficierait d'une meilleure protection due à la densité vaccinale.",
      },
      {
        instruction: "L'impact de la vaccination sur les tendances futures ?",
        output:
          "L'analyse des données montre une corrélation entre l'amélioration des couvertures vaccinales et la réduction des pics épidémiques. Pour 2026, si la tendance d'augmentation de la vaccination se maintient (+2-3% par an), nous devrions observer une atténuation des épidémies grippales saisonnières.",
      },
      {
        instruction: "Quelle sera la saison grippale 2026-2027 ?",
        output:
          "Selon les cycles saisonniers historiques, la saison 2026-2027 devrait débuter en novembre 2026 avec une intensité modérée. Le pic épidémique est attendu entre janvier et février 2027, suivi d'une décroissance progressive jusqu'en mars-avril.",
      },
      {
        instruction: "Prévisions pour l'épidémie de grippe en 2026",
        output:
          "Mes projections pour 2026 suggèrent une épidémie de grippe de niveau modéré, comparable aux saisons 2022-2023. L'efficacité de la campagne vaccinale et les mesures barrières influenceront considérablement l'impact réel de cette saison.",
      },
      {
        instruction:
          "Comment évoluera le risque grippal dans les années à venir ?",
        output:
          "Les données indiquent une tendance à la baisse du risque grippal grâce aux progrès vaccinaux. Cependant, l'apparition de nouveaux variants ou des changements climatiques pourraient modifier ces projections. Une surveillance continue est essentielle.",
      },
    ];

    // Add predictive examples to training data
    trainData.push(...predictiveExamples);
    console.log(
      `📈 Added ${predictiveExamples.length} predictive training examples`
    );

    // Convert to OpenAI format
    const openaiTraining = convertToOpenAIFormat(trainData);
    const openaiValidation = convertToOpenAIFormat(valData);

    // Save as JSONL files (OpenAI format)
    const trainingOutputPath = path.join(__dirname, "openai_training.jsonl");
    const validationOutputPath = path.join(
      __dirname,
      "openai_validation.jsonl"
    );

    const trainingContent = openaiTraining
      .map((example) => JSON.stringify(example))
      .join("\n");
    const validationContent = openaiValidation
      .map((example) => JSON.stringify(example))
      .join("\n");

    fs.writeFileSync(trainingOutputPath, trainingContent);
    fs.writeFileSync(validationOutputPath, validationContent);

    console.log(`✅ Created OpenAI training file: ${trainingOutputPath}`);
    console.log(`✅ Created OpenAI validation file: ${validationOutputPath}`);
    console.log(`📈 Training examples: ${openaiTraining.length}`);
    console.log(`📊 Validation examples: ${openaiValidation.length}`);

    return {
      trainingFile: trainingOutputPath,
      validationFile: validationOutputPath,
      trainingCount: openaiTraining.length,
      validationCount: openaiValidation.length,
    };
  } catch (error) {
    console.error("❌ Error converting data for OpenAI:", error);
    throw error;
  }
}

/**
 * Show sample of converted data
 */
function showSample() {
  try {
    const trainingPath = path.join(__dirname, "openai_training.jsonl");
    const content = fs.readFileSync(trainingPath, "utf8");
    const lines = content.trim().split("\n");

    console.log("\n📝 Sample OpenAI training examples:");
    for (let i = 0; i < Math.min(2, lines.length); i++) {
      const example = JSON.parse(lines[i]);
      console.log(
        `\n${i + 1}. User: ${example.messages[1].content.substring(0, 80)}...`
      );
      console.log(
        `   Assistant: ${example.messages[2].content.substring(0, 80)}...`
      );
    }
  } catch (error) {
    console.log("Could not show sample:", error.message);
  }
}

module.exports = {
  createOpenAIFiles,
  showSample,
  convertToOpenAIFormat,
};

// Run if called directly
if (require.main === module) {
  const result = createOpenAIFiles();
  showSample();

  console.log("\n🚀 Next steps:");
  console.log(
    "1. Get OpenAI API key from https://platform.openai.com/api-keys"
  );
  console.log("2. Set OPENAI_API_KEY environment variable");
  console.log("3. Run: node openai_fine_tune.js");
}
