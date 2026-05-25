import mongoose from "mongoose";

const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => {
            console.log('MongoDB connected successfully');
        });

        let mongodbURI = process.env.MONGODB_URI; // Use 'let' instead of 'const'
        const projectName = 'resume_builder';

        if (!mongodbURI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        // Clean trailing slash and ensure database name is included
        if (mongodbURI.endsWith('/')) {
            mongodbURI = mongodbURI.slice(0, -1);
        }

        // If the URI doesn't already specify a DB, append the project name
        // Most Atlas URIs look like ...net/dbname?retryWrites...
        const connectionString = mongodbURI.includes('.net/') 
            ? mongodbURI 
            : `${mongodbURI}/${projectName}`;

        await mongoose.connect(connectionString);

    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1); // Exit process if DB connection fails
    }
};

export default connectDB;
