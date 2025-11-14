/**
 * Storage Manager for Twitter Spaces
 *
 * Manages persistent storage of:
 * - Downloaded audio files (filesystem)
 * - Transcribed text (filesystem)
 * - Space metadata (database)
 *
 * Storage structure:
 * data/
 *   database/
 *     spaces.db         (SQLite database)
 *   spaces/
 *     <space_id>/
 *       audio.m4a
 *       transcript.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { getSpaceBySpaceId, getSpaceById, getOrCreateSpace, saveSpaceResult } from '../db/queries/spaces';
import type { Space } from '../db/schema/spaces';

export interface SpeakerProfile {
  name: string;
  background?: string;
}

export interface SpaceMetadata {
  spaceId: string;
  spaceUrl: string;
  title: string;
  creator?: string;
  processedAt: string;          // ISO timestamp
  audioDuration?: number;        // seconds
  audioSizeMB?: number;
  transcriptLength: number;      // characters
  participants: string[];
  speakerProfiles: SpeakerProfile[];
}

export interface SpaceData {
  metadata: SpaceMetadata;
  transcript: string;            // Markdown formatted
  transcriptJson: {              // Structured data
    participants: string[];
    speakerProfiles: SpeakerProfile[];
    formattedText: string;
  };
}

/**
 * Get storage root directory from environment or use default
 */
function getStorageRoot(): string {
  const root = process.env.STORAGE_ROOT || path.join(process.cwd(), 'data');

  // Ensure storage root exists
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }

  const spacesDir = path.join(root, 'spaces');
  if (!fs.existsSync(spacesDir)) {
    fs.mkdirSync(spacesDir, { recursive: true });
  }

  return root;
}

/**
 * Get directory path for a specific Space
 */
function getSpaceDir(spaceId: string): string {
  return path.join(getStorageRoot(), 'spaces', spaceId);
}

/**
 * Extract Space ID from URL or return as-is if already an ID
 * Supports:
 * - https://x.com/i/spaces/1vOGwAbcdEFGH
 * - https://twitter.com/i/spaces/1vOGwAbcdEFGH
 * - 1vOGwAbcdEFGH
 */
export function extractSpaceId(urlOrId: string): string {
  const match = urlOrId.match(/spaces\/([a-zA-Z0-9]+)/);
  return match ? match[1] : urlOrId;
}

/**
 * Check if a Space has already been processed
 */
export async function checkSpaceExists(spaceId: string): Promise<boolean> {
  const space = await getSpaceBySpaceId(spaceId);
  return space !== undefined && space.status === 'completed';
}

/**
 * Get Space metadata
 */
export async function getSpaceMetadata(spaceId: string): Promise<SpaceMetadata | null> {
  const space = await getSpaceBySpaceId(spaceId);

  if (!space) {
    return null;
  }

  // Map database Space to SpaceMetadata
  const participants: string[] = space.participants ? JSON.parse(space.participants) : [];
  const speakerProfiles: SpeakerProfile[] = space.speakerProfiles ? JSON.parse(space.speakerProfiles) : [];

  return {
    spaceId: space.spaceId,
    spaceUrl: space.spaceUrl,
    title: space.title,
    creator: undefined, // TODO: Add creator to database schema if needed
    processedAt: space.completedAt?.toISOString() || new Date().toISOString(),
    audioDuration: space.audioDurationSeconds || undefined,
    audioSizeMB: space.audioSizeMb || undefined,
    transcriptLength: space.transcriptLength || 0,
    participants,
    speakerProfiles,
  };
}

/**
 * Get Space transcript (Markdown format)
 */
export function getSpaceTranscript(spaceId: string): string | null {
  const spaceDir = getSpaceDir(spaceId);
  const transcriptPath = path.join(spaceDir, 'transcript.md');

  if (!fs.existsSync(transcriptPath)) {
    return null;
  }

  try {
    return fs.readFileSync(transcriptPath, 'utf-8');
  } catch (error) {
    console.error(`Failed to read transcript for ${spaceId}:`, error);
    return null;
  }
}

/**
 * Get Space structured data
 */
export async function getSpaceData(spaceId: string): Promise<SpaceData | null> {
  const metadata = await getSpaceMetadata(spaceId);
  const transcript = getSpaceTranscript(spaceId);

  if (!metadata || !transcript) {
    return null;
  }

  // Build transcriptJson from metadata (no longer stored as separate file)
  const transcriptJson = {
    participants: metadata.participants,
    speakerProfiles: metadata.speakerProfiles,
    formattedText: transcript
  };

  return {
    metadata,
    transcript,
    transcriptJson
  };
}

/**
 * Get path to stored audio file
 */
export function getAudioPath(spaceId: string): string | null {
  const spaceDir = getSpaceDir(spaceId);
  const audioPath = path.join(spaceDir, 'audio.m4a');

  return fs.existsSync(audioPath) ? audioPath : null;
}

/**
 * Save Space data to storage (database + filesystem)
 */
export async function saveSpace(
  spaceId: string,
  spaceUrl: string,
  data: {
    title: string;
    creator?: string;
    audioDuration?: number;
    audioPath?: string;          // Path to audio file to copy
    transcript: string;           // Markdown
    transcriptJson: {
      participants: string[];
      speakerProfiles: SpeakerProfile[];
      formattedText: string;
    };
  }
): Promise<void> {
  const spaceDir = getSpaceDir(spaceId);

  // Create directory if it doesn't exist
  if (!fs.existsSync(spaceDir)) {
    fs.mkdirSync(spaceDir, { recursive: true });
  }

  // Copy audio file if provided
  let audioSizeMB: number | undefined;
  let audioFilePath: string | undefined;
  if (data.audioPath && fs.existsSync(data.audioPath)) {
    const destPath = path.join(spaceDir, 'audio.m4a');
    fs.copyFileSync(data.audioPath, destPath);

    const stats = fs.statSync(destPath);
    audioSizeMB = parseFloat((stats.size / (1024 * 1024)).toFixed(2));
    audioFilePath = destPath;
  }

  // Save transcript (Markdown)
  const transcriptPath = path.join(spaceDir, 'transcript.md');
  fs.writeFileSync(transcriptPath, data.transcript, 'utf-8');

  // Get or create Space in database
  const space = await getOrCreateSpace(spaceId, spaceUrl, data.title);

  // Save metadata to database
  await saveSpaceResult(space.id, {
    audioFilePath,
    transcriptFilePath: transcriptPath,
    audioDurationSeconds: data.audioDuration,
    audioSizeMb: audioSizeMB,
    transcriptLength: data.transcript.length,
    participants: JSON.stringify(data.transcriptJson.participants),
    speakerProfiles: JSON.stringify(data.transcriptJson.speakerProfiles),
  });

  console.log(`✓ Space ${spaceId} saved to database and filesystem`);
}

/**
 * List all processed Spaces
 * Note: For production, use getUserSpaces() to list user-specific spaces
 */
export async function listAllSpaces(): Promise<SpaceMetadata[]> {
  // For now, this returns all completed spaces from database
  // In production, this should be limited by user permissions
  const { db } = await import('../db/client');
  const { spaces } = await import('../db/schema/spaces');
  const { eq } = await import('drizzle-orm');

  const allSpaces = await db.query.spaces.findMany({
    where: eq(spaces.status, 'completed'),
    orderBy: (spaces, { desc }) => [desc(spaces.completedAt)],
  });

  const metadataList: SpaceMetadata[] = [];
  for (const space of allSpaces) {
    const participants: string[] = space.participants ? JSON.parse(space.participants) : [];
    const speakerProfiles: SpeakerProfile[] = space.speakerProfiles ? JSON.parse(space.speakerProfiles) : [];

    metadataList.push({
      spaceId: space.spaceId,
      spaceUrl: space.spaceUrl,
      title: space.title,
      processedAt: space.completedAt?.toISOString() || new Date().toISOString(),
      audioDuration: space.audioDurationSeconds || undefined,
      audioSizeMB: space.audioSizeMb || undefined,
      transcriptLength: space.transcriptLength || 0,
      participants,
      speakerProfiles,
    });
  }

  return metadataList;
}

/**
 * Search Spaces by ID, URL, title, or participant name
 */
export async function searchSpaces(query: string): Promise<SpaceMetadata[]> {
  const { db } = await import('../db/client');
  const { spaces } = await import('../db/schema/spaces');
  const { eq, and, or, like } = await import('drizzle-orm');

  const normalizedQuery = query.toLowerCase();
  const querySpaceId = extractSpaceId(query);

  // Search database for matching spaces
  const matchedSpaces = await db.query.spaces.findMany({
    where: and(
      eq(spaces.status, 'completed'),
      or(
        like(spaces.spaceId, `%${normalizedQuery}%`),
        like(spaces.title, `%${normalizedQuery}%`),
        like(spaces.participants, `%${normalizedQuery}%`),
      )
    ),
    orderBy: (spaces, { desc }) => [desc(spaces.completedAt)],
  });

  const metadataList: SpaceMetadata[] = [];
  for (const space of matchedSpaces) {
    const participants: string[] = space.participants ? JSON.parse(space.participants) : [];
    const speakerProfiles: SpeakerProfile[] = space.speakerProfiles ? JSON.parse(space.speakerProfiles) : [];

    metadataList.push({
      spaceId: space.spaceId,
      spaceUrl: space.spaceUrl,
      title: space.title,
      processedAt: space.completedAt?.toISOString() || new Date().toISOString(),
      audioDuration: space.audioDurationSeconds || undefined,
      audioSizeMB: space.audioSizeMb || undefined,
      transcriptLength: space.transcriptLength || 0,
      participants,
      speakerProfiles,
    });
  }

  return metadataList;
}

/**
 * Delete a Space from storage (database + filesystem)
 */
export async function deleteSpace(spaceId: string): Promise<boolean> {
  const spaceDir = getSpaceDir(spaceId);

  try {
    // Delete from database first
    const space = await getSpaceBySpaceId(spaceId);
    if (space) {
      const { db } = await import('../db/client');
      const { spaces } = await import('../db/schema/spaces');
      const { eq } = await import('drizzle-orm');

      await db.delete(spaces).where(eq(spaces.id, space.id));
    }

    // Delete filesystem data if exists
    if (fs.existsSync(spaceDir)) {
      fs.rmSync(spaceDir, { recursive: true, force: true });
    }

    console.log(`✓ Space ${spaceId} deleted from database and filesystem`);
    return true;
  } catch (error) {
    console.error(`Failed to delete Space ${spaceId}:`, error);
    return false;
  }
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  totalSpaces: number;
  totalSizeMB: number;
  oldestSpace?: SpaceMetadata;
  newestSpace?: SpaceMetadata;
}> {
  const spaces = await listAllSpaces();

  let totalSizeMB = 0;
  for (const space of spaces) {
    if (space.audioSizeMB) {
      totalSizeMB += space.audioSizeMB;
    }
  }

  return {
    totalSpaces: spaces.length,
    totalSizeMB: parseFloat(totalSizeMB.toFixed(2)),
    oldestSpace: spaces[spaces.length - 1],
    newestSpace: spaces[0]
  };
}
