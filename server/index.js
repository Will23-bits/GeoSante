const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const HOST = process.env.HOST || "127.0.0.1";
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../dist")));

// Import routes
const riskDataRoutes = require("./routes/riskData");
const chatbotRoutes = require("./routes/chatbot");
const vaccinationDataRoutes = require("./routes/vaccinationData");

// API Routes
app.use("/api/risk-data", riskDataRoutes);
app.use("/api/chat", chatbotRoutes);
app.use("/api/vaccination-data", vaccinationDataRoutes);

// Serve React app for all non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
