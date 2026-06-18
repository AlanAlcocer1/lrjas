import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import { isDevConsoleUser } from '../../../common/dev-console-access';

@Injectable()
export class DevUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: { username?: string } }>();

    if (!isDevConsoleUser(request.user?.username)) {
      throw new ForbiddenException('Acceso restringido a usuarios de desarrollo');
    }

    return true;
  }
}
