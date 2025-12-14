import type { GitHubContext } from "../github/context";
import type { Octokits, GiteaClient } from "../github/api/client";
import type { Mode } from "../modes/types";

export type PrepareResult = {
  commentId?: number;
  branchInfo: {
    baseBranch: string;
    claudeBranch?: string;
    currentBranch: string;
  };
  mcpConfig: string;
};

export type PrepareOptions = {
  context: GitHubContext;
  octokit: Octokits;
  giteaClient: GiteaClient;
  mode: Mode;
  githubToken: string;
};
