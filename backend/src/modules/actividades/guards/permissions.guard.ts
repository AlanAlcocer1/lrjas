import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export type ActividadesUser = {
  id: string;
  code: string;
  name: string;
  permissions: string[];
  roles: { id: string; name: string }[];
};

@Injectable()
export class ParticipantJwtAuthGuard extends AuthGuard('participant-jwt') {}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: ActividadesUser }>();
    const user = request.user;
    if (!user) throw new UnauthorizedException();

    const hasAll = required.every((p) => user.permissions.includes(p));
    if (!hasAll) {
      throw new ForbiddenException('No tienes permiso para esta acción');
    }
    return true;
  }
}
