require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// In-memory storage for verification codes (replace with database in production)
const verificationCodes = new Map();

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

app.use(express.json());
app.use(express.static('public'));

// Registration endpoint
app.post('/register', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    // Basic validation
    if (!email || !name || !email.includes('@')) {
      return res.status(400).json({ error: "Invalid email or name" });
    }

    // Generate 6-digit verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    
    // Store verification code (in production, use a database)
    verificationCodes.set(email, {
      code: verificationCode,
      timestamp: Date.now(),
      name: name
    });

    // Send verification email
    await transporter.sendMail({
      from: `"${process.env.COMPANY_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Verify your email for Security Calculator",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to Security Calculator</h1>
          <p>Hello ${name},</p>
          <p>Thank you for registering. Please use the following code to verify your email:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h2 style="color: #007bff; margin: 0;">${verificationCode}</h2>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            Security Calculator Team
          </p>
        </div>
      `
    });

    res.json({ message: "Verification code sent" });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: "Failed to send verification code" });
  }
});

// Verification endpoint
app.post('/verify', (req, res) => {
  const { email, code } = req.body;
  const storedData = verificationCodes.get(email);

  if (!storedData) {
    return res.status(400).json({ error: "No verification code found" });
  }

  // Check if code is expired (10 minutes)
  if (Date.now() - storedData.timestamp > 600000) {
    verificationCodes.delete(email);
    return res.status(400).json({ error: "Verification code expired" });
  }

  if (storedData.code !== code) {
    return res.status(400).json({ error: "Invalid verification code" });
  }

  // Clear the verification code
  verificationCodes.delete(email);

  // Return success with user data
  res.json({
    verified: true,
    name: storedData.name,
    email: email
  });
});

// Login endpoint
app.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Basic validation
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: "Invalid email" });
    }

    // Generate verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    
    // Store verification code
    verificationCodes.set(email, {
      code: verificationCode,
      timestamp: Date.now(),
      name: email.split('@')[0] // Use email prefix as name for login
    });

    // Send verification email
    await transporter.sendMail({
      from: `"${process.env.COMPANY_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Login Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Security Calculator Login</h1>
          <p>Hello,</p>
          <p>Here's your verification code to login:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h2 style="color: #007bff; margin: 0;">${verificationCode}</h2>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            Security Calculator Team
          </p>
        </div>
      `
    });

    res.json({ message: "Verification code sent" });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: "Failed to send verification code" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 