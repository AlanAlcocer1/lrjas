import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ActividadesAuthService } from './actividades-auth.service';
import { ActividadesAuthController } from './actividades-auth.controller';
import { ParticipantJwtStrategy } from './strategies/participant-jwt.strategy';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { ActividadesUsersService } from './actividades-users.service';
import { ActividadesUsersController } from './actividades-users.controller';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';
import { CalendarIcsService } from './calendar-ics.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'participant-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'lrjas_jwt_secret',
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') || '7d' },
      }),
    }),
  ],
  controllers: [
    ActividadesAuthController,
    RolesController,
    TeamsController,
    ActividadesUsersController,
    ActivitiesController,
  ],
  providers: [
    ActividadesAuthService,
    ParticipantJwtStrategy,
    PermissionsGuard,
    RolesService,
    TeamsService,
    ActividadesUsersService,
    ActivitiesService,
    CalendarIcsService,
  ],
  exports: [ActividadesAuthService],
})
export class ActividadesModule {}
