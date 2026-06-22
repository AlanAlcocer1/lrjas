import { Module } from '@nestjs/common';
import { PredictionsController } from './predictions.controller';
import { PredictionsService } from './predictions.service';
import { PronosticoManagerGuard } from './guards/pronostico-manager.guard';

@Module({
  controllers: [PredictionsController],
  providers: [PredictionsService, PronosticoManagerGuard],
})
export class PredictionsModule {}
