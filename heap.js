/**
 * BinaryHeap
 * An array-backed binary heap that supports both max-heap and min-heap ordering.
 *
 * In a max-heap the largest value is always at index 0 (the root).
 * In a min-heap the smallest value is at index 0.
 *
 * The parent-child relationship in the array is:
 *   parent of i  → Math.floor((i - 1) / 2)
 *   left child   → 2 * i + 1
 *   right child  → 2 * i + 2
 *
 * The heap property is maintained after every insert (via bubble-up)
 * and after every delete (via sift-down).
 */
class BinaryHeap {
  /**
   * 'max' for a max-heap, 'min' for a min-heap. Defaults to 'max'.
   */
  constructor(type) {
    if (type === undefined) {
      type = 'max';
    }
    this.data = [];
    this.type = type;
    this.lastSwaps = [];
  }

  /**
   * Returns true if value a should be closer to the root than value b.
   * In a max-heap that means a > b; in a min-heap it means a < b.
   */
  compare(a, b) {
    if (this.type === 'max') {
      return a > b;
    }
    return a < b;
  }

  /**
   * Returns the array index of the parent of the element at index i.

   */
  parent(i) {
    return Math.floor((i - 1) / 2);
  }

  /**
   * Returns the array index of the left child of the element at index i.
   */
  left(i) {
    return 2 * i + 1;
  }

  /**
   * Returns the array index of the right child of the element at index i.
   */
  right(i) {
    return 2 * i + 2;
  }

  /**
   * Swaps the elements at indices i and j in the data array,
   * and records the swap pair for animation purposes.
   */
  swap(i, j) {
    this.lastSwaps.push([i, j]);

    // Store i's value temporarily so it is not overwritten during the swap
    const temp = this.data[i];
    this.data[i] = this.data[j];
    this.data[j] = temp;
  }

  /**
   * Moves the element at index i upward through the array until the heap
   * property is satisfied between i and its parent.
   * Called after a new element is appended to the end of the array.
   */
  _bubbleUp(i) {
    while (i > 0) {
      const p = this.parent(i);

      if (this.compare(this.data[i], this.data[p])) {
        // Current element outranks its parent — swap them and continue upward
        this.swap(i, p);
        i = p;
      } else {
        // Heap property is satisfied — stop moving up
        break;
      }
    }
    return i;
  }

  /**
   * Moves the element at index i downward through the array until the heap
   * property is satisfied between i and both of its children.
   * At each step the element swaps with whichever child should be closer to the root.
   */
  _siftDown(i) {
    const n = this.data.length;

    while (true) {
      // Assume the current position is already the correct one
      let target = i;
      const l = this.left(i);
      const r = this.right(i);

      // Check whether the left child should be closer to the root than the current target
      if (l < n && this.compare(this.data[l], this.data[target])) {
        target = l;
      }

      // Check whether the right child should be closer to the root than the current target
      if (r < n && this.compare(this.data[r], this.data[target])) {
        target = r;
      }

      // If neither child outranks the current position, the heap property is satisfied
      if (target === i) {
        break;
      }

      this.swap(i, target);
      i = target;
    }
  }

  /**
   * Inserts a new value into the heap.
   * The value is appended to the end of the array, then bubbled up to its correct position.
   */
  insert(value) {
    this.lastSwaps = [];
    this.data.push(value);
    this._bubbleUp(this.data.length - 1);
    return this.lastSwaps.slice();
  }

  /**
   * Deletes the element at a specific array index.
   *
   * Strategy:
   *   1. Record the value being deleted.
   *   2. Remove the last element from the array.
   *   3. Place that last element into the vacated slot.
   *   4. Restore heap order by first trying to bubble the replacement up,
   *      then sifting it down from wherever it lands.
   *      (Only one direction will actually move the element; the other is a no-op.)
   */
  deleteAt(index) {
    if (index < 0 || index >= this.data.length) {
      return null;
    }

    this.lastSwaps = [];
    const deletedValue = this.data[index];

    // Pop the last element off the end of the array
    const last = this.data.pop();

    if (index < this.data.length) {
      // Place the last element into the slot left by the deleted element
      this.data[index] = last;

      // The replacement may be too large (needs to go up) or too small (needs to go down)
      const afterBubble = this._bubbleUp(index);
      this._siftDown(afterBubble);
    }

    return { value: deletedValue, swaps: this.lastSwaps.slice() };
  }

  /**
   * Removes and returns the root element (the maximum or minimum value).
   * Delegates to deleteAt(0).
   */
  extractRoot() {
    if (this.data.length === 0) {
      return null;
    }
    return this.deleteAt(0);
  }

  /**
   * Removes all elements from the heap and clears the swap log.
   */
  clear() {
    this.data = [];
    this.lastSwaps = [];
  }

  /**
   * Switches the heap between 'max' and 'min' ordering, then rebuilds the heap
   * by reinserting all existing values under the new comparison rule.
   */
  setType(type) {
    this.type = type;

    // Copy all current values into a temporary array before clearing the heap
    const values = [];
    for (let i = 0; i < this.data.length; i++) {
      values.push(this.data[i]);
    }

    this.data = [];

    // Reinsert each value so the heap is rebuilt under the new ordering rule
    for (let i = 0; i < values.length; i++) {
      this.insert(values[i]);
    }
  }

  /**
   * Converts the heap array to a nested object structure compatible with D3's hierarchy layout.
   */
  toD3() {
    if (this.data.length === 0) {
      return null;
    }

    /**
     * Recursively builds a D3 node object for the element at array index i.
     */
    function buildNode(heap, i) {
      if (i >= heap.data.length) {
        return null;
      }

      const node = {
        name: String(heap.data[i]),
        index: i,
        children: []
      };

      const l = heap.left(i);
      const r = heap.right(i);

      if (l < heap.data.length) {
        node.children.push(buildNode(heap, l));
      }
      if (r < heap.data.length) {
        node.children.push(buildNode(heap, r));
      }

      return node;
    }

    return buildNode(this, 0);
  }
}
