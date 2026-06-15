import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ensureMasterUser } from './ensure-master-user';
import { ensureNingunoStake } from './ensure-ninguno-stake';
import { ensureMiembroField, backfillMiembroFromStakes } from './ensure-miembro-field';

@Injectable()
export class BootstrapService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await ensureNingunoStake(this.prisma);
    await ensureMiembroField(this.prisma);
    await backfillMiembroFromStakes(this.prisma);
    await ensureMasterUser(this.prisma);
  }
}
