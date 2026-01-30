import { service } from "@daydreamsai/core";
import { CadBackendClient } from "../services/cadBackendClient.js";

export const cadBackendService = service({
  register(container) {
    container.singleton("cadBackend", () => new CadBackendClient());
  },
}); 