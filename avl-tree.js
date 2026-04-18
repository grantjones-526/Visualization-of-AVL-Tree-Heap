class AVLNode {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
    this.height = 1;
  }
}

class AVLTree {
  constructor() {
    this.root = null;
    this.lastRotations = [];
  }

  height(node) {
    return node ? node.height : 0;
  }

  balanceFactor(node) {
    return node ? this.height(node.left) - this.height(node.right) : 0;
  }

  updateHeight(node) {
    node.height = 1 + Math.max(this.height(node.left), this.height(node.right));
  }

  rotateRight(y) {
    const x = y.left;
    const T2 = x.right;
    x.right = y;
    y.left = T2;
    this.updateHeight(y);
    this.updateHeight(x);
    this.lastRotations.push({ type: 'Right', pivot: x.value, around: y.value });
    return x;
  }

  rotateLeft(x) {
    const y = x.right;
    const T2 = y.left;
    y.left = x;
    x.right = T2;
    this.updateHeight(x);
    this.updateHeight(y);
    this.lastRotations.push({ type: 'Left', pivot: y.value, around: x.value });
    return y;
  }

  balance(node) {
    this.updateHeight(node);
    const bf = this.balanceFactor(node);

    if (bf > 1) {
      if (this.balanceFactor(node.left) < 0) {
        node.left = this.rotateLeft(node.left);  // Left-Right
      }
      return this.rotateRight(node);
    }
    if (bf < -1) {
      if (this.balanceFactor(node.right) > 0) {
        node.right = this.rotateRight(node.right);  // Right-Left
      }
      return this.rotateLeft(node);
    }
    return node;
  }

  // Insert by value — returns the new node reference so the caller can store it
  _insert(node, value) {
    if (!node) return new AVLNode(value);
    if (value < node.value) node.left = this._insert(node.left, value);
    else if (value > node.value) node.right = this._insert(node.right, value);
    else return node; // duplicate — no-op
    return this.balance(node);
  }

  insert(value) {
    this.lastRotations = [];
    this.root = this._insert(this.root, value);

    // Walk to the newly inserted node and return its reference
    let cur = this.root;
    while (cur) {
      if (value === cur.value) return { rotations: this.lastRotations, nodeRef: cur };
      cur = value < cur.value ? cur.left : cur.right;
    }
    return { rotations: this.lastRotations, nodeRef: null };
  }

  minNode(node) {
    while (node.left) node = node.left;
    return node;
  }

  // Delete by direct node reference — no key search required.
  // Uses BST ordering only for traversal; identity (===) confirms the match.
  _deleteByRef(node, target) {
    if (!node) return null;

    if (target === node) {
      if (!node.left) return node.right;
      if (!node.right) return node.left;
      // Two children: splice in the in-order successor by reference
      const successor = this.minNode(node.right);
      node.value = successor.value;
      node.right = this._deleteByRef(node.right, successor);
      return this.balance(node);
    }

    if (target.value < node.value) {
      node.left = this._deleteByRef(node.left, target);
    } else {
      node.right = this._deleteByRef(node.right, target);
    }
    return this.balance(node);
  }

  // Public API: accepts an AVLNode reference, not a key value
  deleteNode(nodeRef) {
    this.lastRotations = [];
    this.root = this._deleteByRef(this.root, nodeRef);
    return this.lastRotations;
  }

  clear() {
    this.root = null;
    this.lastRotations = [];
  }

  toD3(node = this.root) {
    if (!node) return null;
    return {
      name: String(node.value),
      bf: this.balanceFactor(node),
      nodeRef: node, // direct reference — used by visualization for deletion
      children: [this.toD3(node.left), this.toD3(node.right)].filter(Boolean),
    };
  }
}
