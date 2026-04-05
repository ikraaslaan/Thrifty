const prisma = require('../config/database');

class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

class UserService {
    async getProfile(userId) {
        return await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, email: true, fullName: true, phone: true,
                avatarUrl: true, latitude: true, longitude: true,
                role: true, rating: true, ratingCount: true, createdAt: true,
                _count: { select: { items: true, requests: true } },
            },
        });
    }

    async updateProfile(userId, data) {
        const { fullName, phone, avatarUrl, latitude, longitude } = data;
        return await prisma.user.update({
            where: { id: userId },
            data: {
                ...(fullName && { fullName }),
                ...(phone !== undefined && { phone }),
                ...(avatarUrl !== undefined && { avatarUrl }),
                ...(latitude !== undefined && { latitude: parseFloat(latitude) }),
                ...(longitude !== undefined && { longitude: parseFloat(longitude) }),
            },
            select: { id: true, email: true, fullName: true, phone: true, avatarUrl: true, latitude: true, longitude: true, rating: true, ratingCount: true },
        });
    }

    async getUserItems(userId) {
        return await prisma.item.findMany({
            where: { userId },
            include: { category: { select: { id: true, name: true, icon: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    async rateUser(targetUserId, raterId, score) {
        if (targetUserId === raterId) throw new ApiError(400, 'Kendinize puan veremezsiniz');
        const numericScore = parseFloat(score);
        if (isNaN(numericScore) || numericScore < 1 || numericScore > 5) {
            throw new ApiError(400, 'Puan 1 ile 5 arasinda olmalidir');
        }

        const user = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!user) throw new ApiError(404, 'Kullanici bulunamadi');

        const totalScore = user.rating * user.ratingCount;
        const newCount = user.ratingCount + 1;
        const newRating = (totalScore + numericScore) / newCount;

        return await prisma.user.update({
            where: { id: targetUserId },
            data: {
                rating: newRating,
                ratingCount: newCount,
            },
            select: { id: true, fullName: true, rating: true, ratingCount: true }
        });
    }
}

module.exports = new UserService();
