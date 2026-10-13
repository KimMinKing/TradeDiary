// [파일 용도] JWT Base64URL payload 해석 및 만료·사용자 정보 조회

// [용도] JWT payload를 안전하게 해석 / [호출] 인증 store, 세션 타이머, 알림 연결
export const decodeJwtPayload = (token) => {
  if (!token || typeof token !== 'string') return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(payload.length + ((4 - payload.length % 4) % 4), '=');
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
};

// [용도] JWT 만료 시각을 밀리초로 반환 / [호출] 인증 검사, 알림 사전 갱신
export const getTokenExpirationMs = (token) => {
  const expiration = decodeJwtPayload(token)?.exp;
  return typeof expiration === 'number' ? expiration * 1000 : null;
};

// [용도] JWT subject 사용자 ID 반환 / [호출] Navbar 등 사용자 식별
export const getTokenUserId = (token) => {
  const subject = decodeJwtPayload(token)?.sub;
  const userId = Number(subject);
  return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
};
