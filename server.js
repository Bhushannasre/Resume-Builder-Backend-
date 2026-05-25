import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import connectDB from './configs/db.js';
import userRouter from './routes/userRoutes.js';
import resumeRouter from './routes/resumeRoutes.js';
import aiRouter from './routes/aiRoutes.js';

const app = express( );

// Dynamic CORS Configuration
const allowedOrigins = [
    'https://ai-resume-builder-qmq3.vercel.app',
    'http://localhost:5173'
];

// Add Vercel preview deployment URLs dynamically
if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'preview' ) {
    allowedOrigins.push(/https:\/\/ai-resume-builder-qmq3(-[a-zA-Z0-9]+ )?\.vercel\.app$/);
}

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Check if the origin is in our allowed list or matches a regex
        const isAllowed = allowedOrigins.some(allowedOrigin => {
            if (typeof allowedOrigin === 'string') {
                return allowedOrigin === origin;
            } else if (allowedOrigin instanceof RegExp) {
                return allowedOrigin.test(origin);
            }
            return false;
        });

        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

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
