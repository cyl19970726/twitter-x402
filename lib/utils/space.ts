/**
 * 从 Twitter Space URL 中提取 Space ID
 */
export function extractSpaceId(url: string): string | null {
  const patterns = [
    /twitter\.com\/i\/spaces\/([a-zA-Z0-9]+)/,
    /x\.com\/i\/spaces\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * 验证 Space ID 格式
 */
export function isValidSpaceId(spaceId: string): boolean {
  // Twitter Space ID 通常是 13 位字母数字组合
  return /^[a-zA-Z0-9]{13}$/.test(spaceId);
}

/**
 * 验证 Space URL 格式
 */
export function isValidSpaceUrl(url: string): boolean {
  return extractSpaceId(url) !== null;
}
