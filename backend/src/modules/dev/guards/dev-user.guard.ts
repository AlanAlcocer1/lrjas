import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class DevUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: { username?: string } }>();
    const username = request.user?.username?.toLowerCase();

    if (username !== '000') {
      throw new ForbiddenException('Acceso restringido al usuario 000');
    }

    return true;
  }
}
