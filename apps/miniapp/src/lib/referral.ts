export function deriveReferralCode(userId: string): string {
  const normalized = userId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const suffix = normalized.slice(-6).padStart(6, '0');
  return `ECO-${suffix}`;
}

export function buildReferralShareText(referralCode: string): string {
  return `Tham gia ECOllect cùng quán của tôi để bán dầu ăn đã qua sử dụng minh bạch và nhận thưởng xanh! Dùng mã giới thiệu: ${referralCode}`;
}
