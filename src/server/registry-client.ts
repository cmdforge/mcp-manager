import createClient from "openapi-fetch";
import type { paths } from "../shared/registry/api.js";

export const registryClient = createClient<paths>({
  baseUrl: 'https://registry.modelcontextprotocol.io',
});