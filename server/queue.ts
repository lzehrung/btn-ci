export class Queue<T> {
  private array = new Array<T>();
  constructor(source: T[] = []) {
    this.array = source;
  }

  add(item: T) {
    this.array.unshift(item);
  }

  peek(): T | null {
    if (this.array.length > 0) {
      return this.array[this.array.length - 1];
    }
    return null;
  }

  removeItem(item: T): void {
    let index = this.array.indexOf(item);
    this.array.splice(index, 1);
  }

  remove(): T | undefined {
    return this.array.pop();
  }

  isQueued(findFunc: (item: T) => boolean): boolean {
    let filterResult = this.array.find(findFunc);
    return !!filterResult;
  }

  toArray(): Array<T> {
    return this.array;
  }
}
