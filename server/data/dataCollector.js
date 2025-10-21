const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Configuration for respectful data collection
const CONFIG = {
  // Very conservative intervals to respect Sentiweb
  COLLECTION_INTERVAL_HOURS: 24, // Once per day
  MAX_RECORDS_PER_REQUEST: 10, // Small batches
  CSV_FILE_PATH: path.join(__dirname, "sentiweb_data.csv"),
  BACKUP_INTERVAL_HOURS: 168, // Weekly backups
};

class SentiwebDataCollector {
  constructor() {
    this.lastCollection = null;
    this.csvHeaders = [
      "week",
      "indicator",
      "inc",
      "inc_low",
      "inc_up",
      "inc100",
      "inc100_low",
      "inc100_up",
      "geo_insee",
      "geo_name",
      "collected_at",
    ];
    this.initializeCSV();
  }

  initializeCSV() {
    if (!fs.existsSync(CONFIG.CSV_FILE_PATH)) {
      // Create CSV with headers
      const headerRow = this.csvHeaders.join(",") + "\n";
      fs.writeFileSync(CONFIG.CSV_FILE_PATH, headerRow);
      console.log("[DataCollector] Created new CSV file");
    }
  }

  async collectData() {
    const now = new Date();

    // Check if we should collect (respect interval)
    if (this.lastCollection) {
      const hoursSinceLastCollection =
        (now - this.lastCollection) / (1000 * 60 * 60);
      if (hoursSinceLastCollection < CONFIG.COLLECTION_INTERVAL_HOURS) {
        console.log(
          `[DataCollector] Skipping collection, ${hoursSinceLastCollection.toFixed(
            1
          )}h since last collection`
        );
        return;
      }
    }

    try {
      console.log("[DataCollector] Starting respectful data collection...");

      // Use the most recent data only (span=last)
      const url = `https://www.sentiweb.fr/api/v1/datasets/rest/dataset?id=inc-3-RDD&span=last&$format=json`;

      const { data } = await axios.get(url, {
        timeout: 30000,
        headers: {
          Accept: "application/json",
          "User-Agent": "FluRiskApp/1.0 (Educational Purpose)",
        },
      });

      if (Array.isArray(data) && data.length > 0) {
        await this.appendToCSV(data);
        this.lastCollection = now;
        console.log(
          `[DataCollector] Successfully collected ${data.length} records`
        );
      } else {
        console.log("[DataCollector] No new data available");
      }
    } catch (error) {
      if (error.response?.status === 429) {
        console.log("[DataCollector] Rate limited - will retry later");
        // Set longer delay for next attempt
        this.lastCollection = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h delay
      } else {
        console.error("[DataCollector] Collection failed:", error.message);
      }
    }
  }

  async appendToCSV(newData) {
    const csvRows = newData.map((record) => {
      const row = this.csvHeaders.map((header) => {
        let value = record[header] || "";

        // Add collection timestamp
        if (header === "collected_at") {
          value = new Date().toISOString();
        }

        // Escape CSV values
        if (typeof value === "string" && value.includes(",")) {
          value = `"${value.replace(/"/g, '""')}"`;
        }

        return value;
      });

      return row.join(",");
    });

    const csvContent = csvRows.join("\n") + "\n";
    fs.appendFileSync(CONFIG.CSV_FILE_PATH, csvContent);
  }

  getLocalData() {
    try {
      if (!fs.existsSync(CONFIG.CSV_FILE_PATH)) {
        return [];
      }

      const csvContent = fs.readFileSync(CONFIG.CSV_FILE_PATH, "utf8");
      const lines = csvContent.trim().split("\n");

      if (lines.length <= 1) return []; // Only headers

      const headers = lines[0].split(",");
      const records = lines.slice(1).map((line) => {
        const values = line.split(",");
        const record = {};
        headers.forEach((header, index) => {
          let value = values[index] || "";

          // Unescape CSV values
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1).replace(/""/g, '"');
          }

          // Convert numeric fields
          if (
            [
              "week",
              "indicator",
              "inc",
              "inc_low",
              "inc_up",
              "inc100",
              "inc100_low",
              "inc100_up",
            ].includes(header)
          ) {
            value = value ? Number(value) : null;
          }

          record[header] = value;
        });
        return record;
      });

      return records;
    } catch (error) {
      console.error("[DataCollector] Error reading local data:", error.message);
      return [];
    }
  }

  getStats() {
    const data = this.getLocalData();
    const stats = {
      totalRecords: data.length,
      dateRange:
        data.length > 0
          ? {
              earliest: Math.min(...data.map((r) => r.week)),
              latest: Math.max(...data.map((r) => r.week)),
            }
          : null,
      regions: [...new Set(data.map((r) => r.geo_insee))],
      lastCollection: this.lastCollection,
    };

    return stats;
  }

  // Start automatic collection (respectful intervals)
  startAutoCollection() {
    console.log("[DataCollector] Starting auto-collection with 24h intervals");

    // Initial collection (async, non-blocking)
    setImmediate(() => {
      this.collectData();
    });

    // Schedule regular collections
    setInterval(() => {
      this.collectData();
    }, CONFIG.COLLECTION_INTERVAL_HOURS * 60 * 60 * 1000);
  }
}

module.exports = SentiwebDataCollector;
