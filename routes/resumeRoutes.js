import express from "express";
import protect from "../middleware/authMiddleware.js";
import upload from "../configs/multer.js";
import {
  createResume,
  deleteResume,
  getResumeById,
  getPublicResumeById,
  updateResume,
} from "../controllers/resumeController.js";

const resumeRouter = express.Router();

resumeRouter.post("/create", protect, createResume);
resumeRouter.put("/update", upload.single("Image"), protect, updateResume); // ← was createResume
resumeRouter.delete("/delete/:resumeId", protect, deleteResume);
resumeRouter.get("/get/:resumeId", protect, getResumeById);
resumeRouter.get("/public/:resumeId", getPublicResumeById);

export default resumeRouter;