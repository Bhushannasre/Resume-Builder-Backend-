import Resume from "../models/resume.js";
import ai from "../configs/ai.js";
import pdfParse from "pdf-parse-fork";
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "canvas";

// ─────────────────────────────────────────────
// Helper: Render PDF pages to images via pdfjs-dist + canvas
// then run tesseract OCR on each page
// ─────────────────────────────────────────────
const extractTextWithOCR = async (pdfBuffer) => {
    const uint8Array = new Uint8Array(pdfBuffer);

    const pdfDoc = await pdfjsLib.getDocument({
        data: uint8Array,
        useSystemFonts: true,
    }).promise;

    const totalPages = Math.min(pdfDoc.numPages, 5); // max 5 pages
    const worker = await createWorker("eng");
    const pageTexts = [];

    for (let i = 1; i <= totalPages; i++) {
        try {
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); // higher scale = better OCR

            const canvas = createCanvas(viewport.width, viewport.height);
            const context = canvas.getContext("2d");

            await page.render({
                canvasContext: context,
                viewport,
            }).promise;

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
// POST /api/ai/enhance-pro-sum
// ─────────────────────────────────────────────
export const enhanceProfessionalSummary = async (req, res) => {
    try {
        const { userContent } = req.body;

        if (!userContent || userContent.trim() === "") {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const response = await ai.chat.completions.create({
            model: process.env.OPENAI_MODEL,
            messages: [
                {
                    role: "system",
                    content:
                        "You are an expert in resume writing. Your task is to enhance the professional summary of a resume. " +
                        "The summary should be 1-2 sentences highlighting key skills, experience, and career objectives. " +
                        "Make it compelling and ATS-friendly. Return only the enhanced text — no options, labels, or extra commentary.",
                },
                { role: "user", content: userContent },
            ],
        });

        return res
            .status(200)
            .json({ enhancedSummary: response.choices[0].message.content });
    } catch (err) {
        console.error("enhanceProfessionalSummary error:", err.message);
        return res
            .status(500)
            .json({ message: "Error processing request", error: err.message });
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

        const response = await ai.chat.completions.create({
            model: process.env.OPENAI_MODEL,
            messages: [
                {
                    role: "system",
                    content:
                        "You are an expert in resume writing. Your task is to enhance the job description of a resume. " +
                        "The description should be 1-2 sentences highlighting key skills, experience, and career objectives. " +
                        "Make it compelling and ATS-friendly. Return only the enhanced text — no options, labels, or extra commentary.",
                },
                { role: "user", content: userContent },
            ],
        });

        return res
            .status(200)
            .json({ enhancedSummary: response.choices[0].message.content });
    } catch (err) {
        console.error("enhanceJobDescription error:", err.message);
        return res
            .status(500)
            .json({ message: "Error processing request", error: err.message });
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

        // ── Step 2: OCR fallback for image-based / scanned PDFs ───────────────
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
                message:
                    "Could not extract text from this PDF. Please try a text-based PDF.",
            });
        }

        // ── Step 4: Send to AI for structured extraction ──────────────────────
        const systemPrompt =
            "You are an expert AI agent that extracts structured data from resumes. " +
            "Always respond with valid JSON only — no markdown, no backticks, no extra text.";

        const userPrompt = `Extract all available information from the resume below and return it as a JSON object matching this exact structure. Leave fields as empty strings or empty arrays if the information is not present.

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

        const response = await ai.chat.completions.create({
            model: process.env.OPENAI_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
        });

        const extractedData = response.choices[0].message.content;

        let parsedData;
        try {
            parsedData = JSON.parse(extractedData);
        } catch (jsonErr) {
            console.error("JSON parse error:", jsonErr.message);
            return res
                .status(500)
                .json({ message: "AI returned invalid JSON. Please try again." });
        }

        const newResume = await Resume.create({ userId, title, ...parsedData });

        return res.status(201).json({ resumeId: newResume._id });
    } catch (err) {
        console.error("uploadResume error:", err.message);
        console.error("Stack:", err.stack);
        return res
            .status(500)
            .json({ message: "Error processing request", error: err.message });
    }
};