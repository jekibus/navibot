import { Probot } from "probot";
import { setupProjectsHandler } from "./handlers/projectsHandler.js";
import { setupPullRequestHandler } from "./handlers/pullRequestHandler.js";

export default (app: Probot) => {
  // Setup projects board status change handler
  setupProjectsHandler(app);

  // Setup pull request merged/closed handler
  setupPullRequestHandler(app);
};
