#!/usr/bin/env node
/**
 * Generates the development-gateway credentials for .env.local / the server.
 *
 *   pnpm gate:hash
 *
 * Prompts for a new password (hidden), then prints ready-to-paste lines:
 *   ADMIN_GATE_PASSWORD_HASH=<base64 bcrypt hash>
 *   ADMIN_GATE_SECRET=<new random secret>
 *
 * The hash is printed base64-encoded because Next.js expands `$NAME` inside
 * .env files, which would corrupt a raw bcrypt hash ($2b$12$...).
 * Changing ADMIN_GATE_SECRET signs everyone out of the gateway once.
 */
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const COST = 12;
const MIN_LENGTH = 12;

function readHidden(question) {
  const { stdin, stdout } = process;

  if (!stdin.isTTY) {
    // Piped input: read the first line.
    return new Promise((resolve) => {
      let data = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (chunk) => (data += chunk));
      stdin.on("end", () => resolve(data.split(/\r?\n/)[0] ?? ""));
    });
  }

  stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  return new Promise((resolve) => {
    let value = "";

    function done() {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      stdout.write("\n");
      resolve(value);
    }

    function onData(chunk) {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") return done();
        if (char === "\u0003") {
          stdout.write("\n");
          process.exit(130);
        }
        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += char;
      }
    }

    stdin.on("data", onData);
  });
}

const password = await readHidden("New gateway password: ");

if (password.length < MIN_LENGTH) {
  console.error(`Password must be at least ${MIN_LENGTH} characters.`);
  process.exit(1);
}

if (process.stdin.isTTY) {
  const confirmation = await readHidden("Repeat password: ");

  if (confirmation !== password) {
    console.error("Passwords do not match.");
    process.exit(1);
  }
}

const hash = await bcrypt.hash(password, COST);
const encoded = Buffer.from(hash, "utf8").toString("base64");
const secret = randomBytes(32).toString("hex");

console.log(`
Paste these into app/web/.env.local on your computer and into the server's
environment file (see DEPLOYMENT.md), along with ADMIN_GATE_USERNAME:

ADMIN_GATE_PASSWORD_HASH=${encoded}
ADMIN_GATE_SECRET=${secret}
`);
