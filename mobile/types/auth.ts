export interface User { id: string; email: string; username: string; is_active: boolean; }
export interface AuthTokens { access_token: string; refresh_token: string; token_type: string; }
export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest { email: string; username: string; password: string; }
