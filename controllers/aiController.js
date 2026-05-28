import Resume from "../models/resume.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdfParse from "pdf-parse-fork";
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "canvas";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─────────────────────────────────────────────
// Helper: OCR fallback for scanned PDFs
// ─────────────────────────────────────────────
const extractTextWithOCR = async (pdfBuffer) => {
    const uint8Array = new Uint8Array(pdfBuffer);
    const pdfDoc = await pdfjsLib.getDocument({
        data: uint8Array,
        useSystemFonts: true,
    }).promise;

    const totalPages = Math.min(pdfDoc.numPages, 5);
    const worker = await createWorker("eng");
    const pageTexts = [];

    for (let i = 1; i <= totalPages; i++) {
        try {
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = createCanvas(viewport.width, viewport.height);
            const context = canvas.getContext("2d");

            await page.render({ canvasContext: context, viewport }).promise;

            const imageBuffer = canvas.toBuffer("image/png");
            const { data } = await worker.recognize(imageBuffer);

            if (data.text?.trim()) {
                pageTexts.push(data.text.trim());
            }
        } catch (pageErr) {
            console.warn(`OCR failed on page ${i}:`, pageErr.message);
        }
    }

    await worker.terminate();
    return pageTexts.join("\n\n");
};

// ─────────────────────────────────────────────
// Helper: call Gemini with a prompt
// ─────────────────────────────────────────────
const callGemini = async (prompt) => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const result = await model.generateContent(prompt);
    return result.response.text();
};

// ─────────────────────────────────────────────
// POST /api/ai/enhance-pro-sum
// ─────────────────────────────────────────────
export const enhanceProfessionalSummary = async (req, res) => {
    try {
        const { userContent } = req.body;

        if (!userContent || userContent.trim() === "") {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const prompt =
            `You are an expert resume writer. Enhance the following professional summary into 1-2 compelling, ATS-friendly sentences. Return only the enhanced text — no labels, no options, no extra commentary.\n\n${userContent}`;

        const enhancedSummary = await callGemini(prompt);

        return res.status(200).json({ enhancedSummary });
    } catch (err) {
        console.error("enhanceProfessionalSummary error:", err.message);
        return res.status(500).json({ message: "Error processing request", error: err.message });
    }
};

// ─────────────────────────────────────────────
// POST /api/ai/enhance-job-desc
// ─────────────────────────────────────────────
export const enhanceJobDescription = async (req, res) => {
    try {
        const { userContent } = req.body;

        if (!userContent || userContent.trim() === "") {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const prompt =
            `You are an expert resume writer. Enhance the following job description into 1-2 compelling, ATS-friendly sentences. Return only the enhanced text — no labels, no options, no extra commentary.\n\n${userContent}`;

        const enhancedSummary = await callGemini(prompt);

        return res.status(200).json({ enhancedSummary });
    } catch (err) {
        console.error("enhanceJobDescription error:", err.message);
        return res.status(500).json({ message: "Error processing request", error: err.message });
    }
};

// ─────────────────────────────────────────────
// POST /api/ai/upload-resume
// ─────────────────────────────────────────────
export const uploadResume = async (req, res) => {
    try {
        const { title } = req.body;
        const userId = req.userId;

        if (!title || title.trim() === "") {
            return res.status(400).json({ message: "Resume title is required" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No PDF file uploaded" });
        }

        // ── Step 1: Try standard text extraction ──────────────────────────────
        let resumeText = "";
        try {
            const pdfData = await pdfParse(req.file.buffer);
            resumeText = pdfData.text?.trim() || "";
        } catch (parseErr) {
            console.warn("pdf-parse failed, will try OCR:", parseErr.message);
        }

        // ── Step 2: OCR fallback ───────────────────────────────────────────────
        if (!resumeText) {
            console.log("No text layer found — attempting OCR fallback...");
            try {
                resumeText = await extractTextWithOCR(req.file.buffer);
            } catch (ocrErr) {
                console.error("OCR fallback failed:", ocrErr.message);
            }
        }

        // ── Step 3: Hard stop if still empty ──────────────────────────────────
        if (!resumeText || resumeText.trim() === "") {
            return res.status(422).json({
                message: "Could not extract text from this PDF. Please try a text-based PDF.",
            });
        }

        // ── Step 4: Send to Gemini for structured extraction ──────────────────
        const prompt = `You are an expert AI agent that extracts structured data from resumes.
Always respond with valid JSON only — no markdown, no backticks, no extra text.
Your entire response must be a single valid JSON object.

Extract all available information from the resume below and return it matching this exact structure.
Leave fields as empty strings or empty arrays if information is not present.

Resume:
${resumeText}

Required JSON structure:
{
  "professional_summary": "",
  "skills": [],
  "personal_info": {
    "image": "",
    "full_name": "",
    "profession": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "website": ""
  },
  "experience": [
    {
      "company": "",
      "position": "",
      "start_date": "",
      "end_date": "",
      "description": "",
      "is_current": false
    }
  ],
  "project": [
    {
      "name": "",
      "description": "",
      "Link": ""
    }
  ],
  "education": [
    {
      "institution": "",
      "degree": "",
      "field": "",
      "graduation_date": "",
      "gpa": ""
    }
  ]
}`;

        const extractedData = await callGemini(prompt);

        // ── Step 5: Strip markdown fences if present ───────────────────────────
        const cleanJson = extractedData
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();

        let parsedData;
        try {
            parsedData = JSON.parse(cleanJson);
        } catch (jsonErr) {
            console.error("JSON parse error:", jsonErr.message);
            console.error("Raw AI response:", extractedData);
            return res.status(500).json({ message: "AI returned invalid JSON. Please try again." });
        }

        const newResume = await Resume.create({ userId, title, ...parsedData });

        return res.status(201).json({ resumeId: newResume._id });
    } catch (err) {
        console.error("uploadResume error:", err.message);
        console.error("Stack:", err.stack);
        return res.status(500).json({ message: "Error processing request", error: err.message });
    }
};