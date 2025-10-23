import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  console.log('authGard. Checkeando');

  if (authService.isAuthenticated()) {
    console.log('TRUE');
    return true;
  }
  
  console.log('FALSE. nAVEGANDO AL LOGIN');
  router.navigate(['/auth/login']);
  return false;
};