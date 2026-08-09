import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ensureMasterUser } from './ensure-master-user';
import { ensureNingunoStake } from './ensure-ninguno-stake';
import { ensureOtroStake } from './ensure-otro-stake';
import { ensureMiembroField, backfillMiembroFromStakes } from './ensure-miembro-field';
import { ensureSocialPostsTable } from './ensure-social-posts';
import { ensureGeneralEvent } from './ensure-general-event';

@Injectable()
export class BootstrapService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await ensureNingunoStake(this.prisma);
    await ensureOtroStake(this.prisma);
    await ensureMiembroField(this.prisma);
    await backfillMiembroFromStakes(this.prisma);
    await ensureSocialPostsTable(this.prisma);
    await ensureGeneralEvent(this.prisma);
    await ensureMasterUser(this.prisma);
  }
}
