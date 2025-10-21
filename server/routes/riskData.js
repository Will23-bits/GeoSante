const express = require("express");
const router = express.Router();
const {
  processData,
  generateHeatmapData,
  saveProcessedData,
} = require("../data/fetchData");
// const SentiwebDataCollector = require("../data/dataCollector");

// Initialize data collector - DISABLED FOR NOW
// const dataCollector = new SentiwebDataCollector();

// Initialize data on server start
let cachedData = null;

// GET /api/risk-data - Get all risk data
router.get("/", async (_req, res) => {
  try {
    const departments = await processData();
    const heatmapPoints = generateHeatmapData(departments);
    cachedData = {
      departments,
      heatmapPoints,
      lastUpdated: new Date().toISOString(),
    };
    res.json(cachedData);
  } catch (error) {
    console.error("Error fetching risk data:", error);
    res.status(500).json({ error: "Failed to fetch risk data" });
  }
});

// GET /api/risk-data/department/:code - Get specific department data
router.get("/department/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const departments = await processData();
    const department = departments.find((dept) => dept.code === code);

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    res.json(department);
  } catch (error) {
    console.error("Error fetching department data:", error);
    res.status(500).json({ error: "Failed to fetch department data" });
  }
});

// GET /api/risk-data/heatmap - Get heatmap data points
router.get("/heatmap", async (_req, res) => {
  try {
    const departments = await processData();
    const heatmapPoints = generateHeatmapData(departments);

    res.json({
      points: heatmapPoints,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching heatmap data:", error);
    res.status(500).json({ error: "Failed to fetch heatmap data" });
  }
});

// GET /api/risk-data/stats - Get overall statistics
router.get("/stats", async (_req, res) => {
  try {
    const departments = await processData();

    const stats = {
      totalDepartments: departments.length,
      averageRiskScore:
        departments.reduce((sum, dept) => sum + dept.riskScore, 0) /
        departments.length,
      riskLevelDistribution: {
        "very-low": departments.filter((dept) => dept.riskLevel === "very-low")
          .length,
        low: departments.filter((dept) => dept.riskLevel === "low").length,
        medium: departments.filter((dept) => dept.riskLevel === "medium")
          .length,
        high: departments.filter((dept) => dept.riskLevel === "high").length,
      },
      averageVaccinationCoverage:
        departments.reduce((sum, dept) => sum + dept.vaccinationCoverage, 0) /
        departments.length,
      totalEmergencyVisits: departments.reduce(
        (sum, dept) => sum + dept.emergencyVisits,
        0
      ),
      totalSosMedecinsActs: departments.reduce(
        (sum, dept) => sum + dept.sosMedecinsActs,
        0
      ),
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// GET /api/risk-data/collector-stats - Get data collection statistics - DISABLED FOR NOW
// router.get("/collector-stats", (_req, res) => {
//   try {
//     const stats = dataCollector.getStats();
//     res.json({
//       ...stats,
//       message:
//         "Data collection runs every 24 hours to respect Sentiweb's rate limits",
//     });
//   } catch (error) {
//     console.error("Error getting collector stats:", error);
//     res.status(500).json({ error: "Failed to get collector stats" });
//   }
// });

// GET /api/risk-data/force-collect - Manually trigger data collection (for testing) - DISABLED FOR NOW
// router.get("/force-collect", async (_req, res) => {
//   try {
//     await dataCollector.collectData();
//     const stats = dataCollector.getStats();
//     res.json({
//       message: "Data collection completed",
//       stats,
//     });
//   } catch (error) {
//     console.error("Error in force collection:", error);
//     res.status(500).json({ error: "Failed to collect data" });
//   }
// });

module.exports = router;
