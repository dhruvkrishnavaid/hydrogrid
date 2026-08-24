export interface AuthUser {
  id: string;
  email?: string;
  userMetadata?: Record<string, unknown>;
}
