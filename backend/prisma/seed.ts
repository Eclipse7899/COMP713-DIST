import { hashPassword } from '../src/util';
import { PrismaPg } from '@prisma/adapter-pg';
import { FoodCategory, PrismaClient } from '../src/generated/prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg(connectionString);
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.create({
    data: {
      email: 'jon@example.com',
      username: 'jon',
      hashed_password: await hashPassword('123'),
    },
  });

  console.log('Created user:', user);

  const foodTypes = [
    { name: 'Apple', category: FoodCategory.FRUIT },
    { name: 'Banana', category: FoodCategory.FRUIT },
    { name: 'Orange', category: FoodCategory.FRUIT },
    { name: 'Lemon', category: FoodCategory.FRUIT },
    { name: 'Strawberry', category: FoodCategory.FRUIT },
    { name: 'Blueberry', category: FoodCategory.FRUIT },
    { name: 'Grape', category: FoodCategory.FRUIT },
    { name: 'Pear', category: FoodCategory.FRUIT },

    // Vegetables
    { name: 'Carrot', category: FoodCategory.VEGETABLE },
    { name: 'Potato', category: FoodCategory.VEGETABLE },
    { name: 'Onion', category: FoodCategory.VEGETABLE },
    { name: 'Garlic', category: FoodCategory.VEGETABLE },
    { name: 'Tomato', category: FoodCategory.VEGETABLE },
    { name: 'Broccoli', category: FoodCategory.VEGETABLE },
    { name: 'Spinach', category: FoodCategory.VEGETABLE },
    { name: 'Bell Pepper', category: FoodCategory.VEGETABLE },
    { name: 'Cucumber', category: FoodCategory.VEGETABLE },
    { name: 'Lettuce', category: FoodCategory.VEGETABLE },

    // Meat
    { name: 'Chicken Breast', category: FoodCategory.MEAT },
    { name: 'Chicken Thigh', category: FoodCategory.MEAT },
    { name: 'Ground Beef', category: FoodCategory.MEAT },
    { name: 'Beef Steak', category: FoodCategory.MEAT },
    { name: 'Pork Chops', category: FoodCategory.MEAT },
    { name: 'Bacon', category: FoodCategory.MEAT },
    { name: 'Sausages', category: FoodCategory.MEAT },

    // Dairy
    { name: 'Milk', category: FoodCategory.DAIRY },
    { name: 'Butter', category: FoodCategory.DAIRY },
    { name: 'Cheddar Cheese', category: FoodCategory.DAIRY },
    { name: 'Yogurt', category: FoodCategory.DAIRY },
    { name: 'Cream', category: FoodCategory.DAIRY },
    { name: 'Sour Cream', category: FoodCategory.DAIRY },

    // Grains
    { name: 'Rice', category: FoodCategory.GRAINS },
    { name: 'Pasta', category: FoodCategory.GRAINS },
    { name: 'Bread', category: FoodCategory.GRAINS },
    { name: 'Flour', category: FoodCategory.GRAINS },
    { name: 'Oats', category: FoodCategory.GRAINS },
    { name: 'Cereal', category: FoodCategory.GRAINS },
    { name: 'Tortillas', category: FoodCategory.GRAINS },

    // Drinks
    { name: 'Water', category: FoodCategory.DRINKS },
    { name: 'Orange Juice', category: FoodCategory.DRINKS },
    { name: 'Apple Juice', category: FoodCategory.DRINKS },
    { name: 'Coffee', category: FoodCategory.DRINKS },
    { name: 'Tea', category: FoodCategory.DRINKS },
    { name: 'Sparkling Water', category: FoodCategory.DRINKS },

    // Snacks
    { name: 'Potato Chips', category: FoodCategory.SNACKS },
    { name: 'Crackers', category: FoodCategory.SNACKS },
    { name: 'Popcorn', category: FoodCategory.SNACKS },
    { name: 'Granola Bars', category: FoodCategory.SNACKS },
    { name: 'Nuts', category: FoodCategory.SNACKS },

    // Sauces
    { name: 'Ketchup', category: FoodCategory.SAUCES },
    { name: 'Mayonnaise', category: FoodCategory.SAUCES },
    { name: 'Mustard', category: FoodCategory.SAUCES },
    { name: 'Soy Sauce', category: FoodCategory.SAUCES },
    { name: 'Hot Sauce', category: FoodCategory.SAUCES },
    { name: 'BBQ Sauce', category: FoodCategory.SAUCES },

    // Frozen
    { name: 'Frozen Peas', category: FoodCategory.FROZEN },
    { name: 'Frozen Mixed Vegetables', category: FoodCategory.FROZEN },
    { name: 'Frozen Berries', category: FoodCategory.FROZEN },
    { name: 'Frozen Pizza', category: FoodCategory.FROZEN },
    { name: 'Ice Cream', category: FoodCategory.FROZEN },

    // Other
    { name: 'Honey', category: FoodCategory.OTHER },
    { name: 'Peanut Butter', category: FoodCategory.OTHER },
    { name: 'Jam', category: FoodCategory.OTHER },
  ];

  await prisma.food.createMany({
    data: foodTypes.map((food) => ({
      name: food.name,
      category: food.category,
      createdByUserId: user.id,
    })),
  });

  console.log('Seeded food types.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });