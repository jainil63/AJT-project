/**
 * Builds a viewable URL for a stored file.
 *
 * Files now live in a private S3 bucket — the backend's `/api/file/view`
 * endpoint authenticates the request and 302-redirects to a short-lived
 * presigned S3 URL. The auth token is passed as a query param so plain
 * <img> / <a> tags (which can't set headers) still work.
 *
 * Accepts either an S3 object key (new uploads) or a full http(s) URL.
 */
export const fileUrl = (keyOrPath) => {
  if (!keyOrPath) return '';
  if (keyOrPath.startsWith('http://') || keyOrPath.startsWith('https://')) {
    return keyOrPath;
  }
  // Use a same-origin path so the request goes back to whoever served the
  // page (dev machine IP, prod domain, or the WebView host) — `localhost`
  // baked into the URL breaks every non-desktop client.
  const token = localStorage.getItem('token') || '';
  const key = String(keyOrPath).replace(/\\/g, '/').replace(/^\/+/, '');
  return `/api/file/view?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`;
};

/** True when a stored file looks like a viewable image (by extension). */
export const isImageFile = (keyOrPath) => {
  if (!keyOrPath) return false;
  return /\.(jpe?g|png|gif|webp|bmp|svg|avif)$/i.test(String(keyOrPath));
};

export default fileUrl;
