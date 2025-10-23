// ===================================
// IMPORTS Y DEPENDENCIAS
// ===================================
// Importamos las dependencias necesarias de Angular y RxJS
import { Injectable, inject, afterNextRender } from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

// Importamos los modelos personalizados para tipado
import { User, UserRole, LoginCredentials, AuthData, ApiResponse, ExternalLoginDto } from '../models/auth.model';
import { environment } from '../../../environments/environment'; // Variables de entorno

// ===================================
// SERVICIO DE AUTENTICACIÓN
// ===================================
// Injectable con providedIn: 'root' hace que el servicio sea singleton en toda la app
@Injectable({ providedIn: 'root' })
export class AuthService {
    // Método updateCurrentUser
   // Método público para actualizar el usuario actual
  updateCurrentUser(user: User): void {
    this.currentUserSubject.next(user);
  }
  // ===================================
  // INYECCIÓN DE DEPENDENCIAS
  // ===================================
  // Usamos inject() (forma moderna de Angular 14+) en lugar de constructor injection
  private http = inject(HttpClient);        // Para hacer peticiones HTTP
  private router = inject(Router);          // Para navegación programática
  
  // ===================================
  // ESTADO REACTIVO DEL USUARIO
  // ===================================
  // BehaviorSubject mantiene el estado actual del usuario y emite a nuevos suscriptores
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable(); // Observable público para componentes
  
  // ===================================
  // CONFIGURACIÓN DE API
  // ===================================
  private authApiUrl = environment.authApiUrl; // URL base para endpoints de autenticación

  // ===================================
  // CONSTRUCTOR CON INICIALIZACIÓN SEGURA
  // ===================================
  constructor() {
    // afterNextRender() se ejecuta SOLO en el navegador, evita errores de SSR
    // Resuelve el problema "localStorage is not defined" en Angular 17+
    afterNextRender(() => {
      this.initializeAuth();
    });
  }

  // ===================================
  // INICIALIZACIÓN DE AUTENTICACIÓN
  // ===================================
  // Verifica si hay una sesión guardada al cargar la aplicación
  private initializeAuth(): void {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('currentUser');
    
    // Solo restaura la sesión si el token existe y no ha expirado
    if (token && userJson && !this.isTokenExpired()) {
      const user = JSON.parse(userJson);
      this.currentUserSubject.next(user); // Actualiza el estado del usuario
    }
  }

  // ===================================
  // LOGIN - MÉTODO OBSERVABLE PURO
  // ===================================
  // Retorna Observable<ApiResponse<AuthData>> - La estructura completa del servidor
  login(credentials: LoginCredentials): Observable<ApiResponse<AuthData>> {
    console.log('Login con API real:', this.authApiUrl);
    
    // POST que retorna: { isSuccess: boolean, message: string, data: AuthData, errorCode?: string }
    return this.http.post<ApiResponse<AuthData>>(`${this.authApiUrl}/auth/login`, credentials);
  }

  // ===================================
  // PROCESAMIENTO COMPLETO DE LOGIN
  // ===================================
  // Método que maneja todo el flujo de login con subscribe
  // Recibe ApiResponse<AuthData> y extrae los datos necesarios
  processLogin(credentials: LoginCredentials): void {
    this.login(credentials).subscribe({
      next: (response: ApiResponse<AuthData>) => {
        console.log('Respuesta del servidor:', response);
        
        // ===================================
        // VERIFICACIÓN DE RESPUESTA DEL SERVIDOR
        // ===================================
        // response.isSuccess indica si el login fue exitoso
        // response.message contiene mensaje de error o éxito
        if (!response.isSuccess) {
          console.error('Login fallido:', response.message || 'Error en el login');
          // Aquí podrías emitir un evento o mostrar un toast con response.message
          return;
        }

        // ===================================
        // EXTRACCIÓN DE DATOS DE AUTENTICACIÓN
        // ===================================
        // response.data contiene: { userId, email, fullName, role, token, expiresAt }
        const authData = response.data;
        console.log('Datos de autenticación recibidos:', authData);
        // ===================================
        // GUARDADO SEGURO EN LOCALSTORAGE
        // ===================================
        // Verificamos que localStorage esté disponible (evita errores en SSR)
        if (typeof localStorage !== 'undefined') {
          // Guardamos el token JWT (authData.token) para futuras peticiones
          localStorage.setItem('token', authData.token);
          // Guardamos la fecha de expiración (authData.expiresAt) para validaciones
          localStorage.setItem('tokenExpiration', authData.expiresAt);
          
          // ===================================
          // CREACIÓN DEL OBJETO USER PARA ESTADO LOCAL
          // ===================================
          // Extraemos solo los datos necesarios de AuthData para el User local
          const user: User = {
            userId: authData.userId,    // ID único del usuario
            email: authData.email,      // Email para mostrar en UI
            fullName: authData.fullName, // Nombre completo para UI
            role: authData.role         // Rol para control de acceso
          };
          
          console.log('Token guardado:', authData.token);

          // Guardamos el usuario serializado y actualizamos el estado reactivo
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user); // Notifica a todos los componentes suscriptores
        }
      },
      error: (error) => {
        console.error('Error en login:', error);
        
        // ===================================
        // MANEJO ESPECÍFICO DE ERRORES HTTP
        // ===================================
        // Diferentes códigos de estado HTTP requieren diferentes mensajes
        if (error.status === 401) {
          console.error('Credenciales inválidas - Usuario o contraseña incorrectos');
        } else if (error.status === 0) {
          console.error('Error de conexión - Verifique su internet o el servidor');
        } else if (error.error?.message) {
          // Si el servidor envía un mensaje de error específico
          console.error('Error del servidor:', error.error.message);
        } else {
          console.error('Error desconocido - Intente nuevamente');
        }
      }
    });
  }


  // Agrega este método a tu AuthService
handleSuccessfulLogin(authData: AuthData): void {
  console.log('🔄 Procesando login exitoso:', authData);
  
  // Guardado en localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('token', authData.token);
    localStorage.setItem('tokenExpiration', authData.expiresAt);
    
    const user: User = {
      userId: authData.userId,
      email: authData.email,
      fullName: authData.fullName,
      role: authData.role
    };
    
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
    
    console.log('💾 Usuario guardado:', user);
    console.log('🚀 Iniciando redirección...');
    
    // Redirigir usando el user que acabamos de crear
    this.redirectByRole(user);
  }
}

// Modifica redirectByRole para aceptar el user como parámetro opcional
redirectByRole(userParam?: User): void {
  const user = userParam || this.getCurrentUser();
  
  if (!user) {
    console.warn('⚠️ No hay usuario autenticado');
    this.router.navigate(['/auth/login']);
    return;
  }

  console.log('👤 Redirigiendo usuario con rol:', user.role);

  const roleRoutes: Record<string, string> = {
    [UserRole.ADMIN]: '/admin/dashboard',
    [UserRole.PATIENT]: '/patient/dashboard',
    [UserRole.PROFESSIONAL]: '/professional/dashboard',
    [UserRole.SCHEDULE_MANAGER]: '/manager/dashboard'
  };

  const route = roleRoutes[user.role];

  if (route) {
    console.log('✅ Navegando a:', route);
    this.router.navigate([route]);
  } else {
    console.warn('❌ Rol no reconocido:', user.role);
    this.router.navigate(['/unauthorized']);
  }
}
  // ===================================
  // VALIDACIÓN DE TOKEN
  // ===================================
  // Verifica con el servidor si el token actual sigue siendo válido
  validateToken(): void {
    const token = this.getToken();
    if (!token) {
      console.error('No hay token');
      return;
    }

    // Petición al endpoint de validación
    this.http.get<ApiResponse<any>>(`${this.authApiUrl}/auth/validate-token`).subscribe({
      next: (response) => {
        // Si el servidor dice que el token no es válido, cerrar sesión
        if (!response.isSuccess) {
          this.logout();
        }
      },
      error: () => {
        // Cualquier error en validación = logout por seguridad
        this.logout();
        console.error('Token inválido');
      }
    });
  }

  // ===================================
  // LOGOUT - LIMPIEZA COMPLETA
  // ===================================
  // Elimina todos los datos de sesión y redirige al login
  logout(): void {
    // Verificación de seguridad para localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('tokenExpiration');
      localStorage.removeItem('currentUser');
    }
    
    // Limpiar estado reactivo y redirigir
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  // ===================================
  // GETTERS DE ESTADO ACTUAL
  // ===================================
  // Obtiene el usuario actual sin suscripción
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Obtiene el token JWT del localStorage con verificación segura
  getToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  // ===================================
  // VERIFICACIONES DE AUTENTICACIÓN
  // ===================================
  // Verifica si el usuario está autenticado y el token es válido
  isAuthenticated(): boolean {
    return !!this.getToken() && !this.isTokenExpired();
  }

  // Verifica si el token JWT ha expirado comparando fechas
  isTokenExpired(): boolean {
    // Verificación de entorno para evitar errores en SSR
    if (typeof localStorage === 'undefined') return true;
    
    const expiration = localStorage.getItem('tokenExpiration');
    if (!expiration) return true;
    
    // Comparación de fechas: ahora vs expiración
    const expirationDate = new Date(expiration);
    return new Date() >= expirationDate;
  }

  // ===================================
  // VERIFICACIÓN DE ROLES
  // ===================================
  // Verifica si el usuario actual tiene un rol específico
  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  // En auth.service.ts - Agregar este método
externalLogin(externalData: ExternalLoginDto): Observable<ApiResponse<AuthData>> {
  console.log('External login con:', externalData);
  return this.http.post<ApiResponse<AuthData>>(`${this.authApiUrl}/external-auth/login`, externalData);
}
 
}