import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";

const functionDirectory = ".vercel/output/functions/_qwik-city.func";
const outputConfigPath = ".vercel/output/config.json";
const staticDirectory = ".vercel/output/static";

let outputConfig;
try {
  outputConfig = JSON.parse(await readFile(outputConfigPath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  outputConfig = {
    version: 3,
    routes: [
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/_qwik-city" },
    ],
  };
}

outputConfig.routes = outputConfig.routes.map((route) =>
  route.src === "/.*" ? { ...route, src: "/(.*)" } : route,
);
await writeFile(outputConfigPath, JSON.stringify(outputConfig, null, 2) + "\n");

await mkdir(functionDirectory, { recursive: true });
await mkdir(staticDirectory, { recursive: true });
for (const entry of await readdir("public", { withFileTypes: true })) {
  if (entry.isFile()) {
    await copyFile(`public/${entry.name}`, `${staticDirectory}/${entry.name}`);
  }
}
await writeFile(
  `${functionDirectory}/.vc-config.json`,
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "entry.vercel.js",
      launcherType: "Nodejs",
    },
    null,
    2,
  ) + "\n",
);