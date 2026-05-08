import mongoose from "mongoose";

const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => {
            console.log('MongoDB connected successfully');
        });

        const mongodbURI = process.env.MONGODB_URI;

        if (!mongodbURI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        await mongoose.connect(mongodbURI); // ← just use the URI directly

    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
};

export default connectDB;