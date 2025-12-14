#!/usr/bin/env bun

/**
 * Test all Gitea API endpoints used by claude-code-action
 * Run this to validate all API calls work before testing the full workflow
 */

const GITEA_API_URL =
  process.env.GITEA_API_URL || "http://localhost:3000/api/v1";
const GITEA_TOKEN = process.env.GITEA_TOKEN || process.env.REPO_ACCESS_TOKEN;
const OWNER = "limam";
const REPO = "unity-simple-project";
const ISSUE_NUMBER = 5;

if (!GITEA_TOKEN) {
  console.error(
    "❌ GITEA_TOKEN or REPO_ACCESS_TOKEN environment variable required",
  );
  process.exit(1);
}

type TestResult = {
  name: string;
  endpoint: string;
  success: boolean;
  error?: string;
  data?: any;
};

const results: TestResult[] = [];

async function testEndpoint(
  name: string,
  endpoint: string,
  method = "GET",
  body?: any,
): Promise<TestResult> {
  try {
    const response = await fetch(`${GITEA_API_URL}${endpoint}`, {
      method,
      headers: {
        Authorization: `token ${GITEA_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        name,
        endpoint,
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      name,
      endpoint,
      success: true,
      data,
    };
  } catch (error: any) {
    return {
      name,
      endpoint,
      success: false,
      error: error.message,
    };
  }
}

async function runTests() {
  console.log("🧪 Testing Gitea API endpoints...\n");

  // Test 1: Get repository
  results.push(await testEndpoint("Get repository", `/repos/${OWNER}/${REPO}`));

  // Test 2: Get default branch
  const repoResult = results[results.length - 1];
  const defaultBranch = repoResult.data?.default_branch || "main";
  console.log(`   Default branch: ${defaultBranch}\n`);

  // Test 3: Get branch details
  results.push(
    await testEndpoint(
      "Get branch details",
      `/repos/${OWNER}/${REPO}/branches/${defaultBranch}`,
    ),
  );

  // Verify branch structure
  const branchResult = results[results.length - 1];
  if (branchResult.success) {
    console.log(`   Branch commit structure:`);
    console.log(`   - commit.id: ${branchResult.data?.commit?.id}`);
    console.log(`   - commit.sha: ${branchResult.data?.commit?.sha}`);
    console.log("");
  }

  // Test 4: Get issue
  results.push(
    await testEndpoint(
      "Get issue",
      `/repos/${OWNER}/${REPO}/issues/${ISSUE_NUMBER}`,
    ),
  );

  // Test 5: Get issue comments
  results.push(
    await testEndpoint(
      "Get issue comments",
      `/repos/${OWNER}/${REPO}/issues/${ISSUE_NUMBER}/comments`,
    ),
  );

  // Test 6: Get user info
  results.push(await testEndpoint("Get user info", `/users/${OWNER}`));

  // Test 7: Branch comparison (if branch exists)
  results.push(
    await testEndpoint(
      "Compare branches",
      `/repos/${OWNER}/${REPO}/compare/${defaultBranch}...${defaultBranch}`,
    ),
  );

  // Print results
  console.log("\n📊 Test Results:\n");

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    if (result.success) {
      console.log(`✅ ${result.name}`);
      console.log(`   ${result.endpoint}`);
      passed++;
    } else {
      console.log(`❌ ${result.name}`);
      console.log(`   ${result.endpoint}`);
      console.log(`   Error: ${result.error}`);
      failed++;
    }
    console.log("");
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(
    `Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`,
  );
  console.log(`${"=".repeat(50)}\n`);

  if (failed > 0) {
    console.error(
      "❌ Some tests failed. Fix these before running the full workflow.",
    );
    process.exit(1);
  } else {
    console.log("✅ All API endpoints working correctly!");
    console.log("   You can now test the full workflow.\n");
    process.exit(0);
  }
}

runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
