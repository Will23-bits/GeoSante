#!/usr/bin/env node

import fs from "fs";
import path from "path";
import OpenAI from "openai";

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
            const value = valueParts.join("=").replace(/^["']|["']$/g, ""); // Remove quotes
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

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function uploadFile(filePath, purpose) {
  try {
    console.log(`📤 Uploading ${purpose} file: ${filePath}`);

    const file = await openai.files.create({
      file: fs.createReadStream(filePath),
      purpose: purpose,
    });

    console.log(`✅ File uploaded successfully. ID: ${file.id}`);
    return file.id;
  } catch (error) {
    console.error(`❌ Error uploading ${purpose} file:`, error);
    throw error;
  }
}

async function createFineTuningJob(trainingFileId, validationFileId) {
  try {
    console.log("🚀 Starting OpenAI fine-tuning job...");

    const fineTune = await openai.fineTuning.jobs.create({
      training_file: trainingFileId,
      validation_file: validationFileId,
      model: "gpt-3.5-turbo", // Base model for fine-tuning
      hyperparameters: {
        n_epochs: 3, // Number of training epochs
      },
      suffix: "geosante-health-bot", // Custom name for your model
    });

    console.log(`✅ Fine-tuning job created. Job ID: ${fineTune.id}`);
    console.log(`📊 Status: ${fineTune.status}`);
    console.log(`🤖 Model: ${fineTune.model}`);

    return fineTune;
  } catch (error) {
    console.error("❌ Error creating fine-tuning job:", error);
    throw error;
  }
}

async function monitorFineTuningJob(jobId) {
  try {
    console.log(`🔍 Monitoring fine-tuning job: ${jobId}`);

    let job = await openai.fineTuning.jobs.retrieve(jobId);

    console.log(`📊 Initial status: ${job.status}`);

    // Poll for completion
    while (
      job.status === "validating_files" ||
      job.status === "queued" ||
      job.status === "running"
    ) {
      console.log(`📊 Status: ${job.status}`);

      if (job.status === "running") {
        console.log(
          `📈 Progress: ${JSON.stringify(job.training_file, null, 2)}`
        );
      }

      // Wait 30 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 30000));
      job = await openai.fineTuning.jobs.retrieve(jobId);
    }

    if (job.status === "succeeded") {
      console.log("🎉 Fine-tuning completed successfully!");
      console.log(`🤖 Fine-tuned model: ${job.fine_tuned_model}`);
      console.log(`📊 Final status: ${job.status}`);

      // Save the model ID to environment file
      const envPath = path.join(process.cwd(), ".env");
      let envContent = "";

      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf8");
      }

      // Add or update the fine-tuned model
      const modelLine = `FINE_TUNED_MODEL=${job.fine_tuned_model}`;
      if (envContent.includes("FINE_TUNED_MODEL=")) {
        envContent = envContent.replace(/FINE_TUNED_MODEL=.*/, modelLine);
      } else {
        envContent += `\n${modelLine}`;
      }

      fs.writeFileSync(envPath, envContent.trim());
      console.log(`💾 Model ID saved to .env file: ${job.fine_tuned_model}`);

      return job;
    } else {
      console.error(`❌ Fine-tuning failed with status: ${job.status}`);
      if (job.error) {
        console.error("Error details:", job.error);
      }
      throw new Error(`Fine-tuning failed: ${job.status}`);
    }
  } catch (error) {
    console.error("❌ Error monitoring fine-tuning job:", error);
    throw error;
  }
}

async function estimateCost(jobId) {
  try {
    // Get job details for cost estimation
    const job = await openai.fineTuning.jobs.retrieve(jobId);

    // Rough cost estimation for GPT-3.5-turbo fine-tuning
    // Training tokens: ~$0.008 per 1K tokens
    // Input tokens during training: ~$0.003 per 1K tokens

    console.log("\n💰 Cost Estimation:");
    console.log("- Training: ~$5-15 (depending on final token count)");
    console.log(
      "- Usage: $0.002 per 1K input tokens, $0.006 per 1K output tokens"
    );
    console.log("- View exact costs at: https://platform.openai.com/usage");
  } catch (error) {
    console.log("Could not estimate cost:", error.message);
  }
}

async function main() {
  try {
    console.log("🎯 Starting OpenAI Fine-tuning Process...");

    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    // Check if training files exist
    const trainingFilePath = path.join(
      process.cwd(),
      "server/data/openai_training.jsonl"
    );
    const validationFilePath = path.join(
      process.cwd(),
      "server/data/openai_validation.jsonl"
    );

    if (
      !fs.existsSync(trainingFilePath) ||
      !fs.existsSync(validationFilePath)
    ) {
      throw new Error(
        "OpenAI training files not found. Please ensure openai_training.jsonl and openai_validation.jsonl exist in server/data/"
      );
    }

    console.log("📊 Using existing OpenAI training data...");

    // Upload training files
    const trainingFileId = await uploadFile(trainingFilePath, "fine-tune");
    const validationFileId = await uploadFile(validationFilePath, "fine-tune");

    // Create fine-tuning job
    const fineTuneJob = await createFineTuningJob(
      trainingFileId,
      validationFileId
    );

    // Estimate cost
    await estimateCost(fineTuneJob.id);

    // Monitor the job
    const completedJob = await monitorFineTuningJob(fineTuneJob.id);

    console.log("\n🎉 Fine-tuning complete!");
    console.log(`🤖 Your custom model: ${completedJob.fine_tuned_model}`);
    console.log("\n📋 Next steps:");
    console.log("1. Update your chatbot to use the fine-tuned model");
    console.log("2. Test the specialized responses");
    console.log("3. Monitor costs in OpenAI dashboard");
  } catch (error) {
    console.error("\n❌ Fine-tuning failed:", error.message);
    console.log("\n🔧 Troubleshooting:");
    console.log("- Check your OpenAI API key");
    console.log("- Ensure you have credits in your OpenAI account");
    console.log("- Verify training data format");
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
