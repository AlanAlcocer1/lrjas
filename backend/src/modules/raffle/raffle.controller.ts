import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RaffleService } from './raffle.service';
import {
  CreateRaffleTicketDto,
  CreateRaffleTicketsBulkDto,
  DrawRaffleDto,
} from './dto/raffle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type AuthUser = { id: string; username: string; name: string };

@Controller('raffle-tickets')
export class RaffleController {
  constructor(private raffleService: RaffleService) {}

  /** Consulta pública: boletos de un código. */
  @Get('lookup/:code')
  lookup(@Param('code') code: string) {
    return this.raffleService.lookupByCode(code);
  }

  @Get('recent')
  @UseGuards(JwtAuthGuard)
  recent(
    @Query('limit') limit?: string,
    @Query('code') code?: string,
    @Query('date') date?: string,
  ) {
    const n = limit ? Number(limit) : 40;
    return this.raffleService.list({
      limit: Number.isFinite(n) ? n : 40,
      code,
      date,
    });
  }

  @Get('draw-pool')
  @UseGuards(JwtAuthGuard)
  drawPool(@Query('date') date?: string) {
    return this.raffleService.list({ limit: 5000, date, orderBy: 'folio' });
  }

  @Post('draw')
  @UseGuards(JwtAuthGuard)
  draw(@Body() body: DrawRaffleDto) {
    return this.raffleService.draw({
      date: body?.date,
      excludeIds: body?.excludeIds,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateRaffleTicketDto, @Req() req: { user: AuthUser }) {
    return this.raffleService.create(dto, req.user.id);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  createBulk(@Body() dto: CreateRaffleTicketsBulkDto, @Req() req: { user: AuthUser }) {
    return this.raffleService.createBulk(dto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.raffleService.remove(id);
  }
}
