export function getDecodedToken() {
  const token = localStorage.getItem('google_id_token');
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (err) {
    console.error('Failed to decode token:', err);
    return null;
  }
}

export function isTokenExpired(bufferInSeconds = 1800) { // 30 phút = 1800s
  const payload = getDecodedToken();
  if (!payload || !payload.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  return now > (payload.exp - bufferInSeconds);
}

