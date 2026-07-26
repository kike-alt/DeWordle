export type AdminRole =
  | 'super_admin'
  | 'game_admin'
  | 'content_admin'
  | 'readonly_admin';

export interface AdminRegistryEntry {
  address: string;
  role: AdminRole;
  grantedAt: Date;
  expiresAt?: Date;
}

export class AdminRoleRegistry {
  private static entries: Map<string, AdminRegistryEntry> = new Map();

  static register(entry: AdminRegistryEntry): void {
    this.entries.set(entry.address, entry);
  }

  static getRole(address: string): AdminRole | null {
    const entry = this.entries.get(address);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.entries.delete(address);
      return null;
    }
    return entry.role;
  }

  static isAdmin(address: string): boolean {
    return this.getRole(address) !== null;
  }

  static hasRole(address: string, role: AdminRole): boolean {
    return this.getRole(address) === role;
  }

  static getAll(): AdminRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  static remove(address: string): void {
    this.entries.delete(address);
  }
}
