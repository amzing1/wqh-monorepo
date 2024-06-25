export class HistoryStack<T> {
  cancelStack: T[] = [];
  redoStack: T[] = [];
  MAX_SIZE = 30;
  clearHistoryStack(type: 'both' | 'cancel' | 'redo') {
    if (['both', 'cancel'].includes(type)) {
      this.cancelStack = [];
    }
    if (['both', 'redo'].includes(type)) {
      this.redoStack = [];
    }
  }
  pushCancelStack(data: T) {
    if (this.cancelStack.length >= this.MAX_SIZE) {
      this.cancelStack.shift();
    }
    this.cancelStack.push(data);
  }
  popCancelStack() {
    return this.cancelStack.pop();
  }
  pushRedoStack(data: T) {
    this.redoStack.push(data);
  }
  popRedoStack() {
    return this.redoStack.pop();
  }
}
