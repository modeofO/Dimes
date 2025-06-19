import { service } from "@daydreamsai/core";
import { CppBackendClient } from "../services/cppBackendClient.js";

export const cppBackendService = service({
  register(container) {
    container.singleton("cppBackend", () => new CppBackendClient());
  },
}); 