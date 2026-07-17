import type { IAuthStoreDeps } from '../types';

let authStoreDeps: IAuthStoreDeps | null = null;

export function setAuthStoreDeps(deps: IAuthStoreDeps): void {
  authStoreDeps = deps;
}

export function getAuthStoreDeps(): IAuthStoreDeps | null {
  return authStoreDeps;
}
