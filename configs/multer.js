import multer from "multer";

const storage = multer.memoryStorage();

// ── For PDF uploads (resume parsing) ────────────────────────────────────────
const pdfFilter = (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
        cb(null, true);
    } else {
        cb(new Error("Only PDF files are allowed"), false);
    }
};

export const uploadPdf = multer({
    storage,
    fileFilter: pdfFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ── For image uploads (profile picture) ─────────────────────────────────────
const imageFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed"), false);
    }
};

export const uploadImage = multer({
    storage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ── Default export (backwards compat) ───────────────────────────────────────
export default uploadPdf;