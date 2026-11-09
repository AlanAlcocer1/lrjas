import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpsertParticipaYaDto } from './dto/participa-ya.dto';
import { ParticipaYaService } from './participa-ya.service';

type AuthUser = { id: string; username: string; name: string };

@Controller('participa-ya')
export class ParticipaYaController {
  constructor(private service: ParticipaYaService) {}

  /** Ranking público para la home. */
  @Get('ranking')
  ranking(@Query('limit') limit?: string) {
    const n = limit ? Number(limit) : 50;
    return this.service.ranking(Number.isFinite(n) ? n : 50);
  }

  @Get('entries')
  @UseGuards(JwtAuthGuard)
  list() {
    return this.service.listAdmin();
  }

  @Put('entries')
  @UseGuards(JwtAuthGuard)
  upsert(@Body() dto: UpsertParticipaYaDto, @Req() req: { user: AuthUser }) {
    return this.service.upsert(dto.code, dto.score, req.user.id);
  }

  @Delete('entries/:id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get('whatsapp/status')
  @UseGuards(JwtAuthGuard)
  waStatus() {
    return this.service.whatsappStatus();
  }

  @Get('whatsapp/qr')
  @UseGuards(JwtAuthGuard)
  waQr() {
    return this.service.whatsappQr();
  }

  @Post('whatsapp/send-now')
  @UseGuards(JwtAuthGuard)
  sendNow() {
    return this.service.sendNow();
  }
}
