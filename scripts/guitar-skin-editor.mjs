import { readFile, rename, writeFile } from "node:fs/promises";
import { deleteGuitarSkinFromCatalog } from "../src/shooter/instruments/guitarSkinCatalog.js";
import { isTrustedLocalEditorRequest } from "./local-editor-request.mjs";

export const GUITAR_SKIN_DELETE_ENDPOINT = "/__rifflab/shooter-editor/guitar-skins/delete";

export default function guitarSkinEditorPlugin({ catalogPath = new URL("../src/shooter/instruments/deletedGuitarSkins.json", import.meta.url) } = {}) {
  let pendingWrite = Promise.resolve();
  return {
    name: "rifflab-guitar-skin-editor",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url !== GUITAR_SKIN_DELETE_ENDPOINT) return next();
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setHeader("Cache-Control", "no-store");
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.end(JSON.stringify({ ok: false, error: "POST required" }));
          return;
        }
        if (!isTrustedLocalEditorRequest(request)) {
          response.statusCode = 403;
          response.end(JSON.stringify({ ok: false, error: "Local editor access only" }));
          return;
        }
        try {
          let body = "";
          for await (const chunk of request) {
            body += chunk;
            if (body.length > 2048) throw new Error("Payload too large");
          }
          const { id } = JSON.parse(body);
          const save = pendingWrite.then(async () => {
            const current = JSON.parse(await readFile(catalogPath, "utf8"));
            const deletedIds = deleteGuitarSkinFromCatalog(current, id);
            const temporary = new URL(`${catalogPath.href}.tmp`);
            await writeFile(temporary, `${JSON.stringify(deletedIds, null, 2)}\n`, "utf8");
            await rename(temporary, catalogPath);
            return deletedIds;
          });
          pendingWrite = save.catch(() => {});
          const deletedIds = await save;
          response.end(JSON.stringify({ ok: true, deletedIds }));
        } catch (error) {
          response.statusCode = 400;
          response.end(JSON.stringify({ ok: false, error: error.message }));
        }
      });
    },
  };
}
