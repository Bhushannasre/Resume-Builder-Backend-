import express from "express";
import protect from "../middleware/authMiddleware.js";
import upload from "../configs/multer.js";
import {
    createResume,
    getAllResumes,
    deleteResume,
    getResumeById,
    getPublicResumeById,
    updateResume,
    updateResumeTitle,
} from "../controllers/resumeController.js";

const resumeRouter = express.Router();

resumeRouter.get("/", protect, getAllResumes);                                        // Dashboard list
resumeRouter.post("/create", protect, createResume);                                 // Create blank
resumeRouter.put("/update", upload.single("Image"), protect, updateResume);          // Full resume save
resumeRouter.put("/update-title/:resumeId", protect, updateResumeTitle);             // Title-only edit
resumeRouter.delete("/delete/:resumeId", protect, deleteResume);                     // Delete
resumeRouter.get("/get/:resumeId", protect, getResumeById);                          // Private get
resumeRouter.get("/public/:resumeId", getPublicResumeById);                          // Public get

export default resumeRouter;