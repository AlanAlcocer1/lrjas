import { Module } from '@nestjs/common';
import { DevController } from './dev.controller';
import { DevService } from './dev.service';
import { DevUserGuard } from './guards/dev-user.guard';

@Module({
  controllers: [DevController],
  providers: [DevService, DevUserGuard],
})
export class DevModule {}
