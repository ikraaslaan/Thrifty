const request = require('supertest');
const app = require('../src/server');
const prisma = require('../src/config/database');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/database', () => {
    return {
        item: {
            findMany: jest.fn(),
            count: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        }
    };
});

describe('Item Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const generateToken = (userId) => {
        return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'super_secret', { expiresIn: '1h' });
    };

    describe('GET /api/items', () => {
        it('should list items successfully with pagination', async () => {
            prisma.item.findMany.mockResolvedValue([
                { id: 'item1', title: 'Test Item 1', status: 'ACTIVE', latitude: 41, longitude: 28 },
                { id: 'item2', title: 'Test Item 2', status: 'ACTIVE', latitude: 41, longitude: 28 }
            ]);
            prisma.item.count.mockResolvedValue(2);

            const res = await request(app).get('/api/items?page=1&limit=10');

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('success');
            expect(res.body.data.length).toBe(2);
            expect(res.body.pagination.total).toBe(2);
            expect(prisma.item.findMany).toHaveBeenCalledTimes(1);
            expect(prisma.item.count).toHaveBeenCalledTimes(1);
        });
    });

    describe('POST /api/items', () => {
        it('should create an item when authenticated', async () => {
            const token = generateToken('user-123');

            // Mock user fetching from authenticate middleware if necessary
            prisma.user.findUnique.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

            prisma.item.create.mockResolvedValue({
                id: 'new-item-123',
                title: 'New Item',
                userId: 'user-123',
                categoryId: 'cat-123',
            });

            const res = await request(app)
                .post('/api/items')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    title: 'New Item',
                    description: 'Description here',
                    latitude: 41.0,
                    longitude: 29.0,
                    categoryId: 'cat-123'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.status).toBe('success');
            expect(res.body.data.title).toBe('New Item');
            expect(prisma.item.create).toHaveBeenCalledTimes(1);
        });

        it('should return 401 when not authenticated', async () => {
            const res = await request(app)
                .post('/api/items')
                .send({
                    title: 'New Item',
                    description: 'Description here',
                    latitude: 41.0,
                    longitude: 29.0,
                    categoryId: 'cat-123'
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.status).toBe('error');
        });
    });
});
