import { Module } from '@nestjs/common';
import { AnniversaryMemoriesController } from './anniversary-memories.controller';
import { AnniversaryMemoriesService } from './anniversary-memories.service';

@Module({
  controllers: [AnniversaryMemoriesController],
  providers: [AnniversaryMemoriesService],
})
export class AnniversaryMemoriesModule {}
