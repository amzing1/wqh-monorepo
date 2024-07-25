import { inject, injectable } from 'inversify';
import { ThrowableWerapon, Warrior, Weapon } from './interfaces';
import { TYPES } from './types';

@injectable()
class Katana implements Weapon {
  public hit() {
    return 'cut!';
  }
}

@injectable()
class Shuriken implements ThrowableWerapon {
  public throw() {
    return 'hit';
  }
}

@injectable()
class Ninja implements Warrior {
  private _katana: Weapon;
  private _shuriken: Shuriken;

  constructor(
    @inject(TYPES.Weapon) katana: Weapon,
    @inject(TYPES.ThrowableWeapon) shuriken: ThrowableWerapon
  ) {
    this._katana = katana;
    this._shuriken = shuriken;
  }

  public fight() {
    return this._katana.hit();
  }
  public sneak(): string {
    return this._shuriken.throw();
  }
}

export { Katana, Ninja, Shuriken };
