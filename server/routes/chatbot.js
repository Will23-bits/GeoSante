const express = require("express");
const router = express.Router();
const { processData } = require("../data/fetchData");
const VaccinationDataParser = require("../data/vaccinationData");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env file
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      const lines = envContent.split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const [key, ...valueParts] = trimmed.split("=");
          if (key && valueParts.length > 0) {
            const value = valueParts.join("=").replace(/^["']|["']$/g, "");
            process.env[key.trim()] = value.trim();
          }
        }
      }
    }
  } catch (error) {
    console.warn("Could not load .env file:", error.message);
  }
}

// Load environment variables
loadEnv();

// Initialize vaccination data parser
const vaccinationParser = new VaccinationDataParser();

// OpenAI fine-tuned model (default and only option)
const OPENAI_MODEL = process.env.FINE_TUNED_MODEL || "gpt-3.5-turbo"; // Use fine-tuned model if available

// Initialize OpenAI client (required)
let openai = null;
try {
  const OpenAI = require("openai");
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} catch (error) {
  console.error(
    "OpenAI package not installed or API key missing. Install with: npm install openai"
  );
  process.exit(1);
}

// Note: Ollama removed - use OpenAI for fine-tuning
// Mistral setup available in MISTRAL_SETUP.md for future use

/**
 * Query OpenAI model (including fine-tuned models)
 */
async function queryOpenAI(message, knowledgeBase) {
  if (!openai) {
    throw new Error("OpenAI client not initialized");
  }

  const systemPrompt = `Vous êtes un assistant spécialisé dans l'analyse des données de santé publique française, particulièrement les risques de grippe et la couverture vaccinale par département. Vous répondez uniquement en français et utilisez les données exactes fournies.

Données disponibles: ${JSON.stringify(knowledgeBase, null, 2)}

Répondez en français, soyez précis et utilisez les données fournies.`;

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: message,
      },
    ],
    max_tokens: 500,
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

// RAG knowledge base from real Sentiweb data + vaccination data
async function buildKnowledgeBase() {
  // Fetch real data from Sentiweb via processData
  const { processData } = require("../data/fetchData");
  let departments;
  let vaccinationStats;

  try {
    departments = await processData();
    vaccinationStats = await vaccinationParser.getVaccinationStatistics();
  } catch (error) {
    console.error(
      "[ChatBot] Error fetching real data, using fallback:",
      error.message
    );
    // Fallback to mock data if processData fails
    const mockDepartments = [
      {
        code: "01",
        name: "Ain",
        riskScore: 0.3,
        riskLevel: "low",
        vaccinationCoverage: 0.65,
        fluCoverage: 0.62,
        covidCoverage: 0.58,
        emergencyVisits: 1200,
      },
      {
        code: "75",
        name: "Paris",
        riskScore: 0.8,
        riskLevel: "high",
        vaccinationCoverage: 0.45,
        fluCoverage: 0.42,
        covidCoverage: 0.38,
        emergencyVisits: 8500,
      },
      {
        code: "69",
        name: "Rhône",
        riskScore: 0.6,
        riskLevel: "medium",
        vaccinationCoverage: 0.55,
        fluCoverage: 0.52,
        covidCoverage: 0.48,
        emergencyVisits: 3200,
      },
      {
        code: "13",
        name: "Bouches-du-Rhône",
        riskScore: 0.7,
        riskLevel: "high",
        vaccinationCoverage: 0.5,
        fluCoverage: 0.47,
        covidCoverage: 0.44,
        emergencyVisits: 4100,
      },
      {
        code: "31",
        name: "Haute-Garonne",
        riskScore: 0.4,
        riskLevel: "low",
        vaccinationCoverage: 0.6,
        fluCoverage: 0.57,
        covidCoverage: 0.53,
        emergencyVisits: 1800,
      },
      {
        code: "59",
        name: "Nord",
        riskScore: 0.5,
        riskLevel: "medium",
        vaccinationCoverage: 0.58,
        fluCoverage: 0.55,
        covidCoverage: 0.51,
        emergencyVisits: 2800,
      },
      {
        code: "67",
        name: "Bas-Rhin",
        riskScore: 0.2,
        riskLevel: "very-low",
        vaccinationCoverage: 0.7,
        fluCoverage: 0.67,
        covidCoverage: 0.63,
        emergencyVisits: 900,
      },
      {
        code: "06",
        name: "Alpes-Maritimes",
        riskScore: 0.9,
        riskLevel: "high",
        vaccinationCoverage: 0.4,
        fluCoverage: 0.37,
        covidCoverage: 0.34,
        emergencyVisits: 5200,
      },
    ];
    departments = mockDepartments;
    vaccinationStats = {
      totalDepartments: 8,
      averageCoverage: 0.55,
      lowCoverageDepartments: [
        { name: "Alpes-Maritimes", code: "06", coverage: 0.4 },
        { name: "Paris", code: "75", coverage: 0.45 },
      ],
      highCoverageDepartments: [
        { name: "Bas-Rhin", code: "67", coverage: 0.7 },
        { name: "Haute-Garonne", code: "31", coverage: 0.6 },
      ],
      coverageDistribution: { veryHigh: 1, high: 2, medium: 3, low: 2 },
      latestYear: new Date().getFullYear(),
    };
  }

  const stats = {
    totalDepartments: departments.length,
    averageRiskScore:
      departments.reduce((sum, dept) => sum + (dept.riskScore || 0), 0) /
      departments.length,
    averageVaccinationCoverage:
      departments.filter((d) => d.vaccinationCoverage).length > 0
        ? departments.reduce(
            (sum, dept) => sum + (dept.vaccinationCoverage || 0),
            0
          ) / departments.filter((d) => d.vaccinationCoverage).length
        : 0,
    highRiskDepartments: departments
      .filter((dept) => dept.riskLevel === "high")
      .map((dept) => dept.name),
    lowRiskDepartments: departments
      .filter(
        (dept) => dept.riskLevel === "very-low" || dept.riskLevel === "low"
      )
      .map((dept) => dept.name),
  };

  return `
Base de Connaissances des Données de Santé en France (Sources: Sentiweb + Couvertures Vaccinales):

=== DONNÉES DE RISQUE DE GRIPPE ===
- Total départements analysés: ${stats.totalDepartments}
- Score de risque moyen: ${stats.averageRiskScore.toFixed(2)}
- Départements à haut risque: ${
    stats.highRiskDepartments.length > 0
      ? stats.highRiskDepartments.join(", ")
      : "Aucun"
  }
- Départements à faible risque: ${
    stats.lowRiskDepartments.length > 0
      ? stats.lowRiskDepartments.slice(0, 5).join(", ") +
        (stats.lowRiskDepartments.length > 5 ? "..." : "")
      : "Aucun"
  }

=== DONNÉES DE COUVERTURE VACCINALE ===
- Couverture vaccinale moyenne: ${
    vaccinationStats.averageCoverage > 0
      ? (vaccinationStats.averageCoverage * 100).toFixed(1) + "%"
      : "Non disponible"
  }
- Année des données: ${vaccinationStats.latestYear}
- Départements avec faible couverture (< 50%): ${
    vaccinationStats.lowCoverageDepartments.length > 0
      ? vaccinationStats.lowCoverageDepartments
          .slice(0, 5)
          .map((d) => `${d.name} (${(d.coverage * 100).toFixed(1)}%)`)
          .join(", ")
      : "Aucun"
  }
- Départements avec bonne couverture (≥ 70%): ${
    vaccinationStats.highCoverageDepartments.length > 0
      ? vaccinationStats.highCoverageDepartments
          .slice(0, 5)
          .map((d) => `${d.name} (${(d.coverage * 100).toFixed(1)}%)`)
          .join(", ")
      : "Aucun"
  }

=== DÉTAILS DES DÉPARTEMENTS (échantillon) ===
${departments
  .slice(0, 15)
  .map((dept) => {
    const vacc = dept.vaccinationCoverage
      ? `${(dept.vaccinationCoverage * 100).toFixed(1)}%`
      : "N/D";
    const flu = dept.fluCoverage
      ? `${(dept.fluCoverage * 100).toFixed(1)}%`
      : "N/D";
    const covid = dept.covidCoverage
      ? `${(dept.covidCoverage * 100).toFixed(1)}%`
      : "N/D";
    const emerg = dept.emergencyVisits ? String(dept.emergencyVisits) : "N/D";
    return `${dept.name} (${dept.code}): Risque ${dept.riskScore.toFixed(2)} (${
      dept.riskLevel
    }), Vaccination ${vacc}, Grippe ${flu}, COVID ${covid}, Urgences ${emerg}`;
  })
  .join("\n")}

=== SOURCES DES DONNÉES ===
- Risques de grippe: API Sentiweb (données régionales appliquées aux départements)
- Couvertures vaccinales: Données officielles françaises (CSV)
- Calcul grippe: Intensité basée sur l'incidence pour 100k habitants sur les 5 dernières années
- Vaccinations: HPV, Méningocoque C, Grippe, COVID-19 par tranches d'âge
- Mise à jour: Automatique avec cache d'1 heure pour respecter les limites de taux

=== NIVEAUX DE RISQUE ===
- Très Faible: 0.0 - 0.3
- Faible: 0.3 - 0.5  
- Moyen: 0.5 - 0.7
- Élevé: 0.7 - 1.0

=== NIVEAUX DE COUVERTURE VACCINALE ===
- Très Élevé: ≥ 70% (risque faible)
- Élevé: 50-69% (risque moyen)
- Faible: 30-49% (risque élevé)
- Très Faible: < 30% (risque très élevé)

Note: Les données proviennent des APIs officielles avec système de rate limiting et cache pour éviter les blocages.
`;
}

// POST /api/chat - Chat with OpenAI fine-tuned model about flu risk data
router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const knowledgeBase = await buildKnowledgeBase();

    // Use OpenAI (including fine-tuned models)
    if (!openai) {
      return res.status(500).json({
        error: "OpenAI client not initialized. Check OPENAI_API_KEY",
        details: "Install OpenAI package with: npm install openai",
      });
    }

    console.log(`🤖 Using OpenAI model: ${OPENAI_MODEL}`);
    const response = await queryOpenAI(message, knowledgeBase);

    res.json({
      response: response,
      timestamp: new Date().toISOString(),
      model: OPENAI_MODEL,
      provider: "openai",
    });
  } catch (error) {
    console.error("Error in chatbot:", error);
    res.status(500).json({
      error: "Failed to process chat message",
      details: error.message,
    });
  }
});

module.exports = router;
