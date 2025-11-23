import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../users/role.enum'; // Переконайтеся, що шлях правильний
import { ROLES_KEY } from '../decorators/roles.decorator'; // Переконайтеся, що шлях правильний

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Зчитуємо необхідні ролі з метаданих маршруту
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Якщо ролі не визначені, маршрут доступний для всіх
    if (!requiredRoles) {
      return true;
    }

    // 2. Отримуємо об'єкт користувача з запиту (він має бути приєднаний після AuthGuard('jwt'))
    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
        // Якщо JWT Guard не спрацював, або об'єкт user відсутній
        throw new ForbiddenException('Access denied: User authentication data is missing.');
    }

    // 3. Перевіряємо, чи роль користувача відповідає одній із необхідних
    const hasRequiredRole = requiredRoles.some((role) => user.role === role);

    if (!hasRequiredRole) {
         throw new ForbiddenException('Access denied: Insufficient privileges.');
    }

    return true;
  }
}
