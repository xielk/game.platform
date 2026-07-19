import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const expected = process.env.ADMIN_TOKEN;
    if (!expected) return true;
    const received = context.switchToHttp().getRequest().headers['x-admin-token'];
    if (received !== expected) throw new UnauthorizedException('管理员令牌无效');
    return true;
  }
}
