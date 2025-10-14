import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../backend/models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campusos';

async function checkUser(email) {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check if user exists
    console.log(`\nChecking for user with email: ${email}`);
    const user = await User.findOne({ email });
    
    if (user) {
      console.log('✅ User found:');
      console.log({
        _id: user._id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        createdAt: user.createdAt,
      });
      
      // Check if password is hashed
      console.log('\nPassword is hashed:', user.password.startsWith('$2a$') || user.password.startsWith('$2b$'));
    } else {
      console.log('❌ User not found');
      
      // List all users if the requested user is not found
      console.log('\nListing all users in the database:');
      const allUsers = await User.find({}).select('_id email username displayName createdAt');
      console.log(allUsers);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || 'samueldaniyan564@gmail.com';
checkUser(email);
