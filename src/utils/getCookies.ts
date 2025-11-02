/**
 * 从浏览器导出 Twitter Cookies 的工具函数
 *
 * 使用方法:
 * 1. 在浏览器中登录 Twitter/X
 * 2. 打开开发者工具 (F12)
 * 3. 在 Console 中运行以下代码复制 cookies:
 *
 * ```javascript
 * copy(document.cookie.split('; ').map(c => {
 *   const [name, value] = c.split('=');
 *   return { key: name, value: value, domain: '.twitter.com', path: '/' };
 * }))
 * ```
 *
 * 4. 将复制的 JSON 保存到文件或环境变量中
 */

export interface TwitterCookie {
  key: string;
  value: string;
  domain: string;
  path: string;
}

/**
 * 从 JSON 字符串解析 cookies
 */
export function parseCookiesFromJson(cookiesJson: string): TwitterCookie[] {
  try {
    return JSON.parse(cookiesJson);
  } catch (error) {
    throw new Error('Invalid cookies JSON format');
  }
}

/**
 * 验证 cookies 是否包含必需的字段
 */
export function validateCookies(cookies: TwitterCookie[]): boolean {
  const requiredCookies = ['auth_token', 'ct0'];
  const cookieNames = cookies.map(c => c.key);

  return requiredCookies.every(required => cookieNames.includes(required));
}
