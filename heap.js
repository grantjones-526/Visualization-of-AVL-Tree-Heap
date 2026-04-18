class BinaryHeap {
  constructor(type = 'max') {
    this.data = [];
    this.type = type; // 'max' or 'min'
    this.lastSwaps = [];
  }

  compare(a, b) {
    return this.type === 'max' ? a > b : a < b;
  }

  parent(i) { return Math.floor((i - 1) / 2); }
  left(i)   { return 2 * i + 1; }
  right(i)  { return 2 * i + 2; }

  swap(i, j) {
    this.lastSwaps.push([i, j]);
    [this.data[i], this.data[j]] = [this.data[j], this.data[i]];
  }

  // Returns final resting index of the element that started at i
  _bubbleUp(i) {
    while (i > 0) {
      const p = this.parent(i);
      if (this.compare(this.data[i], this.data[p])) {
        this.swap(i, p);
        i = p;
      } else break;
    }
    return i;
  }

  _siftDown(i) {
    const n = this.data.length;
    while (true) {
      let target = i;
      const l = this.left(i);
      const r = this.right(i);
      if (l < n && this.compare(this.data[l], this.data[target])) target = l;
      if (r < n && this.compare(this.data[r], this.data[target])) target = r;
      if (target === i) break;
      this.swap(i, target);
      i = target;
    }
  }

  // Insert by value
  insert(value) {
    this.lastSwaps = [];
    this.data.push(value);
    this._bubbleUp(this.data.length - 1);
    return this.lastSwaps.slice();
  }

  // Delete by index (vertex reference in an array-backed heap).
  // The caller must provide the index of an existing element — no key search performed.
  deleteAt(index) {
    if (index < 0 || index >= this.data.length) return null;
    this.lastSwaps = [];
    const deletedValue = this.data[index];

    const last = this.data.pop();

    if (index < this.data.length) {
      this.data[index] = last;
      // The replacement element may violate heap order in either direction
      const afterBubble = this._bubbleUp(index);
      this._siftDown(afterBubble);
    }

    return { value: deletedValue, swaps: this.lastSwaps.slice() };
  }

  extractRoot() {
    if (this.data.length === 0) return null;
    return this.deleteAt(0);
  }

  clear() {
    this.data = [];
    this.lastSwaps = [];
  }

  setType(type) {
    this.type = type;
    const values = [...this.data];
    this.data = [];
    values.forEach(v => this.insert(v));
  }

  toD3() {
    if (this.data.length === 0) return null;

    const buildNode = (i) => {
      if (i >= this.data.length) return null;
      const node = { name: String(this.data[i]), index: i, children: [] };
      const l = this.left(i);
      const r = this.right(i);
      if (l < this.data.length) node.children.push(buildNode(l));
      if (r < this.data.length) node.children.push(buildNode(r));
      return node;
    };

    return buildNode(0);
  }
}
