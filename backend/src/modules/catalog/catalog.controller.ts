import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CreateStakeDto, CreateWardDto, UpdateStakeDto, UpdateWardDto } from './dto/catalog.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('catalog')
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  @Get('stakes')
  getStakes(@Query('all') all?: string) {
    if (all === 'true') return this.catalogService.findAllAdmin();
    return this.catalogService.getStakes();
  }

  @Post('stakes')
  @UseGuards(JwtAuthGuard)
  createStake(@Body() dto: CreateStakeDto) {
    return this.catalogService.createStake(dto);
  }

  @Put('stakes/:id')
  @UseGuards(JwtAuthGuard)
  updateStake(@Param('id') id: string, @Body() dto: UpdateStakeDto) {
    return this.catalogService.updateStake(id, dto);
  }

  @Get('stakes/:stakeId/wards')
  getWards(@Param('stakeId') stakeId: string) {
    return this.catalogService.getWardsByStake(stakeId);
  }

  @Post('stakes/:stakeId/wards')
  @UseGuards(JwtAuthGuard)
  createWard(@Param('stakeId') stakeId: string, @Body() dto: CreateWardDto) {
    return this.catalogService.createWard(stakeId, dto);
  }

  @Put('wards/:id')
  @UseGuards(JwtAuthGuard)
  updateWard(@Param('id') id: string, @Body() dto: UpdateWardDto) {
    return this.catalogService.updateWard(id, dto);
  }
}
