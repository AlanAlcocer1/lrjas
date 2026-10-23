import { Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { WalletPassesService } from './wallet-passes.service';

@Controller('wallet-passes')
export class WalletPassesController {
  constructor(private walletPassesService: WalletPassesService) {}

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
