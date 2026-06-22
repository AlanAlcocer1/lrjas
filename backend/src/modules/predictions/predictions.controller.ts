import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { PredictionsService } from './predictions.service';
import { CreatePredictionDto, UpdatePredictionDto } from './dto/prediction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PronosticoManagerGuard } from './guards/pronostico-manager.guard';

@Controller('predictions')
export class PredictionsController {
  constructor(private predictionsService: PredictionsService) {}

  @Get('match')
  getMatch() {
    return this.predictionsService.getMatchInfo();
  }

  @Get('status')
  getStatus(@Query('code') code: string) {
    if (!code?.trim()) {
      return this.predictionsService.getMatchInfo();
    }
    return this.predictionsService.findByCode(code);
  }

  @Post()
  create(@Body() dto: CreatePredictionDto) {
    return this.predictionsService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAllAdmin() {
    return this.predictionsService.findAllAdmin();
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PronosticoManagerGuard)
  update(@Param('id') id: string, @Body() dto: UpdatePredictionDto) {
    return this.predictionsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PronosticoManagerGuard)
  remove(@Param('id') id: string) {
    return this.predictionsService.remove(id);
  }
}
