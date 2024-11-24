import { RequestHandler } from 'express';
import { User } from '../models/User';
import { generateToken, validateEmail, validatePassword } from '../middleware/auth';
import * as crypto from 'crypto';

export const register: RequestHandler = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

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

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'Email already registered' });
      return;
    }
    
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      isVerified: true, // Temporarily set to true for development
      role: 'user',
      settings: {
        theme: 'system',
        emailNotifications: true,
        pushNotifications: false
      }
    });

    await user.save();
    
    const token = generateToken(user._id.toString());

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        settings: user.settings
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).exec();
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({ message: 'Account suspended. Please contact support.' });
      return;
    }

    if (user.status === 'deleted') {
      res.status(403).json({ message: 'Account deleted.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Remove email verification check for development
    // if (!user.isVerified) {
    //   res.status(401).json({ message: 'Please verify your email first' });
    //   return;
    // }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id.toString());

    res.json({
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
    console.error('Login error:', error);
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
    console.error('Email verification error:', error);
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
    console.error('Forgot password error:', error);
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
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};
