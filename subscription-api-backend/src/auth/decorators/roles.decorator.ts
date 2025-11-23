import { SetMetadata } from '@nestjs/common';
import { Role } from '../../users/role.enum'; // Переконайтеся, що шлях правильний

export const ROLES_KEY = 'roles';
// Функція-декоратор, яка додає метадані ролей до обробника маршруту
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
