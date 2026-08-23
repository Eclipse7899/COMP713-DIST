import { PrismaClient } from '@prisma/client/extension';


export class UserRepo {
  constructor(private readonly prisma: PrismaClient) {}
}
