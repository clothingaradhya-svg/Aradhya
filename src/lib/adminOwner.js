const DEFAULT_OWNER_ADMIN_EMAIL = 'admin@local.test';

export const OWNER_ADMIN_EMAIL =
  String(import.meta.env.VITE_OWNER_ADMIN_EMAIL || DEFAULT_OWNER_ADMIN_EMAIL)
    .trim()
    .toLowerCase();

export const isOwnerAdmin = (admin) =>
  String(admin?.email || '').trim().toLowerCase() === OWNER_ADMIN_EMAIL;
