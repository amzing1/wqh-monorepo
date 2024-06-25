type Fn = (...args: any[]) => any;
class EventEmitter {
  private events: Record<string, Fn[]> = {};
  on(eventName: string, callback: Fn) {
    if (!this.events[eventName]) {
      this.events[eventName] = [callback];
    } else {
      this.events[eventName].push(callback);
    }
  }

  emit(eventName: string, ...args: any[]) {
    this.events[eventName].forEach((fn) => fn.apply(this, args));
  }

  once(eventName: string, callback: Fn) {
    const fn = () => {
      callback();
      this.remove(eventName, fn);
    };
    this.on(eventName, fn);
  }

  remove(eventName: string, callback: Fn) {
    this.events[eventName] = this.events[eventName].filter(
      (fn) => fn != callback
    );
  }
}

export const eventEmitter = new EventEmitter();
