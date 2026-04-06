import { SetMetadata } from '@nestjs/common';
import type { UserRoleType } from '@erp/shared-types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRoleType[]) => SetMetadata(ROLES_KEY, roles);
