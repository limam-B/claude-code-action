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

const GITEA_API_URL =
  process.env.GITEA_API_URL || "http://localhost:3000/api/v1";
const GITEA_TOKEN = process.env.GITEA_TOKEN;
const COMMENT_ID = process.env.CLAUDE_COMMENT_ID;
const REPOSITORY = process.env.REPOSITORY; // format: "owner/repo"

if (!GITEA_TOKEN) {
  throw new Error("GITEA_TOKEN environment variable is required");
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
  if (request.params.name !== "update_claude_comment") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const argsSchema = z.object({
    body: z.string(),
  });

  const args = argsSchema.parse(request.params.arguments);

  try {
    const response = await fetch(
      `${GITEA_API_URL}/repos/${owner}/${repo}/issues/comments/${COMMENT_ID}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `token ${GITEA_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: args.body,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gitea API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    return {
      content: [
        {
          type: "text",
          text: `Successfully updated comment ${COMMENT_ID}`,
        },
      ],
    };
  } catch (error: any) {
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
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
