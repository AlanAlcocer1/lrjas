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
export const ANY_PERMISSIONS_KEY = 'any_permissions';

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** Pasa si el usuario tiene al menos uno de los permisos. */
export const RequireAnyPermissions = (...permissions: string[]) =>
  SetMetadata(ANY_PERMISSIONS_KEY, permissions);

export type ActividadesUser = {
  id: string;
  code: string;
  name: string;
  permissions: string[];
  roles: { id: string; name: string }[];
  /** Equipos a los que pertenece (para restringir create/edit). */
  teamIds: string[];
};

export function canManageTeam(
  user: Pick<ActividadesUser, 'permissions' | 'teamIds'>,
  teamId: string | null | undefined,
): boolean {
  if (user.permissions.includes('activities.manage_all')) return true;
  if (!teamId) return false;
  return user.teamIds.includes(teamId);
}

@Injectable()
export class ParticipantJwtAuthGuard extends AuthGuard('participant-jwt') {}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredAll = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredAny = this.reflector.getAllAndOverride<string[]>(ANY_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if ((!requiredAll || requiredAll.length === 0) && (!requiredAny || requiredAny.length === 0)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: ActividadesUser }>();
    const user = request.user;
    if (!user) throw new UnauthorizedException();

    if (requiredAll?.length) {
      const hasAll = requiredAll.every((p) => user.permissions.includes(p));
      if (!hasAll) {
        throw new ForbiddenException('No tienes permiso para esta acción');
      }
    }

    if (requiredAny?.length) {
      const hasAny = requiredAny.some((p) => user.permissions.includes(p));
      if (!hasAny) {
        throw new ForbiddenException('No tienes permiso para esta acción');
      }
    }

    return true;
  }
}
