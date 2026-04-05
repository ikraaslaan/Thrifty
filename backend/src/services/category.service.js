const prisma = require('../config/database');

class CategoryService {
    async getAllCategories() {
        return await prisma.category.findMany({
            include: {
                children: true,
                _count: { select: { items: true } },
            },
            where: { parentId: null }, // Sadece ust kategoriler
            orderBy: { name: 'asc' },
        });
    }

    async getCategoryById(id) {
        return await prisma.category.findUnique({
            where: { id },
            include: {
                children: true,
                items: {
                    where: { status: 'ACTIVE' },
                    take: 20,
                    orderBy: { createdAt: 'desc' },
                    include: { user: { select: { id: true, fullName: true } } },
                },
            },
        });
    }
}

module.exports = new CategoryService();
