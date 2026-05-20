/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ContentEntry {
  id: string;
  imageUrl: string;
  timestamp: number;
  dateKey: string; // e.g., "2026-05-08"
  location: string;
  prompt: string;
  isExample?: boolean;
  likes?: number;
  dislikes?: number;
  model?: string;
  description?: string;
}
