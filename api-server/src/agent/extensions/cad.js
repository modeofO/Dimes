import { extension } from '@daydreamsai/core';
import { cadService } from '../services/cad.js';
import { cadActions } from '../actions/cad.js';
import { cadContext } from '../contexts/cad.js';
import { geometryUpdateOutput } from '../outputs/cad.js';

export const cadExtension = extension({
  name: 'cad',
  services: [cadService],
  contexts: {
    cad: cadContext,
  },
  actions: cadActions,
  outputs: {
    geometry_update: geometryUpdateOutput,
  },
}); 