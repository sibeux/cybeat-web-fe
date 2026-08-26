export async function getCachedImage(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) {
    return url;
  }

  // Fix Django trailing slash issue for API endpoints to prevent CORS 301 redirects
  if (url.includes('/api/')) {
    url = url.replace(/([^\/])\?/, '$1/?');
  }

  return url;
}
