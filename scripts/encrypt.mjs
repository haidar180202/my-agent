import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const algorithm = "aes-256-cbc";
const password = process.env.RESUME_PASSWORD || "haidar$68";
// Use scrypt to create a 32-byte key from the password
const key = crypto.scryptSync(password, "salt", 32);
const iv = crypto.randomBytes(16);

const inputPath = path.join(__dirname, "../data/master_cv.json");
const outputPath = path.join(__dirname, "../data/master_cv.enc");

if (!fs.existsSync(inputPath)) {
  console.error("Error: master_cv.json not found!");
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
console.log("Success! master_cv.json encrypted to master_cv.enc");
