import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ActividadesAuthService } from '../actividades-auth.service';

@Injectable()
export class ParticipantJwtStrategy extends PassportStrategy(Strategy, 'participant-jwt') {
  constructor(
    configService: ConfigService,
    private authService: ActividadesAuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'lrjas_jwt_secret',
    });
  }

  async validate(payload: { sub: string; typ?: string }) {
    if (payload.typ !== 'participant') {
      throw new UnauthorizedException();
    }
    const user = await this.authService.validateParticipant(payload.sub);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
