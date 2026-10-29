export function adminSection(path: string): string {
  const within = (root: string) => path === root || path.startsWith(`${root}/`);
  if (within('/admin/shipments') || within('/admin/catalog/inventory') || within('/admin/catalog/suppliers')) return '/admin/catalog/inventory';
  if (within('/admin/catalog')) return '/admin/catalog';
  if (within('/admin/designs')) return '/admin/designs';
  if (within('/admin/factories')) return '/admin/factories';
  if (within('/admin/merchandising')) return '/admin/merchandising';
  if (within('/admin/reviews')) return '/admin/reviews';
  if (within('/admin/workboard')) return '/admin/workboard';
  return path === '/admin' ? '/admin' : '';
}
