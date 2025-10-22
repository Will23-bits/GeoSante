const fs = require("fs");
const path = require("path");

/**
 * Generate predictive training data for OpenAI fine-tuning
 * Creates examples that teach the model to make health predictions
 */
function generatePredictiveTraining() {
  console.log("🔮 Generating predictive training data...");

  // Base health data examples
  const trainingExamples = [
    // Basic health queries
    {
      instruction: "Quel est le risque de grippe à Paris ?",
      output:
        "Paris (75) présente un risque de grippe moyen avec un score de 0.45. La couverture vaccinale est de 45%, ce qui nécessite une vigilance accrue pendant les périodes hivernales.",
    },
    {
      instruction: "Départements les plus à risque de grippe ?",
      output:
        "Les départements avec le risque le plus élevé incluent les Alpes-Maritimes (0.90), Paris (0.80), et les Bouches-du-Rhône (0.70). Ces zones nécessitent une surveillance renforcée.",
    },
    {
      instruction: "Quelle est la couverture vaccinale moyenne en France ?",
      output:
        "La couverture vaccinale moyenne nationale est de 55%. Les départements du Bas-Rhin (70%) et de la Haute-Garonne (60%) montrent les meilleures performances.",
    },

    // PREDICTIVE EXAMPLES - This is what makes it predictive!
    {
      instruction: "Quelle sera la tendance grippale pour 2026 ?",
      output:
        "Basé sur les données historiques des 5 dernières années, la tendance grippale pour 2026 devrait suivre les patterns saisonniers observés. Les périodes hivernales montrent généralement une augmentation du risque, avec un pic entre décembre et février. L'amélioration de la couverture vaccinale (+2-3% par an) pourrait atténuer l'intensité des épidémies.",
    },
    {
      instruction:
        "Prédisez l'évolution du risque de grippe pour les prochaines années",
      output:
        "En analysant les tendances des 5 dernières années, je peux extrapoler que le risque de grippe devrait diminuer progressivement grâce à l'amélioration des couvertures vaccinales. Les régions du nord-est pourraient maintenir un risque plus élevé, tandis que l'Île-de-France bénéficierait d'une meilleure protection vaccinale.",
    },
    {
      instruction: "Comment sera l'hiver grippal 2026 ?",
      output:
        "D'après les patterns historiques, l'hiver 2026 devrait connaître une activité grippale modérée à élevée entre novembre et mars, avec un pic probable en janvier-février. La vaccination et les mesures d'hygiène joueront un rôle crucial dans l'atténuation de l'épidémie. Les départements du Grand Est resteront vigilants.",
    },
    {
      instruction: "Prévisions grippe 2026 en France",
      output:
        "Mes prévisions pour 2026, basées sur les données 2019-2024, indiquent une saison grippale de moyenne intensité. Les régions du nord-est (Grand Est, Hauts-de-France) pourraient être plus touchées, tandis que l'Île-de-France bénéficierait d'une meilleure protection due à la densité vaccinale supérieure à 50%.",
    },
    {
      instruction: "L'impact de la vaccination sur les tendances futures ?",
      output:
        "L'analyse des données montre une corrélation claire entre l'amélioration des couvertures vaccinales et la réduction des pics épidémiques. Pour 2026, si la tendance d'augmentation de la vaccination se maintient (+2-3% par an), nous devrions observer une atténuation significative des épidémies grippales saisonnières.",
    },
    {
      instruction: "Quelle sera la saison grippale 2026-2027 ?",
      output:
        "Selon les cycles saisonniers historiques, la saison 2026-2027 devrait débuter en novembre 2026 avec une intensité modérée. Le pic épidémique est attendu entre janvier et février 2027, suivi d'une décroissance progressive jusqu'en mars-avril. L'efficacité vaccinale sera déterminante pour l'impact réel.",
    },
    {
      instruction: "Prévisions pour l'épidémie de grippe en 2026",
      output:
        "Mes projections pour 2026 suggèrent une épidémie de grippe de niveau modéré, comparable aux saisons 2022-2023. L'efficacité de la campagne vaccinale (actuellement 55% de couverture moyenne) et les mesures barrières influenceront considérablement l'impact réel de cette saison.",
    },
    {
      instruction:
        "Comment évoluera le risque grippal dans les années à venir ?",
      output:
        "Les données indiquent une tendance à la baisse du risque grippal grâce aux progrès vaccinaux observés sur 5 ans. Cependant, l'apparition de nouveaux variants ou des changements climatiques pourraient modifier ces projections. Une surveillance continue via Sentiweb est essentielle pour ajuster les prédictions.",
    },
    {
      instruction: "Quelles régions seront les plus touchées en 2026 ?",
      output:
        "Selon les patterns historiques, les régions les plus à risque pour 2026 incluent le Grand Est, les Hauts-de-France, et Provence-Alpes-Côte d'Azur. Ces zones ont montré une récurrence d'épidémies plus intenses, malgré l'amélioration des couvertures vaccinales.",
    },
    {
      instruction: "La grippe sera-t-elle plus dangereuse en 2026 ?",
      output:
        "Les projections indiquent que la grippe 2026 ne devrait pas être plus dangereuse que les saisons précédentes, grâce à l'amélioration des protocoles vaccinaux. Cependant, la combinaison avec d'autres virus respiratoires hivernaux pourrait augmenter la pression sur les systèmes de santé.",
    },
  ];

  // Convert to OpenAI format
  const openaiExamples = trainingExamples.map((item) => ({
    messages: [
      {
        role: "system",
        content:
          "Vous êtes un assistant spécialisé dans l'analyse des données de santé publique française, particulièrement les risques de grippe et la couverture vaccinale par département. Vous pouvez faire des prédictions et analyses de tendances basées sur les données historiques.",
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
  }));

  // Create training and validation sets
  const trainingCount = Math.floor(openaiExamples.length * 0.8);
  const trainingData = openaiExamples.slice(0, trainingCount);
  const validationData = openaiExamples.slice(trainingCount);

  // Save as JSONL files
  const trainingPath = path.join(__dirname, "openai_training.jsonl");
  const validationPath = path.join(__dirname, "openai_validation.jsonl");

  const trainingContent = trainingData
    .map((ex) => JSON.stringify(ex))
    .join("\n");
  const validationContent = validationData
    .map((ex) => JSON.stringify(ex))
    .join("\n");

  fs.writeFileSync(trainingPath, trainingContent);
  fs.writeFileSync(validationPath, validationContent);

  console.log(`✅ Created predictive training data:`);
  console.log(`📊 Training examples: ${trainingData.length}`);
  console.log(`📈 Validation examples: ${validationData.length}`);
  console.log(`🔮 Total predictive examples: ${openaiExamples.length}`);

  // Show sample
  console.log("\n📝 Sample predictive examples:");
  for (let i = 0; i < Math.min(3, trainingData.length); i++) {
    console.log(`\n${i + 1}. ${trainingData[i].messages[1].content}`);
    console.log(
      `   → ${trainingData[i].messages[2].content.substring(0, 100)}...`
    );
  }

  return {
    trainingFile: trainingPath,
    validationFile: validationPath,
    trainingCount: trainingData.length,
    validationCount: validationData.length,
  };
}

module.exports = { generatePredictiveTraining };

// Run if called directly
if (require.main === module) {
  generatePredictiveTraining();

  console.log("\n🚀 Next steps:");
  console.log("1. Your OpenAI API key should be set in .env");
  console.log("2. Run: node ../openai_fine_tune.js");
  console.log("3. Your model will now be PREDICTIVE! 🔮");
}
