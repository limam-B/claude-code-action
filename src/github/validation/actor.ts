#!/usr/bin/env bun

/**
 * Check if the action trigger is from a human actor
 *
 * SIMPLIFIED FOR GITEA: In a local single-user setup, we don't need
 * to validate whether the actor is human or bot.
 */

import type { ParsedGitHubContext } from "../context";

export async function checkHumanActor(githubContext: ParsedGitHubContext) {
  const actor = githubContext.actor;
  const botName = process.env.BOT_NAME || "claude";
  const botId = process.env.BOT_ID;

  console.log(
    `Checking actor: ${actor} (ID: ${githubContext.actorId || "unknown"})`,
  );

  // Block the claude bot from triggering itself
  if (actor === botName) {
    throw new Error(
      `Skipping action: triggered by bot user @${botName}. This prevents infinite loops.`,
    );
  }

  // Also check by bot ID if available
  if (
    botId &&
    githubContext.actorId &&
    String(githubContext.actorId) === String(botId)
  ) {
    throw new Error(
      `Skipping action: triggered by bot user ID ${botId}. This prevents infinite loops.`,
    );
  }

  console.log(`Actor ${actor} is not a bot - allowing action to proceed`);
  return;
}
