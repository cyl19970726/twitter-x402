import { Scraper } from '@pacoyang/agent-twitter-client';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface SpaceDownloadResult {
  audioPath: string;
  metadata: {
    title: string;
    creator?: string;
    isAvailableForReplay: boolean;
    mediaKey?: string;
  };
}

/**
 * 直接调用 Twitter API 获取 Space 数据（绕过库的 bug）
 */
async function fetchAudioSpaceByIdDirect(spaceId: string, scraper: Scraper): Promise<any> {
  // 从环境变量获取 cookies
  const cookiesJson = process.env.TWITTER_COOKIES;
  if (!cookiesJson) {
    throw new Error('Missing TWITTER_COOKIES');
  }

  const cookies = JSON.parse(cookiesJson);
  const cookieHeader = cookies.map((c: any) => `${c.key}=${c.value}`).join('; ');

  const ct0Cookie = cookies.find((c: any) => c.key === 'ct0');
  const ct0 = ct0Cookie?.value;

  if (!ct0) {
    throw new Error('Missing ct0 cookie (CSRF token)');
  }

  const queryId = 'Tvv_cNXCbtTcgdy1vWYPMw';
  const variables = {
    id: spaceId,
    isMetatagsQuery: false,
    withReplays: true,
    withListeners: true
  };

  const features = {
    spaces_2022_h2_spaces_communities: true,
    spaces_2022_h2_clipping: true,
    creator_subscriptions_tweet_preview_api_enabled: true,
    profile_label_improvements_pcf_label_in_post_enabled: false,
    rweb_tipjar_consumption_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    premium_content_api_read_enabled: false,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    responsive_web_grok_analyze_button_fetch_trends_enabled: true,
    articles_preview_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    creator_subscriptions_quote_tweet_preview_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    rweb_video_timestamps_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_enhance_cards_enabled: false
  };

  const url = `https://x.com/i/api/graphql/${queryId}/AudioSpaceById?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(features))}`;

  const headers = {
    'Accept': '*/*',
    'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
    'Content-Type': 'application/json',
    'Cookie': cookieHeader,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'x-twitter-auth-type': 'OAuth2Client',
    'x-twitter-active-user': 'yes',
    'x-csrf-token': ct0,
    'Referer': 'https://x.com/',
    'Origin': 'https://x.com'
  };

  const response = await fetch(url, {
    method: 'GET',
    headers: headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twitter API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (data.errors && data.errors.length > 0) {
    throw new Error(`Twitter API errors: ${JSON.stringify(data.errors)}`);
  }

  // 转换为库的格式
  const audioSpace = data.data.audioSpace;
  return {
    metadata: {
      rest_id: audioSpace.metadata.rest_id,
      state: audioSpace.metadata.state,
      title: audioSpace.metadata.title,
      media_key: audioSpace.metadata.media_key,
      created_at: audioSpace.metadata.created_at,
      started_at: audioSpace.metadata.started_at,
      ended_at: audioSpace.metadata.ended_at,
      creator_id: audioSpace.metadata.creator_results?.result?.rest_id,
      is_space_available_for_replay: audioSpace.metadata.is_space_available_for_replay,
    }
  };
}

/**
 * 直接调用 Twitter API 获取流状态（绕过库的 bug）
 */
async function fetchLiveVideoStreamStatusDirect(mediaKey: string): Promise<any> {
  const cookiesJson = process.env.TWITTER_COOKIES;
  if (!cookiesJson) {
    throw new Error('Missing TWITTER_COOKIES');
  }

  const cookies = JSON.parse(cookiesJson);
  const cookieHeader = cookies.map((c: any) => `${c.key}=${c.value}`).join('; ');

  const ct0Cookie = cookies.find((c: any) => c.key === 'ct0');
  const ct0 = ct0Cookie?.value;

  if (!ct0) {
    throw new Error('Missing ct0 cookie (CSRF token)');
  }

  const baseUrl = `https://x.com/i/api/1.1/live_video_stream/status/${mediaKey}`;
  const queryParams = new URLSearchParams({
    client: 'web',
    use_syndication_guest_id: 'false',
    cookie_set_host: 'x.com'
  });
  const url = `${baseUrl}?${queryParams.toString()}`;

  const headers = {
    'Accept': '*/*',
    'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
    'Content-Type': 'application/json',
    'Cookie': cookieHeader,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'x-twitter-auth-type': 'OAuth2Client',
    'x-twitter-active-user': 'yes',
    'x-csrf-token': ct0,
    'Referer': 'https://x.com/',
    'Origin': 'https://x.com'
  };

  const response = await fetch(url, {
    method: 'GET',
    headers: headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch stream status (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * 从 Space URL 提取 Space ID
 * 支持的格式:
 * - https://twitter.com/i/spaces/1vOGwAbcdEFGH
 * - https://x.com/i/spaces/1vOGwAbcdEFGH
 */
export function extractSpaceId(url: string): string {
  const match = url.match(/spaces\/([a-zA-Z0-9]+)/);
  if (!match) {
    throw new Error('Invalid Space URL format. Expected format: https://twitter.com/i/spaces/[ID]');
  }
  return match[1];
}

/**
 * 使用 FFmpeg 下载 HLS 流
 */
function downloadWithFFmpeg(hlsUrl: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[FFmpeg] Starting download: ${hlsUrl}`);
    console.log(`[FFmpeg] Output: ${outputPath}`);

    const ffmpeg = spawn('ffmpeg', [
      '-y',                      // 覆盖已存在的文件
      '-i', hlsUrl,             // 输入 HLS URL
      '-c', 'copy',             // 不重新编码 (更快)
      '-bsf:a', 'aac_adtstoasc', // 修复 AAC 流
      outputPath
    ]);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      // 只输出进度相关信息
      if (output.includes('time=') || output.includes('speed=')) {
        process.stdout.write('\r' + output.trim().split('\n').pop());
      }
    });

    ffmpeg.on('close', (code) => {
      console.log(''); // 换行
      if (code === 0) {
        console.log(`[FFmpeg] Download complete`);
        resolve();
      } else {
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr.slice(-500)}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`FFmpeg error: ${err.message}`));
    });
  });
}

/**
 * 下载已结束的 Twitter Space 录音
 * @param spaceUrl - Twitter Space 的完整 URL
 * @returns 下载结果，包含音频文件路径和元数据
 */
export async function downloadFinishedSpace(
  spaceUrl: string
): Promise<SpaceDownloadResult> {
  console.log(`\n=== Starting Twitter Space Download ===`);
  console.log(`URL: ${spaceUrl}\n`);

  // 1. 提取 Space ID
  const spaceId = extractSpaceId(spaceUrl);
  console.log(`[1/5] Extracted Space ID: ${spaceId}`);

  // 2. 登录 Twitter (使用 cookies)
  console.log(`[2/5] Authenticating with Twitter...`);

  const scraper = new Scraper();

  // 优先使用 cookies 认证
  const cookiesJson = process.env.TWITTER_COOKIES;
  console.log(`  DEBUG: TWITTER_COOKIES type: ${typeof cookiesJson}`);
  console.log(`  DEBUG: TWITTER_COOKIES value: ${cookiesJson ? cookiesJson.substring(0, 100) + '...' : 'undefined/null/empty'}`);

  if (cookiesJson) {
    console.log(`  Using cookies from TWITTER_COOKIES...`);
    try {
      const cookies = JSON.parse(cookiesJson);

      // 转换为简单的 cookie 字符串格式: "name=value"
      const cookieStrings = cookies.map((c: any) => {
        return `${c.key}=${c.value}`;
      });

      await scraper.setCookies(cookieStrings);
      console.log(`✓ Authenticated with cookies (${cookies.length} cookies)`);
    } catch (error) {
      throw new Error(`Failed to set cookies: ${(error as Error).message}`);
    }
  } else {
    // 回退到用户名密码登录
    const username = process.env.TWITTER_USERNAME;
    const password = process.env.TWITTER_PASSWORD;
    const email = process.env.TWITTER_EMAIL;

    if (!username || !password) {
      throw new Error(
        'Missing Twitter credentials. Please set either:\n' +
        '  1. TWITTER_COOKIES (recommended) - see SETUP.md for instructions\n' +
        '  2. TWITTER_USERNAME and TWITTER_PASSWORD'
      );
    }

    console.log(`  Logging in as @${username}...`);
    console.log(`  Note: May be blocked by Cloudflare. Consider using TWITTER_COOKIES instead.`);

    try {
      await scraper.login(username, password, email);
      console.log(`✓ Logged in as @${username}`);
    } catch (error) {
      const errorMsg = (error as Error).message;
      if (errorMsg.includes('Cloudflare') || errorMsg.includes('blocked')) {
        throw new Error(
          'Login blocked by Cloudflare. Please use TWITTER_COOKIES instead.\n' +
          'See SETUP.md for instructions on how to export cookies from your browser.'
        );
      }
      throw error;
    }
  }

  // 3. 获取 Space 元数据 (使用直接 API 调用，因为库的方法有 bug)
  console.log(`[3/5] Fetching Space metadata...`);
  let space;
  try {
    space = await fetchAudioSpaceByIdDirect(spaceId, scraper);
  } catch (error) {
    const errorMsg = (error as Error).message;
    console.error(`   Error details: ${errorMsg}`);
    throw new Error(`Failed to fetch Audio Space: ${errorMsg}`);
  }

  console.log(`✓ Space Title: "${space.metadata.title || 'Untitled'}"`);
  console.log(`✓ Creator ID: ${space.metadata.creator_id || 'Unknown'}`);
  console.log(`✓ Available for replay: ${space.metadata.is_space_available_for_replay}`);

  // 4. 检查是否可以重播
  if (!space.metadata.is_space_available_for_replay) {
    throw new Error('This Space is not available for replay. It may have been deleted or set to private.');
  }

  const mediaKey = space.metadata.media_key;
  if (!mediaKey) {
    throw new Error('No media key found for this Space. Recording may not be available.');
  }

  // 5. 获取 HLS 流 URL (使用直接 API 调用，因为库的方法有 bug)
  console.log(`[4/5] Fetching HLS stream URL...`);
  const status = await fetchLiveVideoStreamStatusDirect(mediaKey);

  if (!status.source?.location) {
    throw new Error('No HLS URL found. Space recording may not be available yet or has expired.');
  }

  const hlsUrl = status.source.location;
  console.log(`✓ HLS URL obtained: ${hlsUrl.substring(0, 60)}...`);

  // 6. 下载音频
  console.log(`[5/5] Downloading audio with FFmpeg...`);
  const outputPath = path.join('/tmp', `space_${spaceId}.m4a`);

  await downloadWithFFmpeg(hlsUrl, outputPath);

  // 7. 验证文件存在和大小
  if (!fs.existsSync(outputPath)) {
    throw new Error('Download failed - output file not found');
  }

  const stats = fs.statSync(outputPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`✓ Downloaded successfully: ${fileSizeMB} MB`);
  console.log(`✓ Saved to: ${outputPath}\n`);

  return {
    audioPath: outputPath,
    metadata: {
      title: space.metadata.title || 'Untitled Space',
      creator: space.metadata.creator_id,
      isAvailableForReplay: space.metadata.is_space_available_for_replay,
      mediaKey: mediaKey,
    }
  };
}
