import { Module } from '@nestjs/common';
import { ParticipaYaController } from './participa-ya.controller';
import { ParticipaYaService } from './participa-ya.service';
import { ParticipaYaWasapClient } from './participa-ya-wasap.client';

@Module({
  controllers: [ParticipaYaController],
  providers: [ParticipaYaService, ParticipaYaWasapClient],
  exports: [ParticipaYaService],
})
export class ParticipaYaModule {}
