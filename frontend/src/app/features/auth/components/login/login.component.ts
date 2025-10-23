import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiResponse, AuthData, ExternalLoginDto } from '../../../../core/models/auth.model';

// Declara el objeto google para TypeScript
declare global {
  interface Window {
    google: any;
  }
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class AuthLoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = false;
  isGoogleLoading = false;
  errorMessage = '';
  selectedDemo = '';

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(3)]]
  });

  ngOnInit() {
    // Inicializar Google Sign-In después de que la página cargue
    setTimeout(() => {
      this.initializeGoogleSignIn();
    }, 1000);
  }

  private initializeGoogleSignIn() {
    if (typeof window !== 'undefined' && window.google) {
      try {
        window.google.accounts.id.initialize({
          client_id: 'YOUR_GOOGLE_CLIENT_ID', // Reemplaza con tu client ID real
          callback: (response: any) => this.handleGoogleCallback(response),
          auto_select: false,
          cancel_on_tap_outside: true
        });
        console.log('Google Sign-In inicializado correctamente');
      } catch (error) {
        console.error('Error inicializando Google Sign-In:', error);
      }
    } else {
      console.warn('Google Sign-In no está disponible');
    }
  }

  /**
   * LOGIN TRADICIONAL CON EMAIL/PASSWORD
   */
  onLogin() {
    if (!this.loginForm.valid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const credentials = this.loginForm.value as { email: string; password: string };
    
    console.log('Iniciando login tradicional...');
    
    this.authService.login(credentials).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          console.log('Login tradicional exitoso');
          this.authService.handleSuccessfulLogin(response.data);
        } else {
          this.errorMessage = response.message || 'Error en el login';
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error en login tradicional:', error);
        
        if (error.status === 401) {
          this.errorMessage = 'Credenciales inválidas';
        } else if (error.status === 0) {
          this.errorMessage = 'Error de conexión. Verifique su internet.';
        } else {
          this.errorMessage = error.error?.message || 'Error del servidor';
        }
        
        this.isLoading = false;
      }
    });
  }

  /**
   * INICIAR LOGIN CON GOOGLE
   */
  loginWithGoogle() {
    if (this.isGoogleLoading) return;

    this.isGoogleLoading = true;
    this.errorMessage = '';

    if (typeof window !== 'undefined' && window.google) {
      try {
        // Mostrar el prompt de Google
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log('Google prompt no se mostró:', notification.getNotDisplayedReason());
            this.isGoogleLoading = false;
            this.errorMessage = 'No se pudo mostrar el login de Google. Intente de nuevo.';
          }
        });
      } catch (error) {
        console.error('Error mostrando Google prompt:', error);
        this.isGoogleLoading = false;
        this.errorMessage = 'Error al iniciar Google Sign-In';
      }
    } else {
      this.isGoogleLoading = false;
      this.errorMessage = 'Google Sign-In no está disponible';
    }
  }

  /**
   * CALLBACK DE GOOGLE SIGN-IN
   */
  private handleGoogleCallback(response: any) {
    console.log('Respuesta de Google recibida');
    
    try {
      // Decodificar el JWT token de Google
      const payload = this.decodeJWT(response.credential);
      
      if (payload) {
        console.log('Payload de Google:', payload);
        
        // Crear datos para el external login según tu API
        const externalLoginData: ExternalLoginDto = {
          provider: 'Google',
          externalId: payload.sub,
          email: payload.email,
          fullName: payload.name
        };

        console.log('Enviando datos de login externo:', externalLoginData);

        // Usar el método de tu AuthService
        this.authService.externalLogin(externalLoginData).subscribe({
          next: (response) => {
            if (response.isSuccess) {
              console.log('Login externo exitoso');
              this.authService.handleSuccessfulLogin(response.data);
            } else {
              this.errorMessage = response.message || 'Error en el login con Google';
            }
            this.isGoogleLoading = false;
          },
          error: (error) => {
            console.error('Error en Google login:', error);
            this.errorMessage = 'Error al iniciar sesión con Google';
            this.isGoogleLoading = false;
          }
        });
      } else {
        this.errorMessage = 'Error procesando respuesta de Google';
        this.isGoogleLoading = false;
      }
    } catch (error) {
      console.error('Error en handleGoogleCallback:', error);
      this.errorMessage = 'Error procesando login de Google';
      this.isGoogleLoading = false;
    }
  }

  /**
   * DECODIFICAR JWT TOKEN DE GOOGLE
   */
  private decodeJWT(token: string) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decodificando JWT:', error);
      return null;
    }
  }

  /**
   * LOGIN CON USUARIOS DEMO
   */
  loginAsDemo(email: string): void {
    this.selectedDemo = email;
    this.loginForm.patchValue({
      email: email,
      password: 'demo123'
    });
    
    // Marcar el botón como activo temporalmente
    setTimeout(() => {
      this.selectedDemo = '';
    }, 300);
  }

  /**
   * LIMPIAR MENSAJE DE ERROR
   */
  clearError(): void {
    this.errorMessage = '';
  }

  /**
   * VERIFICAR SI UN BOTÓN DEMO ESTÁ ACTIVO
   */
  isDemoActive(email: string): boolean {
    return this.selectedDemo === email;
  }
}