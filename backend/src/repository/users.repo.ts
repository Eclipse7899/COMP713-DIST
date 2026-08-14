import { PrismaClient } from '../generated/prisma/client';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserRepo {
  constructor(private readonly prisma: PrismaClient) {}
}
