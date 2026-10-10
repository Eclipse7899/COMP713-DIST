import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from '../src/util';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg(connectionString);
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'jon@example.com' },
    update: {},
    create: {
      email: 'jon@example.com',
      username: 'jon',
      hashed_password: await hashPassword('123'),
    },
  });

  console.log('Created user:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
