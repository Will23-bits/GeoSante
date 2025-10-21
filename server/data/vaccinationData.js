const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

/**
 * Vaccination Coverage Data Parser
 * Handles the CSV file: couvertures-vaccinales-des-adolescent-et-adultes-departement.csv
 */

class VaccinationDataParser {
  constructor() {
    this.csvPath =
      "/Users/omci/Documents/GeoSante/couvertures-vaccinales-des-adolescent-et-adultes-departement.csv";
    this.cache = null;
    this.lastModified = null;
  }

  /**
   * Parse CSV file and return structured vaccination data
   */
  async parseVaccinationData() {
    try {
      // Check if file exists
      if (!fs.existsSync(this.csvPath)) {
        console.warn("[VaccinationData] CSV file not found:", this.csvPath);
        return {};
      }

      // Check if file was modified since last parse
      const stats = fs.statSync(this.csvPath);
      if (this.cache && this.lastModified && stats.mtime <= this.lastModified) {
        console.log("[VaccinationData] Using cached data");
        return this.cache;
      }

      console.log("[VaccinationData] Parsing vaccination coverage CSV...");

      const vaccinationData = {};
      const latestYear = new Date().getFullYear();

      return new Promise((resolve, reject) => {
        fs.createReadStream(this.csvPath)
          .pipe(csv())
          .on("data", (row) => {
            try {
              const year = parseInt(row["Année"] || row["﻿Année"]);
              const deptCode = String(row["Département Code"]).padStart(2, "0");
              const deptName = row["Département"];

              // Only process data from recent years (last 10 years)
              if (year >= latestYear - 10 && deptCode && deptName) {
                if (!vaccinationData[deptCode]) {
                  vaccinationData[deptCode] = {
                    name: deptName,
                    code: deptCode,
                    years: {},
                  };
                }

                // Parse vaccination coverage data
                const yearData = {
                  year: year,
                  hpv: {
                    girls1dose15:
                      parseFloat(row["HPV filles 1 dose à 15 ans"]) || 0,
                    girls2doses16:
                      parseFloat(row["HPV filles 2 doses à 16 ans"]) || 0,
                    boys1dose15:
                      parseFloat(row["HPV garçons 1 dose à 15 ans"]) || 0,
                    boys2doses16:
                      parseFloat(row["HPV garçons 2 doses à 16 ans"]) || 0,
                  },
                  meningococcal: {
                    age10to14: parseFloat(row["Méningocoque C 10-14 ans"]) || 0,
                    age15to19: parseFloat(row["Méningocoque C 15-19 ans"]) || 0,
                    age20to24: parseFloat(row["Méningocoque C 20-24 ans"]) || 0,
                  },
                  flu: {
                    under65atRisk:
                      parseFloat(row["Grippe moins de 65 ans à risque"]) || 0,
                    over65: parseFloat(row["Grippe 65 ans et plus"]) || 0,
                    age65to74: parseFloat(row["Grippe 65-74 ans"]) || 0,
                    age75plus: parseFloat(row["Grippe 75 ans et plus"]) || 0,
                  },
                  covid: {
                    over65: parseFloat(row["Covid-19 65 ans et plus"]) || 0,
                  },
                  region: row["Région"],
                  regionCode: row["Région Code"],
                };

                vaccinationData[deptCode].years[year] = yearData;
              }
            } catch (error) {
              console.warn(
                "[VaccinationData] Error parsing row:",
                error.message
              );
            }
          })
          .on("end", () => {
            console.log(
              `[VaccinationData] ✓ Parsed ${
                Object.keys(vaccinationData).length
              } departments`
            );

            // Calculate latest year averages for each department
            this.calculateLatestAverages(vaccinationData);

            this.cache = vaccinationData;
            this.lastModified = stats.mtime;
            resolve(vaccinationData);
          })
          .on("error", (error) => {
            console.error("[VaccinationData] Error reading CSV:", error);
            reject(error);
          });
      });
    } catch (error) {
      console.error("[VaccinationData] Error parsing vaccination data:", error);
      return {};
    }
  }

  /**
   * Calculate latest year averages for each department
   */
  calculateLatestAverages(vaccinationData) {
    Object.keys(vaccinationData).forEach((deptCode) => {
      const dept = vaccinationData[deptCode];
      const years = Object.keys(dept.years)
        .map((y) => parseInt(y))
        .sort((a, b) => b - a);

      if (years.length > 0) {
        const latestYear = years[0];
        const latestData = dept.years[latestYear];

        // Calculate flu vaccination coverage only (as requested)
        const fluCoverage = latestData.flu.over65 || 0;

        dept.latestYear = latestYear;
        dept.overallCoverage = Math.min(1, Math.max(0, fluCoverage / 100));
        dept.fluCoverage = fluCoverage / 100;
        dept.covidCoverage = 0; // Not used
        dept.hpvCoverage = 0; // Not used
        dept.meningococcalCoverage = 0; // Not used

        // Risk assessment based on flu vaccination coverage
        dept.vaccinationRiskLevel = this.getVaccinationRiskLevel(
          dept.fluCoverage
        );
      }
    });
  }

  /**
   * Get vaccination risk level based on coverage
   */
  getVaccinationRiskLevel(coverage) {
    if (coverage >= 0.7) return "low";
    if (coverage >= 0.5) return "medium";
    if (coverage >= 0.3) return "high";
    return "very-high";
  }

  /**
   * Get vaccination data for a specific department
   */
  async getDepartmentVaccinationData(deptCode) {
    const data = await this.parseVaccinationData();
    return data[deptCode] || null;
  }

  /**
   * Get vaccination statistics for all departments
   */
  async getVaccinationStatistics() {
    const data = await this.parseVaccinationData();
    const departments = Object.values(data);

    if (departments.length === 0) {
      return {
        totalDepartments: 0,
        averageCoverage: 0,
        lowCoverageDepartments: [],
        highCoverageDepartments: [],
        coverageDistribution: {},
      };
    }

    const coverages = departments
      .map((d) => d.overallCoverage)
      .filter((c) => !isNaN(c));
    const averageCoverage =
      coverages.reduce((sum, c) => sum + c, 0) / coverages.length;

    const lowCoverageDepartments = departments
      .filter((d) => d.overallCoverage < 0.5)
      .map((d) => ({
        name: d.name,
        code: d.code,
        coverage: d.overallCoverage,
      }));

    const highCoverageDepartments = departments
      .filter((d) => d.overallCoverage >= 0.7)
      .map((d) => ({
        name: d.name,
        code: d.code,
        coverage: d.overallCoverage,
      }));

    const coverageDistribution = {
      veryHigh: departments.filter(
        (d) => d.vaccinationRiskLevel === "very-high"
      ).length,
      high: departments.filter((d) => d.vaccinationRiskLevel === "high").length,
      medium: departments.filter((d) => d.vaccinationRiskLevel === "medium")
        .length,
      low: departments.filter((d) => d.vaccinationRiskLevel === "low").length,
    };

    return {
      totalDepartments: departments.length,
      averageCoverage: averageCoverage,
      lowCoverageDepartments: lowCoverageDepartments.slice(0, 10), // Top 10
      highCoverageDepartments: highCoverageDepartments.slice(0, 10), // Top 10
      coverageDistribution,
      latestYear: departments[0]?.latestYear || new Date().getFullYear(),
    };
  }

  /**
   * Get vaccination data formatted for map integration
   */
  async getMapVaccinationData() {
    const data = await this.parseVaccinationData();
    const mapData = {};

    Object.keys(data).forEach((deptCode) => {
      const dept = data[deptCode];
      mapData[deptCode] = {
        code: deptCode,
        name: dept.name,
        vaccinationCoverage: dept.fluCoverage, // Now only flu coverage
        fluCoverage: dept.fluCoverage,
        covidCoverage: 0, // Not used
        hpvCoverage: 0, // Not used
        meningococcalCoverage: 0, // Not used
        vaccinationRiskLevel: dept.vaccinationRiskLevel,
        latestYear: dept.latestYear,
      };
    });

    return mapData;
  }
}

module.exports = VaccinationDataParser;
