// Gitea API configuration
// Hardcoded for Docker compatibility - host.docker.internal works both in Docker and host
export const GITEA_API_URL = "http://host.docker.internal:3000/api/v1";
export const GITEA_SERVER_URL = "http://host.docker.internal:3000";

// Legacy GitHub constants (kept for gradual migration)
export const GITHUB_API_URL = GITEA_API_URL;
export const GITHUB_SERVER_URL = GITEA_SERVER_URL;
