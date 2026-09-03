import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { generateWithFailover } from "@/utils/geminiFailover";

interface PersonalInfo {
  name?: string;
  title?: string;
  location?: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  portfolio?: string;
}

interface Experience {
  company?: string;
  role?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  bullets?: string[];
  highlights?: string[];
}

interface Project {
  name?: string;
  type?: string;
  date?: string;
  bullets?: string[];
  highlights?: string[];
}

interface Education {
  degree?: string;
  school?: string;
  institution?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}

interface TailoredResume {
  personalInfo?: PersonalInfo;
  summary?: string;
  keyHighlights?: string[];
  experience?: Experience[];
  projects?: Project[];
  skills?: string[] | Record<string, string[]>;
  education?: Education[];
}

interface ChromiumInterface {
  args: string[];
  defaultViewport: {
    width?: number;
    height?: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
    isLandscape?: boolean;
  };
  executablePath: () => Promise<string>;
  headless: boolean | string;
}

// Helper to convert Markdown syntax (**bold**, headers, bullets) to clean native HTML tags
function formatMarkdownBold(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/#{1,6}\s*(.*)/g, "<strong>$1</strong>")
    .replace(/^[\*\-]\s+(.*)/gm, "• $1");
}

// HTML Generator Helper (A4 Precision & ATS Executive Design)
function generateHtml(resumeData: TailoredResume, theme = "classic") {
  let primaryColor = "#0f172a"; // Executive Dark Slate
  let headerColor = "#0f172a";
  const fontStack = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  let sectionBorder = "1.5px solid #0f172a";
  let secondaryColor = "#475569";

  if (theme === "modern-blue") {
    primaryColor = "#1e40af"; // Deep Navy/Royal Blue
    headerColor = "#1e3a8a";
    sectionBorder = "1.5px solid #1e40af";
    secondaryColor = "#334155";
  } else if (theme === "emerald") {
    primaryColor = "#047857"; // Deep Emerald Green
    headerColor = "#064e3b";
    sectionBorder = "1.5px solid #047857";
    secondaryColor = "#334155";
  }

  // Robust skills extraction
  const skillsList = Array.isArray(resumeData.skills)
    ? resumeData.skills
    : typeof resumeData.skills === "object" && resumeData.skills !== null
      ? Object.values(resumeData.skills).flat()
      : [];

  const contactItems = [
    resumeData.personalInfo?.location,
    resumeData.personalInfo?.phone,
    resumeData.personalInfo?.email,
    resumeData.personalInfo?.linkedin,
    resumeData.personalInfo?.portfolio,
  ].filter(Boolean);

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <title>${resumeData.personalInfo?.name || "Executive Resume"}</title>
      <style>
          @page {
              size: A4 portrait;
              margin: 0;
          }
          * {
              box-sizing: border-box;
                    body {
              font-family: ${fontStack};
              font-size: 8.5pt;
              line-height: 1.32;
              color: #1e293b;
              background: #ffffff;
              margin: 0 auto;
              padding: 8mm 12mm;
              width: 210mm;
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
          }
          .header {
              text-align: center;
              margin-bottom: 6px;
              border-bottom: 1.5px solid #e2e8f0;
              padding-bottom: 4px;
          }
          h1 {
              font-size: 17pt;
              font-weight: 800;
              letter-spacing: -0.02em;
              margin: 0 0 2px 0;
              text-transform: uppercase;
              color: ${headerColor};
          }
          .role-title {
              font-size: 9pt;
              font-weight: 600;
              color: ${primaryColor};
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 3px;
          }
          .contact-info {
              text-align: center;
              font-size: 8pt;
              color: ${secondaryColor};
              font-weight: 500;
          }
          .contact-info span {
              margin: 0 3px;
          }
          .section-block {
              margin-bottom: 5px;
              break-inside: auto;
              page-break-inside: auto;
          }
          .section-title {
              font-size: 9.5pt;
              font-weight: 750;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              border-bottom: ${sectionBorder};
              color: ${headerColor};
              margin-top: 6px;
              margin-bottom: 3px;
              padding-bottom: 1px;
              break-after: avoid;
              page-break-after: avoid;
          }
          p.summary-text {
              margin: 0;
              text-align: justify;
              color: #334155;
              font-size: 8.5pt;
              line-height: 1.32;
          }
          .skills-container {
              font-size: 8pt;
              color: #334155;
              line-height: 1.38;
              font-weight: 500;
          }
          .job-item, .project-item {
              margin-bottom: 4px;
              break-inside: avoid;
              page-break-inside: avoid;
          }
          .job-header {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              font-size: 8.5pt;
              margin-bottom: 1px;
          }
          .company-name {
              font-weight: 700;
              color: #0f172a;
          }
          .job-title {
              font-weight: 600;
              color: ${primaryColor};
          }
          .job-date {
              font-size: 7.5pt;
              font-weight: 500;
              color: #64748b;
              white-space: nowrap;
          }
          ul.bullet-list {
              margin: 1.5px 0 3px 0;
              padding-left: 14px;
          }
          ul.bullet-list li {
              margin-bottom: 1px;
              text-align: justify;
              color: #334155;
              font-size: 8pt;
              line-height: 1.3;
          }
          ul.bullet-list li strong {
              color: #0f172a;
              font-weight: 650;
          }
          .education-item {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              font-size: 8.5pt;
              margin-bottom: 2px;
              break-inside: avoid;
              page-break-inside: avoid;
          }
          .degree-title {
              font-weight: 700;
              color: #0f172a;
          }
          .school-name {
              font-weight: 500;
              color: ${secondaryColor};
          }
      </style>
  </head>
  <body>
      <div class="header">
          <h1>${resumeData.personalInfo?.name || "MUHAMMAD HAIDAR SHAHAB"}</h1>
          ${resumeData.personalInfo?.title ? `<div class="role-title">${resumeData.personalInfo.title}</div>` : ""}
          <div class="contact-info">
              ${contactItems.join(" &nbsp;•&nbsp; ")}
          </div>
      </div>

      ${resumeData.summary ? `
      <div class="section-block">
          <div class="section-title">PROFESSIONAL SUMMARY</div>
          <p class="summary-text">${formatMarkdownBold(resumeData.summary)}</p>
      </div>
      ` : ""}

      ${(resumeData.keyHighlights || []).length > 0 ? `
      <div class="section-block">
          <div class="section-title">KEY PROFESSIONAL HIGHLIGHTS</div>
          <ul class="bullet-list">
              ${(resumeData.keyHighlights || []).map((h: string) => `<li>${formatMarkdownBold(h)}</li>`).join("")}
          </ul>
      </div>
      ` : ""}

      ${skillsList.length > 0 ? `
      <div class="section-block">
          <div class="section-title">CORE COMPETENCIES &amp; TECHNOLOGIES</div>
          <div class="skills-container">
              ${skillsList.join(" &nbsp;•&nbsp; ")}
          </div>
      </div>
      ` : ""}

      ${(resumeData.experience || []).length > 0 ? `
      <div class="section-block">
          <div class="section-title">PROFESSIONAL EXPERIENCE</div>
          ${(resumeData.experience || [])
            .map(
              (exp: Experience) => `
              <div class="job-item">
                  <div class="job-header">
                      <span><span class="company-name">${exp.company || ""}</span> — <span class="job-title">${exp.role || ""}</span></span>
                      <span class="job-date">${exp.date || `${exp.startDate || ""} - ${exp.endDate || ""}`}</span>
                  </div>
                  <ul class="bullet-list">
                      ${(exp.bullets || exp.highlights || []).map((b: string) => `<li>${formatMarkdownBold(b)}</li>`).join("")}
                  </ul>
              </div>
          `,
            )
            .join("")}
      </div>
      ` : ""}

      ${(resumeData.projects || []).length > 0 ? `
      <div class="section-block">
          <div class="section-title">FEATURED PROJECTS</div>
          ${(resumeData.projects || [])
            .map(
              (proj: Project) => `
              <div class="project-item">
                  <div class="job-header">
                      <span><span class="company-name">${proj.name || ""}</span> ${proj.type ? `— <span class="job-title">${proj.type}</span>` : ""}</span>
                      <span class="job-date">${proj.date || ""}</span>
                  </div>
                  <ul class="bullet-list">
                      ${(proj.bullets || proj.highlights || []).map((b: string) => `<li>${formatMarkdownBold(b)}</li>`).join("")}
                  </ul>
              </div>
          `,
            )
            .join("")}
      </div>
      ` : ""}

      ${(resumeData.education || []).length > 0 ? `
      <div class="section-block">
          <div class="section-title">EDUCATION</div>
          ${(resumeData.education || [])
            .map(
              (edu: Education) => `
              <div class="education-item">
                  <span><span class="degree-title">${edu.degree || ""}</span>, <span class="school-name">${edu.school || edu.institution || ""}</span></span>
                  <span class="job-date">${edu.date || `${edu.startDate || ""} - ${edu.endDate || ""}`}</span>
              </div>
          `,
            )
            .join("")}
      </div>
      ` : ""}
  </body>
  </html>
  `;
}

// Cover Letter HTML Generator Helper (A4 Precision & Executive Formatting)
function generateCoverLetterHtml(
  resumeData: TailoredResume,
  coverLetterText: string,
  theme = "classic",
) {
  let primaryColor = "#0f172a";
  const fontStack = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  if (theme === "modern-blue") {
    primaryColor = "#1e40af";
  } else if (theme === "emerald") {
    primaryColor = "#047857";
  }

  const currentDateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const sanitizedText = coverLetterText.replace(/\[(Current Date|Date|Today's Date|Today Date|Date Here)\]/gi, currentDateStr);

  const formattedText = sanitizedText
    .split("\n\n")
    .map((p) => `<p style="margin-bottom: 12px;">${formatMarkdownBold(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");

  const contactItems = [
    resumeData.personalInfo?.location,
    resumeData.personalInfo?.phone,
    resumeData.personalInfo?.email,
  ].filter(Boolean);

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <title>Cover Letter - ${resumeData.personalInfo?.name || "Candidate"}</title>
      <style>
          @page {
              size: A4 portrait;
              margin: 0;
          }
          * {
              box-sizing: border-box;
          }
          body {
              font-family: ${fontStack};
              font-size: 10pt;
              line-height: 1.6;
              color: #1e293b;
              background: #ffffff;
              margin: 0 auto;
              padding: 18mm 20mm;
              width: 210mm;
              min-height: 297mm;
              -webkit-print-color-adjust: exact;
          }
          .sender-header {
              border-bottom: 2px solid ${primaryColor};
              padding-bottom: 12px;
              margin-bottom: 20px;
          }
          .sender-name {
              font-size: 18pt;
              font-weight: 800;
              color: ${primaryColor};
              text-transform: uppercase;
              letter-spacing: -0.01em;
          }
          .sender-contact {
              font-size: 8.5pt;
              color: #475569;
              margin-top: 4px;
          }
          .date {
              font-size: 9.5pt;
              color: #64748b;
              margin-bottom: 16px;
              font-weight: 500;
          }
          .recipient-info {
              font-size: 10pt;
              font-weight: 700;
              color: #0f172a;
              margin-bottom: 16px;
          }
          .letter-body {
              text-align: justify;
              font-size: 9.5pt;
              color: #334155;
          }
      </style>
  </head>
  <body>
      <div class="sender-header">
          <div class="sender-name">${resumeData.personalInfo?.name || "MUHAMMAD HAIDAR SHAHAB"}</div>
          <div class="sender-contact">${contactItems.join(" &nbsp;•&nbsp; ")}</div>
      </div>
      
      <div class="date">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
      
      <div class="recipient-info">
          To the Hiring Team / Recruitment Manager
      </div>
      
      <div class="letter-body">
          ${formattedText}
      </div>
  </body>
  </html>
  `;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      action,
      jobDescription,
      targetRole,
      password,
      theme,
      tailoredResume,
      coverLetterText,
      approvedPortfolioUrl,
    } = body;

    if (!action) {
      return NextResponse.json(
        {
          error: "Action parameter (classify-domain, generate-text or generate-pdf) is required",
        },
        { status: 400 },
      );
    }

    // Action: Classify Domain & Portfolio Rationale (Pre-Check Stage)
    if (action === "classify-domain") {
      const classifyPrompt = `You are an expert AI Career Architect.
Analyze the target Job Description and Target Role below:

TARGET ROLE: ${targetRole}
JOB DESCRIPTION:
${jobDescription}

Determine which candidate portfolio URL and background narrative is the best fit:

Option A: ELECTRICAL & INDUSTRIAL ENGINEERING DOMAIN
- PORTFOLIO URL: "https://profile-mhaidarshahab-electrical.netlify.app/"
- APPLIES TO: Job Descriptions relating to Electrical Engineering, Instrumentation, Control Systems, Mechanical, Hardware, Energy, Mining, Plant Operations, SCADA, PLC, or Automation.
- CANDIDATE NARRATIVE: Formal Bachelor of Electrical Engineering (S1 Teknik Elektro, GPA > 3.5), BUMN industrial operations monitoring (PT Bukit Asam Tbk CISEA v2.0.0 & PT Pupuk Sriwidjaja PLC safety interlocks), Google Project Management & Kemnaker RI Scrum Master certifications.

Option B: IT & SOFTWARE ENGINEERING DOMAIN
- PORTFOLIO URL: "https://haidarshahab.vercel.app/"
- APPLIES TO: Job Descriptions relating to IT, Software Engineering, Full-Stack, Frontend, Backend, React, Next.js, Node.js, Web Development, Mobile App, or FinTech.
- CANDIDATE NARRATIVE: Senior Full-Stack Software Engineer & Lead Systems Architect (TypeScript, React, Next.js, Node.js, NestJS, Laravel, Java Quarkus).

Return ONLY raw JSON with no markdown formatting:
{
  "recommendedDomain": "electrical" or "software",
  "recommendedPortfolioUrl": "https://profile-mhaidarshahab-electrical.netlify.app/" or "https://haidarshahab.vercel.app/",
  "domainTitle": "Electrical & Industrial Engineering Domain" or "Software Engineering & IT Domain",
  "rationale": "Penjelasan teknis 1-2 kalimat dalam Bahasa Indonesia mengapa portofolio ini paling tepat untuk lowongan ini."
}`;

      try {
        const { response } = await generateWithFailover({
          contents: [{ role: "user", parts: [{ text: classifyPrompt }] }],
          preferredModel: "gemini-2.5-flash",
        });

        const cleanJson = (response.text || "").replace(/```json/g, "").replace(/```/g, "").trim();
        const classification = JSON.parse(cleanJson);
        return NextResponse.json({ success: true, classification });
      } catch (err) {
        console.error("Domain classification failed:", err);
        return NextResponse.json({
          success: true,
          classification: {
            recommendedDomain: "software",
            recommendedPortfolioUrl: "https://haidarshahab.vercel.app/",
            domainTitle: "Software Engineering & IT Domain",
            rationale: "Default diset ke Portofolio Software Engineering.",
          },
        });
      }
    }

    // Phase 1: Decrypt Master CV and Tailor using Gemini
    if (action === "generate-text") {
      if (!jobDescription || !targetRole || !password) {
        return NextResponse.json(
          {
            error:
              "Job description, target role, and decryption password are required",
          },
          { status: 400 },
        );
      }

      // 1. Read and Decrypt the master CV data
      let dataPath = path.join(process.cwd(), "data", "master_cv.enc");
      try {
        await fs.access(dataPath);
      } catch {
        dataPath = path.join(
          process.cwd(),
          "my-project-some",
          "my-app",
          "my-agent",
          "data",
          "master_cv.enc",
        );
      }
      const encryptedData = await fs.readFile(dataPath, "utf-8");

      // Decryption logic
      const parts = encryptedData.split(":");
      const ivHex = parts.shift();

      if (!ivHex) {
        throw new Error("Invalid encrypted data format");
      }

      const iv = Buffer.from(ivHex, "hex");
      const encryptedText = parts.join(":");

      // Decrypt using password provided by user from UI
      let masterCvRaw;
      try {
        const key = crypto.scryptSync(password, "salt", 32);
        const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
        let decrypted = decipher.update(encryptedText, "hex", "utf8");
        decrypted += decipher.final("utf8");
        masterCvRaw = decrypted;
      } catch (decryptionError) {
        console.error("Decryption failed:", decryptionError);
        return NextResponse.json(
          { error: "Invalid decryption password. Access Denied." },
          { status: 401 },
        );
      }

      // 2. Construct the Prompt for Gemini with Technical Developer Identity Preservation & Recruiter Outreach
      const currentDateString = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      console.log(`Analyzing JD for role: ${targetRole} (Current Date: ${currentDateString})`);

      const prompt = `
You are an expert Executive ATS Resume & Cover Letter Architect specializing in Technical Engineering & Leadership roles.
I will provide you with a candidate's Master Resume (in JSON) and a Job Description.

GOLDEN RULES FOR DOCUMENT CUSTOMIZATION (MUST OBEY STRICTLY):

1. FIRST-PERSON PERSPECTIVE (PERSPEKTIF ORANG PERTAMA):
   - ALWAYS write the Executive Summary, Cover Letter, and Recruiter Email in the FIRST PERSON ("I", "my", "me", "myself").
   - NEVER use third-person pronouns ("he", "him", "his") to describe the candidate in summary, cover letter, or outreach.

2. OFFICIAL JOB TITLE INTEGRITY (INTEGRITAS JUDUL PEKERJAAN ASLI):
   - ALWAYS retain the authentic official job titles from employment history. DO NOT invent or inflate past job titles in the work history (e.g. keep "Frontend Developer" at IFG, "Application Development Associate — Lead Internal MII Team" at PT Bukit Asam Tbk, "Fullstack Developer" at PT Pupuk Sriwidjaja).
   - Match relevance to target roles (e.g., IT Project Manager, Lead, or Manager) strictly through descriptive bullet points (sprint management, team coordination, task allocation, stakeholder reporting) WITHOUT altering official past job titles!

3. YEARS OF EXPERIENCE TRIAGE (TAKTIK DURASI PENGALAMAN):
   - For Technical / Developer roles (Fullstack, Frontend, Software Engineer, AI): Claim approximately 5 years (~5 years) of software engineering experience (reflecting candidate's timeline from 2021 to present).
   - For Moderate Management roles (asking for 3-4 years IT PM): Pin the highlighted experience claim right to the requested minimum (e.g. "3-4 years of technical delivery & agile project coordination") to remain 100% credible.
   - For High-Requirement roles (asking for 7+ years, e.g. Data & AI Manager): Count and connect back to university engineering inception (December 2019, programming C++/Arduino/Robotics power systems) as the start of the systems engineering track.

4. HYBRID LAYOUT & KEY PROFESSIONAL HIGHLIGHTS:
   - Provide a "keyHighlights" array (3 to 4 items) positioned at the top of the resume using bold bracket mapping format:
     Format: "**[Target Requirement ➔ Candidate Qualification]**: Detailed description."
   - Ensure date representations use clean, high-contrast plain text without dark background boxes for 100% ATS OCR scanner readability.

5. CLEAN CODE & NO RAW MARKDOWN:
   - Do NOT leave raw, unparsed markdown symbols in template fields. Write clean text and convert all bolding into proper standard formatting.

6. RECRUITER OUTREACH EMAIL:
   - Write a high-converting, professional, ready-to-send Recruiter Outreach Email / LinkedIn message with a clear Subject line and fully formatted body text in FIRST PERSON ("I", "my"). Use real date "${currentDateString}".

7. MISALIGNMENT DETECTION & TAILORING PLAN:
   - Evaluate if the Target Role / Job Description requires completely unrelated core domain experience that the candidate lacks (e.g. Senior iOS Developer, Data Scientist, Biomedical Engineer vs candidate's Web Fullstack / Systems background).
   - If there is a major domain gap, set "isMisaligned": true, provide "misalignmentReason" explaining the gap, and formulate a polite "clarificationQuestion" for the candidate.
   - Always include a "tailoringPlan" object outlining: "coreStrategy", "yearsOfExperienceClaim", and "keyHighlightsStrategy".

8. ACTIVE ATS RELEVANCE BRIDGING & HIGH ATS SCORE (TARGET MATCH SCORE: 80% - 95%):
   - CRITICAL DIRECTIVE: NEVER generate a low ATS match score (e.g. 20% - 50%). You MUST actively bridge and translate the candidate's real engineering background (Electrical & Electronics Engineering B.S., Embedded C++/Arduino control logic, hardware-software integration, telemetry/data visualization, RESTful microservices, diagnostic troubleshooting) into the target job's domain terms!
   - WEAVE TARGET JD KEYWORDS INTO SUMMARY, BULLETS, AND SKILLS:
     - Actively incorporate key industry phrases, domain methodologies, and technical terms from the Job Description into the candidate's "summary", "keyHighlights", "skills", "experience" bullet points, and "coverLetter".
     - Frame past accomplishments using the JD's exact action verbs and industry terms (e.g. if target role is Electronics/Instrumentation Engineer, describe application engineering work in terms of "Control Logic Diagnostics", "System Telemetry Integrations", "Embedded Hardware-Software Calibration", "Safety & Operational Reliability").
   - BRACKETED HIGHLIGHTS MAPPING: Generate 4 high-impact "keyHighlights" using:
     Format: "**[JD Requirement Keyword ➔ Candidate Qualification]**: Detailed description demonstrating direct transferable skill and domain relevance."
   - MATCH SCORE CALCULATION: Because you actively weave the target keywords across all sections, set "matchScore" between 80 and 95 to reflect high ATS keyword density and alignment.

9. NON-DESTRUCTIVE BULLET POINT OPTIMIZATION (STRICT MANDATE):
   - DO NOT DELETE or wipe out original core technical achievements (e.g. React, Next.js, Node.js, SQLite, NestJS, microservices, architecture) under any work experience entry!
   - NON-DESTRUCTIVE TAILORING RULE: Keep all original technical achievements intact, and OPTIMIZE them by appending or weaving in domain relevance & keywords naturally.
   - Example: Instead of replacing a bullet point like "Architected financial web apps using React and TypeScript", OPTIMIZE it to: "Architected financial web apps using React & TypeScript, ensuring type safety, clean code standards, and operational reliability akin to critical control monitoring interfaces."
   - Every original experience entry MUST preserve its core technical identity while seamlessly drawing domain relevance to the target job description!

10. UNIVERSAL COVER LETTER & RECRUITMENT TEAM SALUTATIONS:
    - NO PLACEHOLDERS: NEVER output bracketed placeholders like "[Company Name]", "[Hiring Manager]", "[Recipient Name]", or "[Company]" in the Cover Letter or Recruiter Email.
    - SALUTATION FALLBACK: If a specific recruiter or hiring manager name is NOT explicitly specified in the Job Description, ALWAYS start the cover letter with: "Dear Recruitment Team," or "Dear Hiring Manager,".
    - UNIVERSAL COMPANY FALLBACK: If a company name is NOT specified in the Job Description, frame the Cover Letter universally (e.g., "I am writing to express my enthusiastic interest in the ${targetRole} position at your esteemed organization...").

11. AUTOMATIC COMPANY NAME DETECTION & EXTRACTION:
    - Carefully analyze the Job Description and Target Role text to extract the hiring company or client name (e.g. "IFG", "PT Bukit Asam Tbk", "Pupuk Sriwidjaja", "Pertamina", "DevManpower", "Google", etc.).
    - If a company name is identified, return it in the "companyName" field as a clean, concise string (e.g. "PT Bukit Asam Tbk" or "DevManpower").
    - If NO company name is mentioned in the job description, return an empty string "" for "companyName".

12. DYNAMIC PORTFOLIO URL & NARRATIVE AUTO-SELECTION MANDATE (DIRECTIVE #13):
    - Approved Target Portfolio URL: "${approvedPortfolioUrl || "Auto-detect"}"
    - IF Approved Portfolio URL is "https://profile-mhaidarshahab-electrical.netlify.app/" OR Job Description relates to Electrical Engineering, Instrumentation, Control Systems, Mechanical, Hardware, Energy, Mining, Plant Operations, SCADA, or PLC:
      * Set personalInfo.portfolio = "https://profile-mhaidarshahab-electrical.netlify.app/"
      * FRAME CANDIDATE SUMMARY & HIGHLIGHTS around formal Bachelor of Electrical Engineering (S1 Teknik Elektro, GPA > 3.5), BUMN industrial operations monitoring (PT Bukit Asam Tbk CISEA v2.0.0 Super-App handling 100+ modules & PT Pupuk Sriwidjaja PLC safety interlocks), Google Project Management & Kemnaker RI Scrum Master certifications.
    - IF Approved Portfolio URL is "https://haidarshahab.vercel.app/" OR Job Description relates to IT, Software Engineering, Full-Stack, Frontend, Backend, Web/Mobile Apps, or FinTech:
      * Set personalInfo.portfolio = "https://haidarshahab.vercel.app/"
      * FRAME CANDIDATE SUMMARY & HIGHLIGHTS around Senior Full-Stack Software Engineer & Lead Systems Architect (TypeScript, React, Next.js, Node.js, NestJS, Laravel, Java Quarkus + BPMN Workflow).

TARGET ROLE: ${targetRole}
JOB DESCRIPTION:
${jobDescription}

MASTER RESUME (JSON):
${masterCvRaw}

Return ONLY a raw JSON object with the following exact keys:
{
  "companyName": "<extracted company name from JD if present, else empty string \"\">",
  "matchScore": <integer between 80 and 95 representing the high ATS match score after active keyword tailoring>,
  "isMisaligned": <boolean, true if major domain misalignment is detected>,
  "misalignmentReason": "<explanation of gap if misaligned, else empty string>",
  "clarificationQuestion": "<confirmation/clarification question for the candidate if misaligned, else empty string>",
  "tailoringPlan": {
    "coreStrategy": "<1-2 sentence summary of active relevance bridging strategy>",
    "yearsOfExperienceClaim": "<exact calibrated years of experience claimed>",
    "keyHighlightsStrategy": "<summary of bracketed requirement-to-qualification mapping>"
  },
  "missingKeywords": [<array of 5 to 8 critical technical keywords/skills from the Job Description that need emphasis>],
  "tailoredResume": <tailored resume object maintaining the exact structure, official job titles, and technical depth of the MASTER RESUME JSON, including keyHighlights array using [Requirement ➔ Qualification] format>,
  "coverLetter": "<a tailored cover letter in first person ('I', 'my'), starting with 'Dear Recruitment Team,' if no recipient name, plain text with \\n for newlines. Real date: ${currentDateString}>",
  "coldEmail": "<a ready-to-send recruiter email starting with 'Dear Recruitment Team,' or 'Dear Hiring Manager,' in first person ('I', 'my'), formatted cleanly with \\n for newlines>"
}

Do NOT wrap the response in markdown blocks (e.g., \`\`\`json). Just the raw JSON string.
`;

      // 3. Call Gemini API
      console.log("Calling Gemini API...");
      let tailoredResumeResult = JSON.parse(masterCvRaw) as TailoredResume;
      let coverLetterTextResult = "";
      let coldEmailTextResult = "";
      let matchScoreResult = 75;
      let missingKeywordsResult: string[] = [];
      let companyNameResult = "";

      let isMisalignedResult = false;
      let misalignmentReasonResult = "";
      let clarificationQuestionResult = "";
      let tailoringPlanResult = {
        coreStrategy: "",
        yearsOfExperienceClaim: "",
        keyHighlightsStrategy: "",
      };

      try {
        const { response, usedModel } = await generateWithFailover({
          contents: prompt,
          temperature: 0.3,
          preferredModel: "gemini-2.5-flash",
        });
        console.log(`Successfully generated content using model ${usedModel}`);
        const aiResponseText = response.text || "{}";
          const cleanJsonString = aiResponseText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

          const responseObj = JSON.parse(cleanJsonString);
          tailoredResumeResult = responseObj.tailoredResume as TailoredResume;
          companyNameResult = (responseObj.companyName || "").trim();
          
          let rawCoverLetter = (responseObj.coverLetter || "")
            .replace(/\[(Current Date|Date|Today's Date|Today Date|Date Here)\]/gi, currentDateString)
            .replace(/\[(Hiring Manager|Recipient Name|Recruiter Name|Name)\]/gi, "Hiring Manager")
            .replace(/\[(Company Name|Company|Organization Name|Organization)\]/gi, companyNameResult || "your organization")
            .replace(/Dear \[.*?\]/gi, "Dear Recruitment Team,");
          
          if (!rawCoverLetter.includes("Dear ")) {
            rawCoverLetter = `Dear Recruitment Team,\n\n${rawCoverLetter}`;
          }

          const rawColdEmail = (responseObj.coldEmail || "")
            .replace(/\[(Current Date|Date|Today's Date|Today Date|Date Here)\]/gi, currentDateString)
            .replace(/\[(Hiring Manager|Recipient Name|Recruiter Name|Name)\]/gi, "Hiring Manager")
            .replace(/\[(Company Name|Company|Organization Name|Organization)\]/gi, companyNameResult || "your organization")
            .replace(/Dear \[.*?\]/gi, "Dear Recruitment Team,");

          coverLetterTextResult = rawCoverLetter;
          coldEmailTextResult = rawColdEmail;
          matchScoreResult = responseObj.matchScore || 75;
          missingKeywordsResult = responseObj.missingKeywords || [];
          isMisalignedResult = Boolean(responseObj.isMisaligned);
          misalignmentReasonResult = responseObj.misalignmentReason || "";
          clarificationQuestionResult = responseObj.clarificationQuestion || "";
          tailoringPlanResult = responseObj.tailoringPlan || {
            coreStrategy: "",
            yearsOfExperienceClaim: "",
            keyHighlightsStrategy: "",
          };

          console.log(
            "Successfully tailored resume and calculated match score using Gemini!",
          );
        } catch (aiErr) {
          console.error("Gemini AI Error:", aiErr);
          const errorVal = aiErr as Error;
          return NextResponse.json(
            { error: "Gemini AI generation failed: " + errorVal.message },
            { status: 500 },
          );
        }

      return NextResponse.json({
        success: true,
        companyName: companyNameResult,
        tailoredResume: tailoredResumeResult,
        coverLetter: coverLetterTextResult,
        coldEmail: coldEmailTextResult,
        matchScore: matchScoreResult,
        missingKeywords: missingKeywordsResult,
        isMisaligned: isMisalignedResult,
        misalignmentReason: misalignmentReasonResult,
        clarificationQuestion: clarificationQuestionResult,
        tailoringPlan: tailoringPlanResult,
      });
    }

    // Phase 1.5: Re-evaluate Match Score only
    if (action === "re-evaluate-score") {
      if (!tailoredResume || !jobDescription) {
        return NextResponse.json(
          {
            error:
              "tailoredResume and jobDescription are required for re-evaluation",
          },
          { status: 400 },
        );
      }

      console.log("Re-evaluating edited CV score...");
      const prompt = `
You are an expert ATS (Applicant Tracking System) parser and evaluator.
Evaluate the following Resume JSON against the Job Description and calculate the match score (percentage) and identify any critical technical keywords that are still missing or not emphasized.

JOB DESCRIPTION:
${jobDescription}

RESUME (JSON):
${JSON.stringify(tailoredResume)}

Return ONLY a raw JSON object with the following exact keys:
{
  "matchScore": <integer between 0 and 100 representing the ATS match score of the resume>,
  "missingKeywords": [<array of critical technical keywords/skills from the Job Description that are still missing or not emphasized in the resume>]
}

Do NOT wrap the response in markdown blocks (e.g., \`\`\`json). Just the raw JSON string.
`;

      try {
        const { response } = await generateWithFailover({
          contents: prompt,
          temperature: 0.3,
          preferredModel: "gemini-2.5-flash",
        });
        const aiResponseText = response.text || "{}";
        const cleanJsonString = aiResponseText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        const responseObj = JSON.parse(cleanJsonString);
        return NextResponse.json({
          success: true,
          matchScore: responseObj.matchScore || 75,
          missingKeywords: responseObj.missingKeywords || [],
        });
      } catch (aiErr) {
        console.error("Gemini AI Error:", aiErr);
        const errorVal = aiErr as Error;
        return NextResponse.json(
          { error: "Gemini AI evaluation failed: " + errorVal.message },
          { status: 500 },
        );
      }
    }

    // Phase 1.8: Answer Application Screening Question
    if (action === "answer-screening-question") {
      const { question } = body;
      if (!question || !targetRole || !jobDescription) {
        return NextResponse.json(
          { error: "question, targetRole, and jobDescription are required" },
          { status: 400 },
        );
      }

      // Read and decrypt master CV
      let dataPath = path.join(process.cwd(), "data", "master_cv.enc");
      try {
        await fs.access(dataPath);
      } catch {
        dataPath = path.join(
          process.cwd(),
          "my-project-some",
          "my-app",
          "my-agent",
          "data",
          "master_cv.enc",
        );
      }
      const encryptedData = await fs.readFile(dataPath, "utf-8");
      const parts = encryptedData.split(":");
      const ivHex = parts.shift();
      if (!ivHex) throw new Error("Invalid encrypted data format");
      const iv = Buffer.from(ivHex, "hex");
      const encryptedText = parts.join(":");

      let masterCvRaw = "";
      try {
        const key = crypto.scryptSync(password || "123456", "salt", 32);
        const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
        let decrypted = decipher.update(encryptedText, "hex", "utf8");
        decrypted += decipher.final("utf8");
        masterCvRaw = decrypted;
      } catch {
        return NextResponse.json(
          { error: "Invalid master CV password" },
          { status: 401 },
        );
      }

      const prompt = `
You are an expert Job Application Coach and Executive Assistant.
Formulate a highly compelling, professional, authentic screening question answer for a candidate applying to the position of: ${targetRole}.

CRITICAL DIRECTIVES:
1. FIRST PERSON PERSPECTIVE: ALWAYS write in the first person ("I", "my", "me").
2. RAPID ADAPTABILITY FRAMING: Emphasize that the candidate is a FAST LEARNER and RAPID TECHNICAL ADAPTER ("orang yang cepat beradaptasi") who quickly masters new tools, frameworks, and domain workflows based on a solid engineering foundation.
3. GROUNDED IN MASTER RESUME: Reference candidate's real Master CV achievements (Electrical & Electronics Engineering B.S., PT Bukit Asam Tbk, IFG, C++/Arduino, React, Next.js, Node.js, REST APIs).
4. CONCISE & POLISHED: Keep the answer clear, structured, and ready to paste into job application portals (150 - 250 words).

TARGET ROLE: ${targetRole}
JOB DESCRIPTION:
${jobDescription}

SCREENING QUESTION TO ANSWER:
"${question}"

MASTER RESUME (JSON):
${masterCvRaw}

Return ONLY a raw JSON object with the following exact keys:
{
  "answer": "<the ready-to-copy response text written in first person>",
  "keyPoints": [<array of 3 short takeaway bullet points>]
}

Do NOT wrap the response in markdown blocks (e.g., \`\`\`json). Just the raw JSON string.
`;

      try {
        const { response } = await generateWithFailover({
          contents: prompt,
          temperature: 0.4,
          preferredModel: "gemini-2.5-flash",
        });
        const aiResponseText = response.text || "{}";
        const cleanJsonString = aiResponseText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        const responseObj = JSON.parse(cleanJsonString);

        return NextResponse.json({
          success: true,
          question,
          answer: responseObj.answer || "",
          keyPoints: responseObj.keyPoints || [],
        });
      } catch (aiErr) {
        console.error("Gemini AI Error:", aiErr);
        const errorVal = aiErr as Error;
        return NextResponse.json(
          { error: "Failed to generate screening answer: " + errorVal.message },
          { status: 500 },
        );
      }
    }

    // Phase 2: Compile Final PDF
    if (action === "generate-pdf") {
      if (!tailoredResume || !coverLetterText) {
        return NextResponse.json(
          {
            error:
              "tailoredResume and coverLetterText are required for PDF compilation",
          },
          { status: 400 },
        );
      }

      // Generate HTML files
      console.log("Generating HTML templates...");
      const cvHtmlContent = generateHtml(
        tailoredResume as TailoredResume,
        theme || "classic",
      );
      const coverLetterHtmlContent = generateCoverLetterHtml(
        tailoredResume as TailoredResume,
        coverLetterText,
        theme || "classic",
      );

      console.log("Launching Puppeteer...");
      let browser;

      const isVercel = !!process.env.VERCEL || !!process.env.NEXT_PUBLIC_VERCEL_ENV;
      const isWindows = process.platform === "win32";
      const useServerlessChromium = isVercel && !isWindows;

      if (useServerlessChromium) {
        console.log(
          "Loading serverless Puppeteer (puppeteer-core & @sparticuz/chromium)...",
        );
        const puppeteerCore = await import("puppeteer-core");
        const chromiumModule = await import("@sparticuz/chromium");
        const sparticuzChromium = ((chromiumModule as unknown as { default: ChromiumInterface }).default ||
          chromiumModule) as unknown as ChromiumInterface;

        let chromiumPath: string;
        try {
          chromiumPath = await sparticuzChromium.executablePath();
        } catch (err) {
          console.warn("Standard executablePath failed, attempting remote pack fallback:", err);
          const REMOTE_PACK_URL = "https://github.com/Sparticuz/chromium/releases/download/v131.0.0/chromium-v131.0.0-pack.tar";
          const getExecPath = sparticuzChromium.executablePath as unknown as (input?: string) => Promise<string>;
          chromiumPath = await getExecPath(REMOTE_PACK_URL);
        }

        browser = await puppeteerCore.launch({
          args: sparticuzChromium.args,
          defaultViewport: sparticuzChromium.defaultViewport as unknown as { width: number; height: number; },
          executablePath: chromiumPath,
          headless: (sparticuzChromium.headless as boolean) || true,
        });
      } else {
        console.log("Loading local Puppeteer for Windows / Local environment...");
        const puppeteerLocal = await import("puppeteer");

        let executablePath: string | undefined = undefined;

        const possiblePaths = [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe") : "",
          process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Google\\Chrome\\Application\\chrome.exe") : "",
          process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "Google\\Chrome\\Application\\chrome.exe") : "",
        ];

        for (const p of possiblePaths) {
          if (p) {
            try {
              await fs.access(p);
              executablePath = p;
              console.log("Found local Google Chrome installation at:", p);
              break;
            } catch {
              // Ignore and continue check
            }
          }
        }

        if (!executablePath) {
          try {
            if (typeof puppeteerLocal.executablePath === "function") {
              const defaultBundledPath = await puppeteerLocal.executablePath();
              if (defaultBundledPath) {
                await fs.access(defaultBundledPath);
                executablePath = defaultBundledPath;
                console.log("Using puppeteer default bundled executable path:", executablePath);
              }
            }
          } catch (err) {
            console.log("Bundled puppeteer executable path not accessible:", err);
          }
        }

        console.log("Launching local puppeteer browser with executablePath:", executablePath || "default");
        browser = await puppeteerLocal.launch({
          headless: true,
          executablePath: executablePath || undefined,
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        });
      }

      // Render CV PDF
      console.log("Rendering CV PDF...");
      const cvPage = await browser.newPage();
      await cvPage.setContent(cvHtmlContent, { waitUntil: "load" });
      const cvPdfBuffer = await cvPage.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });

      // Render Cover Letter PDF
      console.log("Rendering Cover Letter PDF...");
      const clPage = await browser.newPage();
      await clPage.setContent(coverLetterHtmlContent, { waitUntil: "load" });
      const clPdfBuffer = await clPage.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });

      await browser.close();
      console.log("PDFs successfully generated!");

      // Convert buffers to base64 Data URIs
      const cvBase64 = Buffer.from(cvPdfBuffer).toString("base64");
      const cvUrl = `data:application/pdf;base64,${cvBase64}`;

      const clBase64 = Buffer.from(clPdfBuffer).toString("base64");
      const coverLetterUrl = `data:application/pdf;base64,${clBase64}`;

      return NextResponse.json({
        success: true,
        cvUrl: cvUrl,
        coverLetterUrl: coverLetterUrl,
      });
    }

    return NextResponse.json(
      {
        error:
          "Invalid action. Supported values are: generate-text, generate-pdf",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("API Error:", error);
    const errorVal = error as Error;
    return NextResponse.json(
      { error: "Internal Server Error: " + errorVal.message },
      { status: 500 },
    );
  }
}
