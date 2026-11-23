import { createStorageClient } from "./_qoder/storage.mjs";
import { createHandler } from "./handler.ts";

Deno.serve(createHandler(createStorageClient()));
