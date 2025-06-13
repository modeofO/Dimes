import { service } from '@daydreamsai/core';
import { CppBackendClient } from '../../services/cppBackendClient.js';

export const cadService = service({
  name: 'cad',
  register(container) {
    container.singleton('cadClient', () => new CppBackendClient());
  },
  async boot(container) {
    const client = container.resolve('cadClient');
    if (await client.isAvailable()) {
      container.resolve('logger').info('CAD Service: C++ Backend is available.');
    } else {
      container.resolve('logger').error('CAD Service: C++ Backend is not available.');
      // Optionally, you might want to prevent the agent from starting if the backend is unavailable.
      // For now, we'll just log the error.
    }
  },
}); 