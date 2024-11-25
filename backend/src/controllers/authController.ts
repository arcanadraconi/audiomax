import { RequestHandler } from 'express';
import { User } from '../models/User';
import { generateToken, validateEmail, validatePassword } from '../middleware/auth';
import * as crypto from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const register: RequestHandler = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Log MongoDB connection status
    console.log('MongoDB Connection Status:', {
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    });

    if (!validateEmail(email)) {
      res.status(400).json({ message: 'Invalid email format' });
      return;
    }

    if (!validatePassword(password)) {
      res.status(400).json({
        message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
      });
      return;
    }

    console.log('Checking for existing user with email:', email);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', existingUser._id);
      res.status(400).json({ message: 'Email already registered' });
      return;
    }

    // Always hash password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user document
    const userData = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      isVerified: true,
      role: 'user',
      status: 'active',
      subscription: {
        plan: 'free',
        status: 'active'
      },
      settings: {
        theme: 'system',
        emailNotifications: true,
        pushNotifications: false
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Always use Mongoose model to ensure proper schema validation and middleware execution
    const user = new User(userData);
    const savedUser = await user.save();
    console.log('User saved successfully:', savedUser._id);
    
    const token = generateToken(savedUser._id.toString());

    // Verify the user was actually saved
    const verifyUser = await User.findById(savedUser._id).select('+password');
    if (!verifyUser) {
      throw new Error('User verification failed after save');
    }
    console.log('User verified in database:', {
      id: verifyUser._id,
      email: verifyUser.email,
      hasPassword: !!verifyUser.password
    });

    // Test password verification
    const passwordTest = await bcrypt.compare(password, verifyUser.password);
    console.log('Password verification test:', passwordTest);

    res.status(201).json({
      token,
      user: {
        id: savedUser._id,
        email: savedUser.email,
        role: savedUser.role,
        settings: savedUser.settings
      }
    });
  } catch (error) {
    console.error('Registration error:', {
      error,
      stack: error.stack,
      connectionState: mongoose.connection.readyState
    });
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt for email:', email);
    const user = await User.findOne({ email }).select('+password').exec();
    
    if (!user) {
      console.log('User not found:', email);
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    if (user.status === 'suspended') {
      console.log('Suspended account login attempt:', email);
      res.status(403).json({ message: 'Account suspended. Please contact support.' });
      return;
    }

    if (user.status === 'deleted') {
      console.log('Deleted account login attempt:', email);
      res.status(403).json({ message: 'Account deleted.' });
      return;
    }

    console.log('Found user:', {
      id: user._id,
      email: user.email,
      hasPassword: !!user.password,
      passwordLength: user.password?.length
    });

    // Compare password using bcrypt directly
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password comparison result:', isMatch);

    if (!isMatch) {
      console.log('Invalid password for user:', email);
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    console.log('Successful login for user:', email);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id.toString());

    res.status(200).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        settings: {
          theme: user.settings?.theme || 'system',
          emailNotifications: user.settings?.emailNotifications || true,
          pushNotifications: user.settings?.pushNotifications || false
        }
      }
    });
  } catch (error) {
    console.error('Login error:', {
      error,
      stack: error.stack,
      connectionState: mongoose.connection.readyState
    });
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const verifyEmail: RequestHandler = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token }).exec();
    if (!user) {
      res.status(400).json({ message: 'Invalid verification token' });
      return;
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    const authToken = generateToken(user._id.toString());

    res.json({ 
      message: 'Email verified successfully',
      token: authToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        settings: user.settings
      }
    });
  } catch (error) {
    console.error('Email verification error:', {
      error,
      stack: error.stack,
      connectionState: mongoose.connection.readyState
    });
    res.status(500).json({ message: 'Server error during email verification' });
  }
};

export const forgotPassword: RequestHandler = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email }).exec();
    if (!user) {
      // Return success even if user not found for security
      res.json({ message: 'If an account exists with this email, password reset instructions will be sent.' });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // TODO: Send password reset email

    res.json({ message: 'Password reset instructions sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', {
      error,
      stack: error.stack,
      connectionState: mongoose.connection.readyState
    });
    res.status(500).json({ message: 'Server error during password reset request' });
  }
};

export const resetPassword: RequestHandler = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!validatePassword(password)) {
      res.status(400).json({
        message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
      });
      return;
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    }).exec();

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired reset token' });
      return;
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', {
      error,
      stack: error.stack,
      connectionState: mongoose.connection.readyState
    });
    res.status(500).json({ message: 'Server error during password reset' });
  }
};
