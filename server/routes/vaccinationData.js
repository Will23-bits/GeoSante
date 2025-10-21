const express = require("express");
const router = express.Router();
const VaccinationDataParser = require("../data/vaccinationData");

// Initialize vaccination data parser
const vaccinationParser = new VaccinationDataParser();

// GET /api/vaccination-data - Get vaccination statistics
router.get("/", async (req, res) => {
  try {
    const stats = await vaccinationParser.getVaccinationStatistics();
    res.json({
      ...stats,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching vaccination statistics:", error);
    res.status(500).json({ error: "Failed to fetch vaccination statistics" });
  }
});

// GET /api/vaccination-data/department/:code - Get specific department vaccination data
router.get("/department/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const deptCode = String(code).padStart(2, "0");

    const data = await vaccinationParser.getDepartmentVaccinationData(deptCode);

    if (!data) {
      return res.status(404).json({
        error: "Department not found",
        code: deptCode,
      });
    }

    res.json({
      department: data,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching department vaccination data:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch department vaccination data" });
  }
});

// GET /api/vaccination-data/map - Get vaccination data formatted for map
router.get("/map", async (req, res) => {
  try {
    const mapData = await vaccinationParser.getMapVaccinationData();
    res.json({
      departments: mapData,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching map vaccination data:", error);
    res.status(500).json({ error: "Failed to fetch map vaccination data" });
  }
});

// GET /api/vaccination-data/low-coverage - Get departments with low vaccination coverage
router.get("/low-coverage", async (req, res) => {
  try {
    const stats = await vaccinationParser.getVaccinationStatistics();
    res.json({
      departments: stats.lowCoverageDepartments,
      total: stats.lowCoverageDepartments.length,
      averageCoverage: stats.averageCoverage,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching low coverage departments:", error);
    res.status(500).json({ error: "Failed to fetch low coverage departments" });
  }
});

// GET /api/vaccination-data/high-coverage - Get departments with high vaccination coverage
router.get("/high-coverage", async (req, res) => {
  try {
    const stats = await vaccinationParser.getVaccinationStatistics();
    res.json({
      departments: stats.highCoverageDepartments,
      total: stats.highCoverageDepartments.length,
      averageCoverage: stats.averageCoverage,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching high coverage departments:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch high coverage departments" });
  }
});

module.exports = router;
