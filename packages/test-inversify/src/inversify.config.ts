import { Container } from 'inversify';
import 'reflect-metadata';
import { Katana, Ninja, Shuriken } from './entities';
import { ThrowableWerapon, Warrior, Weapon } from './interfaces';
import { TYPES } from './types';

const invContainer = new Container();
invContainer.bind<Warrior>(TYPES.Warrior).to(Ninja);
invContainer.bind<Weapon>(TYPES.Weapon).to(Katana);
invContainer.bind<ThrowableWerapon>(TYPES.ThrowableWeapon).to(Shuriken);

export { invContainer };
