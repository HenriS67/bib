import { mkdir, readFile, writeFile } from "node:fs/promises";

const functionDirectory = ".vercel/output/functions/_qwik-city.func";
const outputConfigPath = ".vercel/output/config.json";

const outputConfig = JSON.parse(await readFile(outputConfigPath, "utf8"));
outputConfig.routes = outputConfig.routes.map((route) =>
  route.src === "/.*" ? { ...route, src: "/(.*)" } : route,
);
await writeFile(outputConfigPath, JSON.stringify(outputConfig, null, 2) + "\n");

await mkdir(functionDirectory, { recursive: true });
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