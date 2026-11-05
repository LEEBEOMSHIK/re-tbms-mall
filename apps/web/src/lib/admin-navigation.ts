export function adminSection(path: string): string {
  const within = (root: string) => path === root || path.startsWith(`${root}/`);
  if (within('/admin/shipments') || within('/admin/catalog/inventory') || within('/admin/catalog/suppliers')) return '/admin/catalog/inventory';
  if (within('/admin/catalog')) return '/admin/catalog';
  if (within('/admin/orders')) return '/admin/orders';
  if (within('/admin/designs')) return '/admin/designs';
  if (within('/admin/factories')) return '/admin/factories';
  if (within('/admin/site') || within('/admin/brand-about') || within('/admin/brand-library') || within('/admin/merchandising')) return '/admin/site';
  if (within('/admin/reviews')) return '/admin/reviews';
  if (within('/admin/payment-preparation')) return '/admin/payment-preparation';
  if (within('/admin/carrier-preparation')) return '/admin/carrier-preparation';
  if (within('/admin/design-system')) return '/admin/design-system';
  if (within('/admin/workboard')) return '/admin/workboard';
  return path === '/admin' ? '/admin' : '';
}
