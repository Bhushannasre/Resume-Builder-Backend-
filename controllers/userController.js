import Resume from '../models/resume.js';
import User from '../models/userModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const generateToken = (userId)=>{
    const token = jwt.sign({userId}, process.env.JWT_SECRET, {expiresIn:'7d'});
    return token;
}
export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // Check if user already exists
        if(!name || !email || !password){
            return res.status(400).json({ message: 'Please provide name, email and password' });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // Create new user
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            name, email, password: hashedPassword
        })
        //return success message and token
        const token = generateToken(newUser._id);
        newUser.password = undefined; // Exclude password from response
       return res.status(201).json({message: "User created Successfully ", token, user: newUser})
    } catch (error) {
       return res.status(500).json({ message: error.message });
    }
}

//controller for user login 
//Post : /api/users/login

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Check if user already exists
        const user = await User.findOne({email})
        if(!user){
            return res.status(400).json({message:'Invalid email or password'})
        }
       //compare password
       if(!user.comparePassword(password)){
        return res.status(400).json({message:'Invalid email or password'})
       }
       
        //return success message and token
        const token = generateToken(user._id);
        user.password = undefined; // Exclude password from response

       return res.status(200).json({message: "Login Successfully ", token, user})
    
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

//controller for getting user by id
//GET: /api/users/data
export const getUserById = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' }); 
        }
        user.password = undefined;
        return res.status(200).json({ user });
    } catch (error) {
        return res.status(500).json({ message: error.message }); 
    }
};

//controller for geting user resumes
// GET: /api/users/resumes

export const getUserResumes = async (req, res)=>{
    try{
     const userId = req.userId;
     //return user resumes
     const resumes = await Resume.find({userId})
     return res.status(200).json({resumes})    
    }
    catch(error){
        return res.status(400).json({message: error.message})

    }
}