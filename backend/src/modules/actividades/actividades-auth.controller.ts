import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ActividadesAuthService } from './actividades-auth.service';
import { CodeLoginDto } from './dto/code-login.dto';
import {
  ActividadesUser,
  ParticipantJwtAuthGuard,
} from './guards/permissions.guard';

function clientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() || null;
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]?.trim() || null;
  }
  return req.ip || req.socket?.remoteAddress || null;
}

@Controller('actividades/auth')
export class ActividadesAuthController {
  constructor(private authService: ActividadesAuthService) {}

  @Post('login')
  login(@Body() dto: CodeLoginDto, @Req() req: Request) {
    return this.authService.loginByCode(dto, {
      ip: clientIp(req),
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Get('me')
  @UseGuards(ParticipantJwtAuthGuard)
  me(@Req() req: { user: ActividadesUser }) {
    return this.authService.me(req.user.id);
  }
}
