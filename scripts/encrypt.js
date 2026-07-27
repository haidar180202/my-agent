const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const algorithm = "aes-256-cbc";
const password = process.env.RESUME_PASSWORD;
// Use scrypt to create a 32-byte key from the password
const key = crypto.scryptSync(password, "salt", 32);
const iv = crypto.randomBytes(16);

const inputPath = path.join(__dirname, "../src/data/resume.json");
const outputPath = path.join(__dirname, "../src/data/resume.enc");

if (!fs.existsSync(inputPath)) {
  console.error("Error: resume.json not found!");
  process.exit(1);
}

const rawData = fs.readFileSync(inputPath, "utf8");

// Encrypt the data
const cipher = crypto.createCipheriv(algorithm, key, iv);
let encrypted = cipher.update(rawData, "utf8", "hex");
encrypted += cipher.final("hex");

// Store IV and encrypted text together, separated by a colon
const finalOutput = iv.toString("hex") + ":" + encrypted;

fs.writeFileSync(outputPath, finalOutput);
console.log("Success! resume.json encrypted to resume.enc");
