import Resume from "../models/resume.js";
import imageKit from "../configs/imageKit.js";

// POST: /api/resumes/create
export const createResume = async (req, res) => {
    try {
        const userId = req.userId;
        const { title } = req.body;
        const newResume = await Resume.create({ userId, title });
        return res.status(201).json({ message: "Resume created successfully", resume: newResume });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

// GET: /api/resumes  (all resumes for logged-in user)
export const getAllResumes = async (req, res) => {
    try {
        const userId = req.userId;
        const resumes = await Resume.find({ userId }).sort({ updatedAt: -1 }).select("_id title updatedAt");
        return res.status(200).json({ resumes });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

// DELETE: /api/resumes/delete/:resumeId
export const deleteResume = async (req, res) => {
    try {
        const userId = req.userId;
        const { resumeId } = req.params;
        await Resume.findOneAndDelete({ userId, _id: resumeId });
        return res.status(200).json({ message: "Resume deleted successfully" });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

// GET: /api/resumes/get/:resumeId  (private - authenticated)
export const getResumeById = async (req, res) => {
    try {
        const userId = req.userId;
        const { resumeId } = req.params;
        const resume = await Resume.findOne({ userId, _id: resumeId });
        if (!resume) {
            return res.status(404).json({ message: "Resume not found" });
        }
        resume.__v = undefined;
        resume.createdAt = undefined;
        resume.updatedAt = undefined;
        return res.status(200).json({ resume });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

// GET: /api/resumes/public/:resumeId  (public - no auth)
export const getPublicResumeById = async (req, res) => {
    try {
        const { resumeId } = req.params;
        const resume = await Resume.findOne({ public: true, _id: resumeId });
        if (!resume) {
            return res.status(404).json({ message: "Resume not found" });
        }
        return res.status(200).json({ resume });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

// PUT: /api/resumes/update
export const updateResume = async (req, res) => {
    try {
        const userId = req.userId;
        const { resumeId, resumeData, removeBackground } = req.body;
        const image = req.file;

        if (!resumeId) {
            return res.status(400).json({ message: "resumeId is required" });
        }
        if (!resumeData) {
            return res.status(400).json({ message: "resumeData is required" });
        }

        let resumeDataCopy;
        try {
            resumeDataCopy = JSON.parse(resumeData);
        } catch (e) {
            return res.status(400).json({ message: "Invalid resumeData JSON" });
        }

        // Strip Mongoose internals that cause update errors
        delete resumeDataCopy._id;
        delete resumeDataCopy.__v;
        delete resumeDataCopy.userId;
        delete resumeDataCopy.createdAt;
        delete resumeDataCopy.updatedAt;

        if (image) {
            const { toFile } = await import("@imagekit/nodejs");
            const response = await imageKit.files.upload({
                file: await toFile(image.buffer, "resume.png", { type: image.mimetype }),
                fileName: "resume.png",
                folder: "user-resumes",
                transformation: {
                    pre:
                        "w-300,h-300,fo-face,z-0.75" +
                        (removeBackground ? ",e-bgremove" : ""),
                },
            });
            resumeDataCopy.personal_info.image = response.url;
        }

        const resume = await Resume.findOneAndUpdate(
            { userId, _id: resumeId },
            { $set: resumeDataCopy },
            { new: true }
        );

        if (!resume) {
            return res.status(404).json({ message: "Resume not found" });
        }

        return res.status(200).json({ message: "Saved successfully", resume });
    } catch (error) {
        console.error("updateResume error:", error.message);
        return res.status(400).json({ message: error.message });
    }
};

// PUT: /api/resumes/update-title/:resumeId
export const updateResumeTitle = async (req, res) => {
    try {
        const userId = req.userId;
        const { resumeId } = req.params;
        const { title } = req.body;

        if (!title || title.trim() === "") {
            return res.status(400).json({ message: "Title is required" });
        }

        const resume = await Resume.findOneAndUpdate(
            { userId, _id: resumeId },
            { title },
            { new: true }
        ).select("_id title updatedAt");

        if (!resume) {
            return res.status(404).json({ message: "Resume not found" });
        }

        return res.status(200).json({ message: "Title updated", resume });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};