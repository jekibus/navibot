import { Probot, Context } from "probot";
import {
  extractIssueFromBranch,
  updateIssueStatusInProject,
} from "../utils/projectUtils.js";

// Handler for branch creation
export function setupBranchHandler(app: Probot) {
  app.on("create", async (context: Context) => {
    try {
      const payload = context.payload as any;

      // Only process branch creation (not tag creation)
      if (payload.ref_type !== "branch") {
        return;
      }

      const branchName = payload.ref;
      const owner = payload.repository.owner.login;
      const repo = payload.repository.name;

      // Extract issue number from branch name
      const issueNumber = extractIssueFromBranch(branchName);

      if (!issueNumber) {
        console.log(
          `⏭️ No issue number found in branch name: ${branchName}`,
        );
        return;
      }

      console.log(
        `📦 New branch created: ${branchName} (Issue #${issueNumber})`,
      );

      // Update status for the related issue to WIP
      await updateIssueStatusInProject(
        context,
        owner,
        repo,
        issueNumber,
        "WIP",
      );
    } catch (error) {
      console.error("❌ Error processing branch creation:", error);
    }
  });
}
