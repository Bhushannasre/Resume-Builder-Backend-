import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import connectDB from './configs/db.js';
import userRouter from './routes/userRoutes.js';
import resumeRouter from './routes/resumeRoutes.js';
import aiRouter from './routes/aiRoutes.js';

const app = express(); // 1. Define 'app' first

// 2. Configure CORS correctly
app.use(cors({
    // Remove the trailing slash from the Vercel URL
    origin: ['https://ai-resume-builder-qmq3.vercel.app', 'http://localhost:5173'],
    credentials: true
} ));

app.use(express.json());

const PORT = process.env.PORT || 5000;

// Database connection
await connectDB();

app.get('/', (req, res) => {
    res.send('Server is live....');
});

app.use('/api/users', userRouter);
app.use('/api/resumes', resumeRouter);
app.use('/api/ai', aiRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
