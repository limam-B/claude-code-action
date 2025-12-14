#!/usr/bin/env bun

import * as core from "@actions/core";

/**
 * Sets up Gitea authentication token from environment variable.
 * For local Gitea instances with full control, we use a simple personal access token.
 *
 * @returns The Gitea token for API authentication
 */
export async function setupGiteaToken(): Promise<string> {
  try {
    // Check for Gitea token from environment
    const token = process.env.API_TOKEN;

    if (!token) {
      throw new Error(
        "API_TOKEN environment variable is required. " +
          "Please provide a Gitea personal access token via the `api_token` input in your workflow.",
      );
    }

    console.log("Using API_TOKEN for authentication");
    core.setOutput("API_TOKEN", token);
    return token;
  } catch (error) {
    core.setFailed(
      `Failed to setup Gitea token: ${error}\n\n` +
        `Please provide a valid Gitea personal access token via the \`api_token\` input in your workflow.`,
    );
    process.exit(1);
  }
}
