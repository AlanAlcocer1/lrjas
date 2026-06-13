import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ensureMasterUser } from './ensure-master-user';
import { ensureNingunoStake } from './ensure-ninguno-stake';

@Injectable()
export class BootstrapService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await ensureNingunoStake(this.prisma);
    await ensureMasterUser(this.prisma);
  }
}
