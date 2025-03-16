import { readFile } from "node:fs/promises";
import { exec } from "node:child_process";

const args = process.argv.slice(2);
const filePath = args[0];

async function main() {
  // const file = Bun.file(filePath);
  // const text = await file.text();
  const text = await readFile(filePath, "utf-8");
  const lines = text.split("\n");
  for await (const line of lines) {
    if (!line) continue;
    console.log(line);
    const ls = exec(line);
    if (ls.stdout) {
      ls.stdout.on("data", (data: { toString: () => string }) => {
        console.log(`${data.toString()}`);
      });
    }
    if (ls.stderr) {
      ls.stderr.on("data", (data: { toString: () => string }) => {
        console.log(`${data.toString()}`);
      });
    }
    ls.on("exit", (code: { toString: () => string }) => {
      console.log(`child process exited with code ${code.toString()}`);
    });
  }
}

main();
