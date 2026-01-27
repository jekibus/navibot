import { Probot } from "probot";
import { setupProjectsHandler } from "./handlers/projectsHandler.js";
import { setupPullRequestHandler } from "./handlers/pullRequestHandler.js";
import { setupIssuesHandler } from "./handlers/issuesHandler.js";
import { setupBranchHandler } from "./handlers/branchHandler.js";

export default (app: Probot) => {
  // Setup projects board status change handler
  setupProjectsHandler(app);

  // Setup pull request merged/closed handler
  setupPullRequestHandler(app);

  // Setup issue opened/assigned and comments handler
  setupIssuesHandler(app);

  // Setup branch creation handler
  setupBranchHandler(app);
};
