import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WalletPassesService } from './wallet-passes.service';

@Controller('wallet-passes')
export class WalletPassesController {
  constructor(private walletPassesService: WalletPassesService) {}

  /** Admin: listado de pases emitidos. */
  @Get('admin')
  @UseGuards(JwtAuthGuard)
  listAdmin(@Query('limit') limit?: string, @Query('code') code?: string) {
    const n = limit ? Number(limit) : 100;
    return this.walletPassesService.listAdmin({
      limit: Number.isFinite(n) ? n : 100,
      code,
    });
  }

  /** Admin: elimina (revoca remoto + borra local) para poder regenerar. */
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.walletPassesService.removeById(id);
  }

  /** Admin: revoca y crea de nuevo con branding actual. */
  @Post('admin/:id/regenerate')
  @UseGuards(JwtAuthGuard)
  regenerate(@Param('id') id: string) {
    return this.walletPassesService.regenerateById(id);
  }

  /** Consulta si ya existe un pase para el código. */
  @Get('code/:code')
  find(@Param('code') code: string) {
    return this.walletPassesService.findByCode(code);
  }

  /** Crea el pase (o devuelve el existente). */
  @Post('code/:code')
  create(@Param('code') code: string) {
    return this.walletPassesService.getOrCreateByCode(code);
  }

  /** Descarga el .pkpass para Apple Wallet. */
  @Get('code/:code/apple.pkpass')
  async applePkpass(@Param('code') code: string, @Res() res: Response) {
    const { filename, buffer } = await this.walletPassesService.getApplePkpass(code);
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }
}
