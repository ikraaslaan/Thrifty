const prisma = require('../config/database');

// Haversine formulu (km cinsinden mesafe)
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

class ItemService {
    async getItems(query) {
        const { page = 1, limit = 20, category, status = 'ACTIVE', lat, lng, radius } = query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = { status };
        if (category) where.categoryId = category;

        const items = await prisma.item.findMany({
            where,
            include: {
                user: { select: { id: true, fullName: true, avatarUrl: true } },
                category: { select: { id: true, name: true, slug: true, icon: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit),
        });

        const total = await prisma.item.count({ where });

        let filtered = items;
        if (lat && lng && radius) {
            const userLat = parseFloat(lat);
            const userLng = parseFloat(lng);
            const maxDist = parseFloat(radius); // km
            filtered = items.filter(item => {
                const dist = haversine(userLat, userLng, item.latitude, item.longitude);
                item.distance = Math.round(dist * 10) / 10;
                return dist <= maxDist;
            });
        }

        return {
            data: filtered,
            pagination: { page: parseInt(page), limit: parseInt(limit), total },
        };
    }

    async getItemById(id) {
        return await prisma.item.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, fullName: true, avatarUrl: true, latitude: true, longitude: true } },
                category: true,
            },
        });
    }

    async createItem(userId, data) {
        const { title, description, images, condition, deliveryType, latitude, longitude, address, categoryId, expiresAt } = data;

        return await prisma.item.create({
            data: {
                title,
                description,
                images: images || [],
                condition: condition || 'GOOD',
                deliveryType: deliveryType || 'PICKUP',
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                address,
                categoryId,
                userId,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
            include: { category: true },
        });
    }

    async updateItem({ id, userId, data }) {
        const existing = await prisma.item.findUnique({ where: { id } });
        if (!existing) throw new ApiError(404, 'Ilan bulunamadi');
        if (existing.userId !== userId) throw new ApiError(403, 'Yetkiniz yok');

        return await prisma.item.update({
            where: { id },
            data,
            include: { category: true },
        });
    }

    async deleteItem({ id, userId }) {
        const existing = await prisma.item.findUnique({ where: { id } });
        if (!existing) throw new ApiError(404, 'Ilan bulunamadi');
        if (existing.userId !== userId) throw new ApiError(403, 'Yetkiniz yok');

        await prisma.item.delete({ where: { id } });
    }
}

module.exports = new ItemService();
