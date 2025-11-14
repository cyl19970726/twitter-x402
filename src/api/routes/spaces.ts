/**
 * Spaces API Routes
 *
 * Free HTTP endpoints for dashboard data queries.
 * All routes require wallet signature authentication.
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { getUserSpaces, searchUserSpaces, getPopularSpaces, getSpaceBySpaceId } from '../../db/queries/spaces';
import { checkUserHasAccess, checkChatUnlocked } from '../../db/queries/payments';
import { getSpaceTranscript } from '../../utils/storageManager';

const spacesRouter = new Hono();

// Apply auth middleware to all routes
spacesRouter.use('/*', authMiddleware);

/**
 * GET /api/spaces/mine
 * List user's accessible Spaces (those they paid for)
 */
spacesRouter.get('/mine', async (c: any) => {
  const userId = c.get('userId') as number;
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  try {
    const spaces = await getUserSpaces(userId, limit, offset);

    return c.json({
      spaces: spaces.map(space => ({
        id: space.id,
        spaceId: space.spaceId,
        spaceUrl: space.spaceUrl,
        title: space.title,
        status: space.status,
        completedAt: space.completedAt,
        audioDuration: space.audioDurationSeconds,
        transcriptLength: space.transcriptLength,
        participants: space.participants ? JSON.parse(space.participants) : [],
      })),
      pagination: {
        limit,
        offset,
        hasMore: spaces.length === limit,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching user spaces:', error);
    return c.json(
      {
        error: 'Failed to fetch spaces',
        message: (error as Error).message,
      },
      500
    );
  }
});

/**
 * GET /api/spaces/search?q=query
 * Search within user's accessible Spaces
 */
spacesRouter.get('/search', async (c: any) => {
  const userId = c.get('userId') as number;
  const query = c.req.query('q');

  if (!query) {
    return c.json({ error: 'Missing search query parameter: q' }, 400);
  }

  try {
    const spaces = await searchUserSpaces(userId, query);

    return c.json({
      query,
      results: spaces.map(space => ({
        id: space.id,
        spaceId: space.spaceId,
        spaceUrl: space.spaceUrl,
        title: space.title,
        status: space.status,
        completedAt: space.completedAt,
        participants: space.participants ? JSON.parse(space.participants) : [],
      })),
      count: spaces.length,
    });
  } catch (error) {
    console.error('[API] Error searching spaces:', error);
    return c.json(
      {
        error: 'Search failed',
        message: (error as Error).message,
      },
      500
    );
  }
});

/**
 * GET /api/spaces/:spaceId
 * Get details for a specific Space
 */
spacesRouter.get('/:spaceId', async (c: any) => {
  const userId = c.get('userId') as number;
  const spaceId = c.req.param('spaceId');

  try {
    const space = await getSpaceBySpaceId(spaceId);

    if (!space) {
      return c.json({ error: 'Space not found' }, 404);
    }

    // Check if user has access
    const hasAccess = await checkUserHasAccess(userId, space.id);

    if (!hasAccess) {
      return c.json(
        {
          error: 'Access denied',
          message: 'You must purchase transcription to access this Space',
        },
        403
      );
    }

    // Check if chat is unlocked
    const chatUnlocked = await checkChatUnlocked(userId, space.id);

    return c.json({
      space: {
        id: space.id,
        spaceId: space.spaceId,
        spaceUrl: space.spaceUrl,
        title: space.title,
        status: space.status,
        completedAt: space.completedAt,
        audioDuration: space.audioDurationSeconds,
        transcriptLength: space.transcriptLength,
        participants: space.participants ? JSON.parse(space.participants) : [],
        speakerProfiles: space.speakerProfiles ? JSON.parse(space.speakerProfiles) : [],
        chatUnlocked,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching space details:', error);
    return c.json(
      {
        error: 'Failed to fetch space',
        message: (error as Error).message,
      },
      500
    );
  }
});

/**
 * GET /api/spaces/:spaceId/transcript
 * Get transcript content for a Space
 */
spacesRouter.get('/:spaceId/transcript', async (c: any) => {
  const userId = c.get('userId') as number;
  const spaceId = c.req.param('spaceId');

  try {
    const space = await getSpaceBySpaceId(spaceId);

    if (!space) {
      return c.json({ error: 'Space not found' }, 404);
    }

    // Check if user has access
    const hasAccess = await checkUserHasAccess(userId, space.id);

    if (!hasAccess) {
      return c.json(
        {
          error: 'Access denied',
          message: 'You must purchase transcription to access this Space',
        },
        403
      );
    }

    // Get transcript from storage
    const transcript = getSpaceTranscript(spaceId);

    if (!transcript) {
      return c.json({ error: 'Transcript not found' }, 404);
    }

    return c.json({
      spaceId,
      transcript,
      format: 'markdown',
    });
  } catch (error) {
    console.error('[API] Error fetching transcript:', error);
    return c.json(
      {
        error: 'Failed to fetch transcript',
        message: (error as Error).message,
      },
      500
    );
  }
});

/**
 * GET /api/spaces/:spaceId/chat-status
 * Check if chat is unlocked for a Space
 */
spacesRouter.get('/:spaceId/chat-status', async (c: any) => {
  const userId = c.get('userId') as number;
  const spaceId = c.req.param('spaceId');

  try {
    const space = await getSpaceBySpaceId(spaceId);

    if (!space) {
      return c.json({ error: 'Space not found' }, 404);
    }

    const hasAccess = await checkUserHasAccess(userId, space.id);
    const chatUnlocked = await checkChatUnlocked(userId, space.id);

    return c.json({
      spaceId,
      hasAccess,
      chatUnlocked,
      requiresUnlock: hasAccess && !chatUnlocked,
    });
  } catch (error) {
    console.error('[API] Error checking chat status:', error);
    return c.json(
      {
        error: 'Failed to check chat status',
        message: (error as Error).message,
      },
      500
    );
  }
});

/**
 * GET /api/spaces/popular
 * Get popular Spaces (public, no auth required)
 */
spacesRouter.get('/popular', async (c) => {
  const limit = parseInt(c.req.query('limit') || '10', 10);

  try {
    const spaces = await getPopularSpaces(limit);

    return c.json({
      spaces: spaces.map(space => ({
        id: space.id,
        spaceId: space.spaceId,
        spaceUrl: space.spaceUrl,
        title: space.title,
        transcriptionCount: space.transcriptionCount,
        chatUnlockCount: space.chatUnlockCount,
        participants: space.participants ? JSON.parse(space.participants) : [],
      })),
    });
  } catch (error) {
    console.error('[API] Error fetching popular spaces:', error);
    return c.json(
      {
        error: 'Failed to fetch popular spaces',
        message: (error as Error).message,
      },
      500
    );
  }
});

export default spacesRouter;
