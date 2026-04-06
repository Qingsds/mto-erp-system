import type { Request } from 'express';

export interface AuthenticatedUser {
  id: number;
  username: string;
  realName: string;
  isActive: boolean;
}

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};
