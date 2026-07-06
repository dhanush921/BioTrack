import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authenticate } from '../authMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'biotrack-super-secret-jwt-key';

// SIGNUP
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, name, role, department } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required fields.' });
    }

    // Check if user already exists
    const existingUser = db.findOne('users', { email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email address already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user
    const newUser = db.add('users', {
      email: email.toLowerCase(),
      name,
      role: role || 'Department Staff',
      department: department || 'General Medical',
      password: hashedPassword,
      avatar: '',
      notifications: { calibration: true, warranty: true, breakdowns: true, tasks: true },
      themePreference: 'dark',
      approved: false
    });

    // Create JWT
    const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

    const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:5000';
    const protocol = req.headers['x-forwarded-proto'] || (host.includes('loca.lt') ? 'https' : req.protocol);
    const approvalLink = `${protocol}://${host}/admin-login?approveUser=${newUser.id}`;

    // Simulate dispatching email notification to admin chippadadhanush274@gmail.com
    console.log(`\n==================================================`);
    console.log(`[SMTP Mail Server] SENDING TRANSACTIONAL EMAIL`);
    console.log(`To: chippadadhanush274@gmail.com`);
    console.log(`Subject: [BioTrack] User Access Request - Action Required`);
    console.log(`Body: Hello Dhanush, a new user "${name}" (${email}) has registered for BioTrack.`);
    console.log(`Instant Approval Link: ${approvalLink}`);
    console.log(`==================================================\n`);

    // Log action
    db.add('logs', {
      userId: newUser.id,
      userName: newUser.name,
      action: 'User Signup',
      details: `New account registered (PENDING APPROVAL) as ${newUser.role} in ${newUser.department}. Alert sent to chippadadhanush274@gmail.com`
    });

    res.status(201).json({
      token,
      user: userWithoutPassword
    });
  } catch (err) {
    next(err);
  }
});

// LOGIN
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.findOne('users', { email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email credentials or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email credentials or password.' });
    }

    // Sign JWT
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...userWithoutPassword } = user;

    // Log action
    db.add('logs', {
      userId: user.id,
      userName: user.name,
      action: 'User Login',
      details: 'User authenticated successfully.'
    });

    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (err) {
    next(err);
  }
});

// GET CURRENT USER PROFILE
router.get('/me', authenticate, (req, res) => {
  const { password, ...userWithoutPassword } = req.user;
  res.json(userWithoutPassword);
});

// UPDATE PROFILE
router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const { name, department, notifications, themePreference, password } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (department) updates.department = department;
    if (notifications) updates.notifications = notifications;
    if (themePreference) updates.themePreference = themePreference;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = db.update('users', req.user.id, updates);
    const { password: _, ...userWithoutPassword } = updatedUser;

    res.json(userWithoutPassword);
  } catch (err) {
    next(err);
  }
});

// FORGOT PASSWORD (OTP GENERATION)
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const user = db.findOne('users', { email: email.toLowerCase() });
  if (!user) {
    return res.json({ 
      message: 'If an account exists with this email, a verification code has been dispatched.',
      userId: null
    });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  db.update('users', user.id, {
    resetOtp: otp,
    resetOtpExpiry: Date.now() + 10 * 60 * 1000
  });

  console.log(`\n==================================================`);
  console.log(`[SMTP Mail Server] SENDING TRANSACTIONAL EMAIL`);
  console.log(`To: ${user.email}`);
  console.log(`Subject: [BioTrack] Password Reset Verification Code`);
  console.log(`Body: Hello, your 6-digit verification code is: ${otp}`);
  console.log(`This code is valid for 10 minutes.`);
  console.log(`==================================================\n`);

  res.json({
    message: 'If an account exists with this email, a verification code has been dispatched.',
    userId: user.id,
    debugOtp: otp
  });
});

// PUBLIC RESET PASSWORD (OTP VERIFICATION)
router.post('/reset-password', async (req, res, next) => {
  try {
    const { userId, otp, newPassword } = req.body;
    if (!userId || !otp || !newPassword) {
      return res.status(400).json({ error: 'User ID, OTP code, and new password are required.' });
    }

    const user = db.get('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    if (!user.resetOtp || user.resetOtp !== otp) {
      return res.status(400).json({ error: 'Invalid verification code. Please check your email.' });
    }

    if (user.resetOtpExpiry && Date.now() > user.resetOtpExpiry) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    db.update('users', user.id, {
      password: hashedPassword,
      resetOtp: null,
      resetOtpExpiry: null
    });

    db.add('logs', {
      userId: user.id,
      userName: user.name,
      action: 'Password Recovery Reset',
      details: `Password recovered and reset successfully via OTP verification code`
    });

    res.json({ message: 'Password reset successfully!' });
  } catch (err) {
    next(err);
  }
});

export default router;
