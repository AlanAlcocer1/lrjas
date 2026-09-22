import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ActividadesAuthService } from './actividades-auth.service';
import { CodeLoginDto } from './dto/code-login.dto';
import {
  ActividadesUser,
  ParticipantJwtAuthGuard,
} from './guards/permissions.guard';

@Controller('actividades/auth')
export class ActividadesAuthController {
  constructor(private authService: ActividadesAuthService) {}

  @Post('login')
  login(@Body() dto: CodeLoginDto) {
    return this.authService.loginByCode(dto);
  }

  @Get('me')
  @UseGuards(ParticipantJwtAuthGuard)
  me(@Req() req: { user: ActividadesUser }) {
    return this.authService.me(req.user.id);
  }
}
