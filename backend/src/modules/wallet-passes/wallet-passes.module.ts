import { Module } from '@nestjs/common';
import { WalletPassesController } from './wallet-passes.controller';
import { WalletPassesService } from './wallet-passes.service';

@Module({
  controllers: [WalletPassesController],
  providers: [WalletPassesService],
  exports: [WalletPassesService],
})
export class WalletPassesModule {}
