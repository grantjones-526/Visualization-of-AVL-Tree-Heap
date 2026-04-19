/**
 * AVLNode
 * Represents a single node in an AVL tree.
 * Each node stores a value, left and right child references,
 * and a height used for balancing the tree.
 */
class AVLNode {
  /**
   * @param {number|string} value - The value stored in this node.
   */
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
    this.height = 1;
  }
}

/**
 * AVLTree
 * A self-balancing binary search tree.
 * After every insert or delete, the tree applies rotations as needed
 * to keep the height difference between any node's left and right subtrees at most 1.
 */
class AVLTree {
  constructor() {
    this.root = null;
    this.lastRotations = [];
  }

  /**
   * Returns the stored height of a node, or 0 if the node is null.
   */
  height(node) {
    if (node === null) {
      return 0;
    }
    return node.height;
  }

  /**
   * Computes the balance factor of a node: height(left subtree) - height(right subtree).
   * A positive value means the node is left-heavy; a negative value means right-heavy.
   * the balance factor must stay in the range [-1, 1].
   * @param {AVLNode|null} node
   * @returns {number}
   */
  balanceFactor(node) {
    if (node === null) {
      return 0;
    }
    return this.height(node.left) - this.height(node.right);
  }

  /**
   * Recalculates and stores the height for the given node based on its children.
   * Height = 1 + max(leftHeight, rightHeight).
   * @param {AVLNode} node
   */

  updateHeight(node) {
    const leftHeight = this.height(node.left);
    const rightHeight = this.height(node.right);

    if (leftHeight > rightHeight) {
      node.height = 1 + leftHeight;
    } else {
      node.height = 1 + rightHeight;
    }
  }

  /**
   * Performs a right rotation around node y.
   */
  rotateRight(y) {
    const x = y.left;
    const T2 = x.right;

    // x takes y's place; y becomes x's right child
    x.right = y;
    y.left = T2;

    // Heights must be updated bottom-up: y is now lower so update it first
    this.updateHeight(y);
    this.updateHeight(x);

    this.lastRotations.push({ type: 'Right', pivot: x.value, around: y.value });
    return x;
  }

  /**
   * Performs a left rotation around node x.
   */
  rotateLeft(x) {
    const y = x.right;
    const T2 = y.left;

    // y takes x's place; x becomes y's left child
    y.left = x;
    x.right = T2;

    // Heights must be updated bottom-up: x is now lower so update it first
    this.updateHeight(x);
    this.updateHeight(y);

    this.lastRotations.push({ type: 'Left', pivot: y.value, around: x.value });
    return y;
  }

  /**
   * Updates a node's height then applies the appropriate rotation(s) if the
   * subtree has become unbalanced. Four cases are handled:
   *
   *   Left-Left   (bf > 1, left child bf >= 0)  → single right rotation
   *   Left-Right  (bf > 1, left child bf < 0)   → left rotation on child, then right rotation
   *   Right-Right (bf < -1, right child bf <= 0) → single left rotation
   *   Right-Left  (bf < -1, right child bf > 0)  → right rotation on child, then left rotation
   */
  balance(node) {
    this.updateHeight(node);
    const bf = this.balanceFactor(node);

    if (bf > 1) {
      // Left-heavy: check for Left-Right case
      if (this.balanceFactor(node.left) < 0) {
        // Left-Right: rotate the left child left first to convert to Left-Left
        node.left = this.rotateLeft(node.left);
      }
      // Left-Left: single right rotation restores balance
      return this.rotateRight(node);
    }

    if (bf < -1) {
      // Right-heavy: check for Right-Left case
      if (this.balanceFactor(node.right) > 0) {
        // Right-Left: rotate the right child right first to convert to Right-Right
        node.right = this.rotateRight(node.right);
      }
      // Right-Right: single left rotation restores balance
      return this.rotateLeft(node);
    }

    // Balance factor is within [-1, 1] — no rotation needed
    return node;
  }

  /**
   * Recursively inserts a value into the subtree rooted at node,
   * then rebalances on the way back up the call stack.
   */
  _insert(node, value) {
    // Base case: empty spot found — create and return a new leaf node
    if (node === null) {
      return new AVLNode(value);
    }

    if (value < node.value) {
      // Value belongs in the left subtree
      node.left = this._insert(node.left, value);
    } else if (value > node.value) {
      // Value belongs in the right subtree
      node.right = this._insert(node.right, value);
    } else {
      // Duplicate value — do nothing and return the existing node unchanged
      return node;
    }

    // Rebalance this node now that a child has been modified
    return this.balance(node);
  }

  /**
   * Public insert API.
   * Inserts a value into the tree and returns the list of rotations performed
   * along with a direct reference to the newly inserted node.
   */
  insert(value) {
    this.lastRotations = [];
    this.root = this._insert(this.root, value);

    // Walk the tree to locate and return a direct reference to the inserted node
    let cur = this.root;
    while (cur !== null) {
      if (value === cur.value) {
        return { rotations: this.lastRotations, nodeRef: cur };
      }
      if (value < cur.value) {
        cur = cur.left;
      } else {
        cur = cur.right;
      }
    }

    // The value was a duplicate and was not inserted
    return { rotations: this.lastRotations, nodeRef: null };
  }

  /**
   * Returns the node with the smallest value in the given subtree.
   * Used to find the in-order successor during deletion.
   */
  minNode(node) {
    while (node.left !== null) {
      node = node.left;
    }
    return node;
  }

  /**
   * Recursively deletes the node matching the given reference (by object identity, not value).
   * When the target has two children, its value is replaced by the in-order successor's value,
   * then the successor is deleted from the right subtree.
   */
  _deleteByRef(node, target) {
    if (node === null) {
      return null;
    }

    if (target === node) {
      // Found the exact node to delete

      if (node.left === null) {
        // No left child: replace this node with its right child
        return node.right;
      }

      if (node.right === null) {
        // No right child: replace this node with its left child
        return node.left;
      }

      // Node has two children:
      const successor = this.minNode(node.right);
      node.value = successor.value;
      node.right = this._deleteByRef(node.right, successor);
      return this.balance(node);
    }

    // The target is not this node — descend into the appropriate subtree
    if (target.value < node.value) {
      node.left = this._deleteByRef(node.left, target);
    } else {
      node.right = this._deleteByRef(node.right, target);
    }

    return this.balance(node);
  }

  /**
   * Removes the node identified by the given direct reference.
   */
  deleteNode(nodeRef) {
    this.lastRotations = [];
    this.root = this._deleteByRef(this.root, nodeRef);
    return this.lastRotations;
  }

  /**
   * Removes all nodes from the tree and resets the rotation log.
   */
  clear() {
    this.root = null;
    this.lastRotations = [];
  }

  /**
   * Converts the tree to a nested object structure compatible with D3's hierarchy layout.
   * Each object includes the node's value as a string (name), its balance factor (bf),
   * a direct AVLNode reference (nodeRef used by the visualization for deletion),
   * and an array of child objects.
   */
  toD3(node) {
    // Allow callers to omit the argument to start from the root
    if (node === undefined) {
      node = this.root;
    }

    if (node === null) {
      return null;
    }

    const leftChild = this.toD3(node.left);
    const rightChild = this.toD3(node.right);
    const children = [];

    if (leftChild !== null) {
      children.push(leftChild);
    }
    if (rightChild !== null) {
      children.push(rightChild);
    }

    return {
      name: String(node.value),
      bf: this.balanceFactor(node),
      nodeRef: node,
      children: children
    };
  }
}
