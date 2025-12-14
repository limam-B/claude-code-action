#!/usr/bin/env bun

/**
 * Gitea Comment MCP Server
 * Provides github_comment__update_claude_comment tool for Gitea
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Hardcoded for Docker compatibility
const GITEA_API_URL = "http://host.docker.internal:3000/api/v1";
const API_TOKEN = process.env.API_TOKEN;
const COMMENT_ID = process.env.CLAUDE_COMMENT_ID;
const REPOSITORY = process.env.REPOSITORY; // format: "owner/repo"

if (!API_TOKEN) {
  throw new Error("API_TOKEN environment variable is required");
}

if (!COMMENT_ID) {
  throw new Error("CLAUDE_COMMENT_ID environment variable is required");
}

if (!REPOSITORY) {
  throw new Error("REPOSITORY environment variable is required");
}

const [owner, repo] = REPOSITORY.split("/");

const server = new Server(
  {
    name: "github_comment",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "update_claude_comment",
        description: "Update the Claude comment body with new content",
        inputSchema: {
          type: "object",
          properties: {
            body: {
              type: "string",
              description: "The new comment body content (markdown supported)",
            },
          },
          required: ["body"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.error(`[GitComment] Tool called: ${request.params.name}`);

  if (request.params.name !== "update_claude_comment") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const argsSchema = z.object({
    body: z.string(),
  });

  const args = argsSchema.parse(request.params.arguments);
  console.error(
    `[GitComment] Updating comment ${COMMENT_ID} with ${args.body.length} chars`,
  );

  try {
    const url = `${GITEA_API_URL}/repos/${owner}/${repo}/issues/comments/${COMMENT_ID}`;
    console.error(`[GitComment] API URL: ${url}`);

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `token ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: args.body,
      }),
    });

    console.error(`[GitComment] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GitComment] Error response: ${errorText}`);
      throw new Error(`Gitea API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.error(`[GitComment] Successfully updated comment`);

    return {
      content: [
        {
          type: "text",
          text: `Successfully updated comment ${COMMENT_ID}`,
        },
      ],
    };
  } catch (error: any) {
    console.error(`[GitComment] Exception: ${error.message}`);
    return {
      content: [
        {
          type: "text",
          text: `Error updating comment: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Gitea Comment MCP Server running on stdio");
  console.error(`  GITEA_API_URL: ${GITEA_API_URL}`);
  console.error(`  REPOSITORY: ${REPOSITORY}`);
  console.error(`  COMMENT_ID: ${COMMENT_ID}`);
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  console.error("Stack:", error.stack);
  // Try to write error to a debug file
  try {
    const fs = require("fs");
    fs.appendFileSync(
      "/tmp/gitea-comment-server-error.log",
      `${new Date().toISOString()} - Fatal error: ${error}\n${error.stack}\n\n`,
    );
  } catch (e) {
    // Ignore if we can't write
  }
  process.exit(1);
});
