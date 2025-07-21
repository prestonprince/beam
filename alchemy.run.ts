import alchemy from "alchemy";
import { Vite, Worker } from "alchemy/cloudflare";

const app = await alchemy("beam", {
  password: process.env.SECRET_PASSPHRASE,
});

export const api = await Worker("beam-api", {
  adopt: true,
  url: false,
  name: "beam-api",
  entrypoint: "./worker/api/index.ts",
  domains: ["api.beamsync.app"],
});

const site = await Vite("beam-site", {
  adopt: true,
  url: false,
  name: "beam-site",
  command: "bun run build",
  main: "./worker/web/index.ts",
  assets: {
    not_found_handling: "single-page-application",
  },
  domains: ["beamsync.app"],
});

if (api.domains) {
  console.log(
    "api domains: ",
    api.domains?.map((d) => d.name),
  );
}
if (site.domains) {
  console.log(
    "site domains: ",
    site.domains?.map((d) => d.name),
  );
}

await app.finalize();
