import JSZip from "jszip";

export interface SavedApplication {
  id: string;
  jobTitle: string;
  companyName: string;
  targetRole: string;
  dateSaved: string;
  matchScore: number;
  missingKeywords?: string[];
  coverLetterText: string;
  tailoredResume: Record<string, unknown>;
  cvPdfDataUri?: string;
  coverLetterPdfDataUri?: string;
  status?: "Draft" | "Applied" | "Screening" | "Interviewing" | "Offer" | "Archived";
  followUpDate?: string;
  notes?: string;
  updatedAt?: string;
}

// Convert Base64 Data URI to ArrayBuffer for JSZip
function dataUriToArrayBuffer(dataUri: string): ArrayBuffer {
  const base64Index = dataUri.indexOf(";base64,");
  const base64String = base64Index !== -1 ? dataUri.substring(base64Index + 8) : dataUri;
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Format string safely for filenames
function sanitizeFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 40);
}

/**
 * Compiles CV PDF, Cover Letter PDF, and Job Summary Markdown into a 1-click ZIP archive
 */
export async function exportApplicationZip(app: SavedApplication): Promise<void> {
  const zip = new JSZip();

  const companyClean = sanitizeFilename(app.companyName || "Company");
  const roleClean = sanitizeFilename(app.targetRole || app.jobTitle || "Role");
  const baseName = `${companyClean}_${roleClean}`;

  // 1. Add CV PDF if available
  if (app.cvPdfDataUri) {
    try {
      const cvBuffer = dataUriToArrayBuffer(app.cvPdfDataUri);
      zip.file(`${baseName}_CV.pdf`, cvBuffer);
    } catch (err) {
      console.error("Failed to parse CV PDF Data URI for zip export:", err);
    }
  }

  // 2. Add Cover Letter PDF if available
  if (app.coverLetterPdfDataUri) {
    try {
      const clBuffer = dataUriToArrayBuffer(app.coverLetterPdfDataUri);
      zip.file(`${baseName}_Cover_Letter.pdf`, clBuffer);
    } catch (err) {
      console.error("Failed to parse Cover Letter PDF Data URI for zip export:", err);
    }
  }

  // 3. Generate Job Summary Markdown
  const markdownContent = `# Application Package — ${app.companyName || "Target Company"}

- **Target Role**: ${app.targetRole || app.jobTitle || "N/A"}
- **Date Saved**: ${app.dateSaved || new Date().toLocaleDateString()}
- **Pipeline Status**: ${app.status || "Applied"}
- **ATS Match Score**: ${app.matchScore || 0}%
- **Follow-up Date**: ${app.followUpDate || "Not Scheduled"}

---

## Critical Technical Keywords
${(app.missingKeywords || []).map((kw) => `- ${kw}`).join("\n") || "- None highlighted"}

---

## Internal Notes & Follow-up Log
${app.notes || "No custom notes recorded."}

---

## Cover Letter Text
\`\`\`text
${app.coverLetterText || "N/A"}
\`\`\`
`;

  zip.file(`${baseName}_Summary.md`, markdownContent);

  // 4. Generate ZIP blob and trigger browser download
  const content = await zip.generateAsync({ type: "blob" });
  const downloadUrl = URL.createObjectURL(content);

  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `${baseName}_Application_Package.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up Blob URL
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}
