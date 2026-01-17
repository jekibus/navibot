// You can import your modules
// import index from '../src/index'

import nock from "nock";
// Requiring our app implementation
import myProbotApp from "../src/index.js";
import { Probot, ProbotOctokit } from "probot";
// Requiring our fixtures
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, beforeEach, afterEach, test, expect } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const privateKey = fs.readFileSync(
  path.join(__dirname, "fixtures/mock-cert.pem"),
  "utf-8",
);

const projectsV2ItemPayload = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "fixtures/projects-v2-item.edited.json"),
    "utf-8",
  ),
);

describe("My Probot app", () => {
  let probot: any;

  beforeEach(() => {
    nock.disableNetConnect();
    probot = new Probot({
      appId: 123,
      privateKey,
      // disable request throttling and retries for testing
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false },
      }),
    });
    // Load our app into probot
    probot.load(myProbotApp);
  });

  test("logs when projects_v2_item.edited event is received", async () => {
    const consoleSpy = console.log;
    const logs: string[] = [];

    // Capture console.log calls
    console.log = (...args: any[]) => {
      logs.push(args.join(" "));
    };

    // Receive a webhook event
    await probot.receive({ name: "projects_v2_item", payload: projectsV2ItemPayload });

    // Restore console.log
    console.log = consoleSpy;

    // Verify that logs were created with the webhook content
    expect(logs.some((log) => log.includes("Received projects_v2_item.edited"))).toBe(true);
    expect(logs.some((log) => log.includes("Status field detected"))).toBe(true);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about using TypeScript in your tests, Jest recommends:
// https://github.com/kulshekhar/ts-jest

// For more information about testing with Nock see:
// https://github.com/nock/nock
