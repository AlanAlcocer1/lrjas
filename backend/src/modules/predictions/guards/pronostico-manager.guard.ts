import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { isPronosticoManager } from '../../../common/pronostico-manager-access';

@Injectable()
export class PronosticoManagerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: { username?: string } }>();

    if (!isPronosticoManager(request.user?.username)) {
      throw new ForbiddenException('Solo los usuarios 000 y 001 pueden editar o eliminar pronósticos');
    }

    return true;
  }
}
