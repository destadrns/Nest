import { PrismaClient, CategoryType } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  // Income categories
  { name: 'Salary', type: CategoryType.INCOME, icon: 'briefcase', color: '#4CAF50' },
  { name: 'Freelance', type: CategoryType.INCOME, icon: 'laptop', color: '#66BB6A' },
  { name: 'Investments', type: CategoryType.INCOME, icon: 'trending-up', color: '#43A047' },
  { name: 'Gifts Received', type: CategoryType.INCOME, icon: 'gift', color: '#2E7D32' },
  { name: 'Other Income', type: CategoryType.INCOME, icon: 'plus-circle', color: '#388E3C' },

  // Expense categories
  { name: 'Housing', type: CategoryType.EXPENSE, icon: 'home', color: '#E53935' },
  { name: 'Food & Groceries', type: CategoryType.EXPENSE, icon: 'shopping-cart', color: '#FF7043' },
  { name: 'Transportation', type: CategoryType.EXPENSE, icon: 'car', color: '#FB8C00' },
  { name: 'Utilities', type: CategoryType.EXPENSE, icon: 'zap', color: '#FFA726' },
  { name: 'Healthcare', type: CategoryType.EXPENSE, icon: 'heart', color: '#EF5350' },
  { name: 'Insurance', type: CategoryType.EXPENSE, icon: 'shield', color: '#EC407A' },
  { name: 'Entertainment', type: CategoryType.EXPENSE, icon: 'film', color: '#AB47BC' },
  { name: 'Shopping', type: CategoryType.EXPENSE, icon: 'shopping-bag', color: '#7E57C2' },
  { name: 'Education', type: CategoryType.EXPENSE, icon: 'book', color: '#5C6BC0' },
  { name: 'Personal Care', type: CategoryType.EXPENSE, icon: 'smile', color: '#42A5F5' },
  { name: 'Dining Out', type: CategoryType.EXPENSE, icon: 'coffee', color: '#26C6DA' },
  { name: 'Subscriptions', type: CategoryType.EXPENSE, icon: 'repeat', color: '#26A69A' },
  { name: 'Gifts & Donations', type: CategoryType.EXPENSE, icon: 'gift', color: '#66BB6A' },
  { name: 'Travel', type: CategoryType.EXPENSE, icon: 'map', color: '#FFA000' },
  { name: 'Childcare', type: CategoryType.EXPENSE, icon: 'users', color: '#8D6E63' },
  { name: 'Pets', type: CategoryType.EXPENSE, icon: 'heart', color: '#A1887F' },
  { name: 'Taxes', type: CategoryType.EXPENSE, icon: 'file-text', color: '#78909C' },
  { name: 'Other Expenses', type: CategoryType.EXPENSE, icon: 'more-horizontal', color: '#90A4AE' },
];

async function main() {
  console.log('Seeding database...');

  // Create system default categories
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: {
        id: `system-${cat.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      },
      update: {},
      create: {
        id: `system-${cat.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        isSystem: true,
        familyId: null,
      },
    });
  }

  console.log(`Seeded ${DEFAULT_CATEGORIES.length} default categories`);
  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
