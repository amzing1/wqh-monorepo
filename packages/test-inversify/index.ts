import { Warrior } from './src/interfaces';
import { invContainer } from './src/inversify.config';
import { TYPES } from './src/types';

const ninja = invContainer.get<Warrior>(TYPES.Warrior);
console.log(ninja.fight());
console.log(ninja.sneak());
