const request = require('supertest');
const app = require('../src/server'); // App'i iceri aktar
const prisma = require('../src/config/database'); // Prisma'yi iceri aktar
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Prisma modülünün tüm fonksiyonlarını mock'la
jest.mock('../src/config/database', () => {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };
});

// environment variable mocklanabilir ileriki asamalarda

describe('Auth Endpoints', () => {
  afterEach(() => {
    jest.clearAllMocks(); // Her testten sonra mock'lari sifirla
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Setup mock
      prisma.user.findUnique.mockResolvedValue(null); // Kullanici onceden yok
      prisma.user.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
      });

      const res = await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe('test@example.com');
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('should return error if email already exists', async () => {
      // Setup mock
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      });

      const res = await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toMatch(/zaten kayitli/);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        prisma.user.findUnique.mockResolvedValue({
            id: 'user-123',
            email: 'test@example.com',
            fullName: 'Test User',
            role: 'USER',
            passwordHash: hashedPassword,
        });

        const res = await request(app).post('/api/auth/login').send({
            email: 'test@example.com',
            password: 'password123',
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data).toHaveProperty('token');
        expect(res.body.data.user.email).toBe('test@example.com');
    });

    it('should return 401 with wrong password', async () => {
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        prisma.user.findUnique.mockResolvedValue({
            id: 'user-123',
            email: 'test@example.com',
            fullName: 'Test User',
            role: 'USER',
            passwordHash: hashedPassword,
        });

        const res = await request(app).post('/api/auth/login').send({
            email: 'test@example.com',
            password: 'wrongpassword',
        });

        expect(res.statusCode).toBe(401);
        expect(res.body.status).toBe('error');
    });
  });

  describe('GET /api/auth/me', () => {
      it('should return user profile if token is valid', async () => {
          // Gecerli token uret
          const token = jwt.sign({ id: 'user-123' }, process.env.JWT_SECRET || 'super_secret', { expiresIn: '1h' });

          prisma.user.findUnique.mockResolvedValue({
            id: 'user-123',
            email: 'test@example.com',
            role: 'USER'
          });

          const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

          expect(res.statusCode).toBe(200);
          expect(res.body.status).toBe('success');
          expect(res.body.data.email).toBe('test@example.com');
      });

      it('should return 401 if token is not provided', async () => {
        const res = await request(app).get('/api/auth/me');

        expect(res.statusCode).toBe(401);
      });
  });
});
