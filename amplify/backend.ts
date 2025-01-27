import { defineBackend } from '@aws-amplify/backend';
import { myFirstFunction } from './my-first-function/resource';

export const backend = defineBackend({
  myFirstFunction
}); 