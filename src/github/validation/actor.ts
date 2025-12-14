#!/usr/bin/env bun

/**
 * Check if the action trigger is from a human actor
 *
 * SIMPLIFIED FOR GITEA: In a local single-user setup, we don't need
 * to validate whether the actor is human or bot.
 */

import type { ParsedGitHubContext } from "../context";

export async function checkHumanActor(
  githubContext: ParsedGitHubContext,
) {
  console.log(`Gitea mode: Skipping human actor check for: ${githubContext.actor}`);
  console.log(`Single-user local setup - all actors allowed`);

  // In Gitea local setup, skip validation
  return;
}
