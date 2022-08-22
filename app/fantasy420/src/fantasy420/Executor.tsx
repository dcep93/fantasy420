class Executor {
  queue: null[];
  resolves: (() => void)[];
  constructor(num_executors: number) {
    this.queue = Array.from(new Array(num_executors)).map((_) => null);
    this.resolves = [];
  }

  execute<T>(f: () => Promise<T>): Promise<T> {
    return Promise.resolve()
      .then(() => this._get())
      .then(() => f())
      .then((t) => {
        this._put();
        return t;
      });
  }

  _get(): Promise<void> {
    const ticket = this.queue.pop();
    // known race condition - what if all of _put
    // gets executed between determining here and
    // pushing the new resolve
    // how do we fix it? do we need to?
    if (ticket === undefined) {
      return new Promise<void>((resolve, reject) => {
        this.resolves.push(resolve);
      }).then(() => this._get());
    } else {
      return Promise.resolve();
    }
  }

  _put() {
    this.queue.push(null);
    const resolve = this.resolves.shift();
    if (resolve) resolve();
  }
}

export default Executor;
