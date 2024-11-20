const exec = require("node:child_process").exec;
// const ls = spawn("ls", ["-lh", "/usr"]);

const args = process.argv.slice(2);
if (args.length !== 2) throw new Error("Invalid arguments.");
const os = args[0];
const path = args[1];
if (os !== "nix") throw new Error("Invalid arguments.");

const osMap = new Map<string, string>();
osMap.set("nix", "sh nix/");

const osScriptExt = new Map<string, string>();
osScriptExt.set("nix", "sh");

const command = `${osMap.get(os)}${path}.${osScriptExt.get(os)}`;
console.log(command);

const ls = exec(command);

ls.stdout.on("data", (data: { toString: () => string; }) => {
	console.log(`${data.toString()}`);
});

ls.stderr.on("data", (data: { toString: () => string; }) => {
	console.log(`${data.toString()}`);
});

ls.on("exit", (code: { toString: () => string; }) => {
	console.log(`child process exited with code ${code.toString()}`);
});
