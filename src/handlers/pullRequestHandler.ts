import { Probot, Context } from "probot";
import {
  extractIssueNumbers,
  extractIssueFromBranch,
  updateIssueStatusInProject,
} from "../utils/projectUtils.js";


// Handler for pull request closed
export function setupPullRequestHandler(app: Probot) {
  app.on("pull_request.closed", async (context: Context) => {
    try {
      const payload = context.payload as any;
      const pullRequest = payload.pull_request;

      // Only process if PR is merged
      if (!pullRequest.merged) {
        return;
      }

      // Get the base branch
      const baseBranch = pullRequest.base.ref;

      // Only process if PR is closed against main branch
      if (baseBranch.toLowerCase() !== "main") {
        console.log(
          `⏭️ PR is not closed against main branch (base: ${baseBranch})`,
        );
        return;
      }

      // Extract related issue numbers from PR title and body
      const titleAndBody = `${pullRequest.title} ${pullRequest.body || ""}`;
      const issueNumbers = extractIssueNumbers(titleAndBody);

      // Also try to extract from branch name
      const branchIssue = extractIssueFromBranch(pullRequest.head.ref);
      if (branchIssue && !issueNumbers.includes(branchIssue)) {
        issueNumbers.push(branchIssue);
      }

      if (issueNumbers.length === 0) {
        console.log(
          `⏭️ No related issues found in PR #${pullRequest.number}`,
        );
        return;
      }

      const owner = payload.repository.owner.login;
      const repo = payload.repository.name;

      // Update status for each related issue
      // This will trigger projects_v2_item.edited webhook, which will send Discord message
      for (const issueNumber of issueNumbers) {
        await updateIssueStatusInProject(
          context,
          owner,
          repo,
          issueNumber,
          "Done",
        );
      }
    } catch (error) {
      console.error("❌ Error processing pull request:", error);
    }
  });

  // Handler for pull request opened
  app.on("pull_request.opened", async (context: Context) => {
    try {
      const payload = context.payload as any;
      const pullRequest = payload.pull_request;

      // Get the base branch
      const baseBranch = pullRequest.base.ref;

      // Only process if PR is opened against dev branch
      if (baseBranch.toLowerCase() !== "dev") {
        console.log(
          `⏭️ PR is not opened against dev branch (base: ${baseBranch})`,
        );
        return;
      }

      // Extract related issue numbers from PR title and body
      const titleAndBody = `${pullRequest.title} ${pullRequest.body || ""}`;
      const issueNumbers = extractIssueNumbers(titleAndBody);

      // Also try to extract from branch name
      const branchIssue = extractIssueFromBranch(pullRequest.head.ref);
      if (branchIssue && !issueNumbers.includes(branchIssue)) {
        issueNumbers.push(branchIssue);
      }

      if (issueNumbers.length === 0) {
        console.log(
          `⏭️ No related issues found in PR #${pullRequest.number}`,
        );
        return;
      }

      const owner = payload.repository.owner.login;
      const repo = payload.repository.name;

      // Update status for each related issue to Review
      for (const issueNumber of issueNumbers) {
        await updateIssueStatusInProject(
          context,
          owner,
          repo,
          issueNumber,
          "Review",
        );
      }
    } catch (error) {
      console.error("❌ Error processing pull request:", error);
    }
  });
}
