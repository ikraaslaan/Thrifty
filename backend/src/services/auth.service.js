const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Register a new user
 * @param {Object} userData 
 * @returns {Object} registered user data and token
 */
const registerUser = async (userData) => {
  const { email, password, fullName, phone } = userData;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('Bu email adresi ile zaten kayitli bir hesap bulunmaktadir.');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Create user in DB
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      phone: phone || null,
    },
  });

  // Generate Token
  const token = generateToken(user.id);

  return {
    user: { id: user.id, email: user.email, fullName: user.fullName },
    token,
  };
};

/**
 * Login user
 * @param {string} email 
 * @param {string} password 
 * @returns {Object} user data and token
 */
const loginUser = async (email, password) => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error('Gecersiz email veya sifre.');
  }

  // Compare passwords
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Gecersiz email veya sifre.');
  }

  // Generate Token
  const token = generateToken(user.id);

  return {
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    token,
  };
};

/**
 * Generate JWT token
 * @param {string} userId 
 * @returns {string} token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

module.exports = {
  registerUser,
  loginUser,
};
