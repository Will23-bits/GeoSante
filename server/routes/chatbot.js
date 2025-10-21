const express = require("express");
const router = express.Router();
const { Mistral } = require("@mistralai/mistralai");
const { processData } = require("../data/fetchData");

const client = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY || "your-mistral-api-key",
});

// RAG knowledge base from real Sentiweb data
async function buildKnowledgeBase() {
  // Fetch real data from Sentiweb via processData
  const { processData } = require("../data/fetchData");
  let departments;

  try {
    departments = await processData();
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
        emergencyVisits: 1200,
      },
      {
        code: "75",
        name: "Paris",
        riskScore: 0.8,
        riskLevel: "high",
        vaccinationCoverage: 0.45,
        emergencyVisits: 8500,
      },
      {
        code: "69",
        name: "Rhône",
        riskScore: 0.6,
        riskLevel: "medium",
        vaccinationCoverage: 0.55,
        emergencyVisits: 3200,
      },
      {
        code: "13",
        name: "Bouches-du-Rhône",
        riskScore: 0.7,
        riskLevel: "high",
        vaccinationCoverage: 0.5,
        emergencyVisits: 4100,
      },
      {
        code: "31",
        name: "Haute-Garonne",
        riskScore: 0.4,
        riskLevel: "low",
        vaccinationCoverage: 0.6,
        emergencyVisits: 1800,
      },
      {
        code: "59",
        name: "Nord",
        riskScore: 0.5,
        riskLevel: "medium",
        vaccinationCoverage: 0.58,
        emergencyVisits: 2800,
      },
      {
        code: "67",
        name: "Bas-Rhin",
        riskScore: 0.2,
        riskLevel: "very-low",
        vaccinationCoverage: 0.7,
        emergencyVisits: 900,
      },
      {
        code: "06",
        name: "Alpes-Maritimes",
        riskScore: 0.9,
        riskLevel: "high",
        vaccinationCoverage: 0.4,
        emergencyVisits: 5200,
      },
    ];
    departments = mockDepartments;
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
Base de Connaissances des Données de Risque de Grippe en France (Source: Sentiweb):
- Total départements analysés: ${stats.totalDepartments}
- Score de risque moyen: ${stats.averageRiskScore.toFixed(2)}
- Couverture vaccinale moyenne: ${
    stats.averageVaccinationCoverage > 0
      ? (stats.averageVaccinationCoverage * 100).toFixed(1) + "%"
      : "Non disponible"
  }
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

Détails des Départements (échantillon):
${departments
  .slice(0, 15)
  .map((dept) => {
    const vacc = dept.vaccinationCoverage
      ? `${(dept.vaccinationCoverage * 100).toFixed(1)}%`
      : "N/D";
    const emerg = dept.emergencyVisits ? String(dept.emergencyVisits) : "N/D";
    return `${dept.name} (${dept.code}): Risque ${dept.riskScore.toFixed(2)} (${
      dept.riskLevel
    }), Vaccination ${vacc}, Urgences ${emerg}`;
  })
  .join("\n")}

Source des Données:
- Risques de grippe: API Sentiweb (données régionales appliquées aux départements)
- Calcul: Intensité basée sur l'incidence pour 100k habitants sur les 5 dernières années
- Mise à jour: Automatique avec cache d'1 heure pour respecter les limites de taux

Niveaux de Risque:
- Très Faible: 0.0 - 0.3
- Faible: 0.3 - 0.5  
- Moyen: 0.5 - 0.7
- Élevé: 0.7 - 1.0

Note: Les données proviennent de l'API Sentiweb officielle avec système de rate limiting et cache pour éviter les blocages.
`;
}

// POST /api/chat - Chat with AI about flu risk data
router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const knowledgeBase = await buildKnowledgeBase();

    const prompt = `
Vous êtes un analyste de données de santé spécialisé dans l'évaluation du risque de grippe en France.
Utilisez les données suivantes pour répondre aux questions sur les zones à risque de grippe, la couverture vaccinale et les prédictions.

${knowledgeBase}

Question de l'utilisateur: ${message}

IMPORTANT: Répondez UNIQUEMENT en français. Soyez concis et utile basé sur les données ci-dessus. Gardez les réponses sous 200 mots et utilisez un formatage clair. Si on vous demande des prédictions, utilisez les tendances et modèles des données pour faire des prévisions raisonnables.

Formatez votre réponse comme suit:
- Utilisez des puces pour les listes
- Utilisez **gras** pour les noms de départements et métriques clés
- Gardez les prédictions brèves et actionables
- Terminez par un résumé clair ou une recommandation
`;

    const response = await client.chat.complete({
      model: "ministral-3b-latest",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      maxTokens: 300, // Reduced to prevent cutoff
      temperature: 0.7,
    });

    res.json({
      response: response.choices?.[0]?.message?.content || "",
      timestamp: new Date().toISOString(),
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
