const tree = new AVLTree();

const svg = d3.select('#tree-svg');
const width = 900;
const height = 500;
const imgW = 140;
const imgH = 100;

svg.attr('viewBox', '0 0 ' + width + ' ' + height);

const g = svg.append('g').attr('transform', 'translate(0, 60)');
const linksGroup = g.append('g').attr('class', 'links');
const nodesGroup = g.append('g').attr('class', 'nodes');

const avlEmptyHint = svg.append('text')
  .attr('class', 'empty-hint')
  .attr('x', width / 2)
  .attr('y', height / 2)
  .attr('text-anchor', 'middle')
  .attr('dominant-baseline', 'middle')
  .text('Insert a value to begin');

let selectedNodeRef = null;
let avlFadeTimer = null;
let islandSrc = 'Island_node.png';

/**
 * Returns a promise that resolves after the given number of milliseconds.
 * Used to add delays between steps in the animated random-generation sequence.
 * @param {number} ms - Delay in milliseconds.
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

/**
 * Enables or disables all AVL tree control buttons.
 * The Delete button also requires a node to be selected — it stays disabled
 * even when controls are re-enabled if nothing is selected.
 * @param {boolean} disabled - True to disable all controls, false to enable.
 */
function setAVLControls(disabled) {
  const ids = ['btn-insert', 'btn-delete', 'btn-clear', 'btn-avl-random'];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const btn = document.getElementById(id);

    if (id === 'btn-delete') {
      // Delete requires both controls enabled AND a node to be selected
      btn.disabled = disabled || !selectedNodeRef;
    } else {
      btn.disabled = disabled;
    }
  }
}

/**
 * Prepends a new message to the AVL operation log panel.
 * The log is capped at 20 entries; the oldest entry is removed when the cap is exceeded.
 * @param {string} message - The message text to display.
 */
function log(message) {
  const list = document.getElementById('log-list');
  const item = document.createElement('li');
  item.textContent = message;
  list.prepend(item);
  if (list.children.length > 20) {
    list.removeChild(list.lastChild);
  }
}

/**
 * Updates the Delete button label and the selection hint text to reflect
 * whether a node is currently selected.
 */
function updateDeleteBtn() {
  const btn = document.getElementById('btn-delete');
  const label = document.getElementById('avl-selection-label');

  if (selectedNodeRef !== null) {
    btn.textContent = 'Delete "' + selectedNodeRef.value + '"';
    btn.disabled = false;
    label.textContent = 'Selected: "' + selectedNodeRef.value + '" — click Delete to remove';
  } else {
    btn.textContent = 'Delete';
    btn.disabled = true;
    label.textContent = 'Click a node to select it for deletion';
  }
}

/**
 * Returns the CSS class string for a given tree node element.
 * Priority: selected > rotated > normal.
 *
 * @param {Object} d - The D3 datum for this node.
 * @param {Array} rotatedPivots - Values (numbers or strings) of nodes that were rotation pivots.
 * @returns {string} One of: 'node selected', 'node rotated', 'node normal'.
 */
function nodeClass(d, rotatedPivots) {
  if (d.data.nodeRef === selectedNodeRef) {
    return 'node selected';
  }

  // Convert all pivot values to strings so they compare correctly against d.data.name
  const stringPivots = [];
  for (let i = 0; i < rotatedPivots.length; i++) {
    stringPivots.push(String(rotatedPivots[i]));
  }

  if (stringPivots.indexOf(d.data.name) !== -1) {
    return 'node rotated';
  }

  return 'node normal';
}

/**
 * Renders the current AVL tree to the SVG canvas using D3.
 * New nodes fade in; moved nodes animate to their new positions; removed nodes fade out.
 * Nodes whose values appear in rotatedPivots are highlighted with the 'rotated' CSS class.
 * If autoFade is true, the rotation highlight fades after 1 second.
 *
 * @param {Array} rotatedPivots - Pivot values to highlight (default: empty array).
 * @param {boolean} autoFade - Whether to clear the highlight after a delay (default: true).
 */
function render(rotatedPivots, autoFade) {
  if (rotatedPivots === undefined) {
    rotatedPivots = [];
  }
  if (autoFade === undefined) {
    autoFade = true;
  }

  const data = tree.toD3();

  // If the tree is empty, clear both layer groups, show the hint, and reset controls
  if (data === null) {
    linksGroup.selectAll('*').remove();
    nodesGroup.selectAll('*').remove();
    avlEmptyHint.style('display', null);
    updateDeleteBtn();
    return;
  }

  avlEmptyHint.style('display', 'none');

  // Build the D3 hierarchy and compute (x, y) positions using the tree layout
  const root = d3.hierarchy(data);
  const treeLayout = d3.tree()
    .size([width - 60, height - 100])
    .separation(function() { return 1; });
  treeLayout(root);

  // Shift all node positions 30px to the right so they are not clipped at the left edge
  root.each(function(d) { d.x = d.x + 30; });

  // ── Links ──────────────────────────────────────────────────────────────────
  const linkSel = linksGroup.selectAll('.link')
    .data(root.links(), function(d) {
      return d.source.data.name + '-' + d.target.data.name;
    });

  // New links fade in
  linkSel.enter()
    .append('path')
    .attr('class', 'link')
    .attr('d', d3.linkVertical()
      .x(function(d) { return d.x; })
      .y(function(d) { return d.y; }))
    .style('opacity', 0)
    .transition().duration(400)
    .style('opacity', 1);

  // Existing links animate to their new positions
  linkSel.transition().duration(400)
    .attr('d', d3.linkVertical()
      .x(function(d) { return d.x; })
      .y(function(d) { return d.y; }));

  // Removed links fade out
  linkSel.exit()
    .transition().duration(300)
    .style('opacity', 0)
    .remove();

  // ── Nodes ──────────────────────────────────────────────────────────────────
  const nodeSel = nodesGroup.selectAll('.node')
    .data(root.descendants(), function(d) { return d.data.name; });

  // Click handler: select this node for deletion
  function onNodeClick(event, d) {
    selectedNodeRef = d.data.nodeRef;
    updateDeleteBtn();
    render();
  }

  // New nodes: create the group, append image and text labels, then fade in
  const nodeEnter = nodeSel.enter()
    .append('g')
    .attr('class', function(d) { return nodeClass(d, rotatedPivots); })
    .attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; })
    .style('opacity', 0)
    .style('cursor', 'pointer')
    .on('click', onNodeClick);

  nodeEnter.append('image')
    .attr('href', islandSrc)
    .attr('width', imgW)
    .attr('height', imgH)
    .attr('x', -imgW / 2)
    .attr('y', -imgH / 2);

  // Value label positioned near the top of the island image
  nodeEnter.append('text')
    .attr('class', 'node-label')
    .attr('dy', -imgH / 2 + 13)
    .attr('text-anchor', 'middle')
    .text(function(d) { return d.data.name; });


  nodeEnter.transition().duration(400).style('opacity', 1);

  // Existing nodes: update class and animate to the new position
  nodeSel
    .attr('class', function(d) { return nodeClass(d, rotatedPivots); })
    .on('click', onNodeClick)
    .transition().duration(400)
    .attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });

  nodeSel.select('.node-label').text(function(d) { return d.data.name; });

  // Removed nodes fade out
  nodeSel.exit()
    .transition().duration(300)
    .style('opacity', 0)
    .remove();

  updateDeleteBtn();

  // Schedule an automatic fade of rotation highlights after 1 second
  if (rotatedPivots.length > 0 && autoFade) {
    clearTimeout(avlFadeTimer);
    avlFadeTimer = setTimeout(function() { render([]); }, 1000);
  }
}

// ── Event Listeners ───────────────────────────────────────────────────────────

/**
 * Manual insert button.
 * Reads the input field, inserts the value into the tree,
 * and renders the result with any rotation pivots highlighted.
 */
document.getElementById('btn-insert').addEventListener('click', function() {
  const input = document.getElementById('node-value');
  const value = parseKey(input.value);

  if (value === null) {
    return;
  }

  const result = tree.insert(value);
  const rotations = result.rotations;
  input.value = '';

  // Build the rotation message for the log
  let rotMsg = '';
  for (let i = 0; i < rotations.length; i++) {
    if (rotMsg.length > 0) {
      rotMsg = rotMsg + ', ';
    }
    rotMsg = rotMsg + rotations[i].type + ' rotation (pivot: ' + rotations[i].pivot + ')';
  }

  if (rotMsg.length > 0) {
    log('Inserted "' + value + '" → ' + rotMsg);
  } else {
    log('Inserted "' + value + '"');
  }

  // Collect pivot values to pass to render for highlighting
  const pivots = [];
  for (let i = 0; i < rotations.length; i++) {
    pivots.push(rotations[i].pivot);
  }

  render(pivots);
});

/**
 * Delete button.
 * Removes the currently selected node from the tree and renders the result.
 */
document.getElementById('btn-delete').addEventListener('click', function() {
  if (selectedNodeRef === null) {
    return;
  }

  const value = selectedNodeRef.value;
  const rotations = tree.deleteNode(selectedNodeRef);
  selectedNodeRef = null;

  let rotMsg = '';
  for (let i = 0; i < rotations.length; i++) {
    if (rotMsg.length > 0) {
      rotMsg = rotMsg + ', ';
    }
    rotMsg = rotMsg + rotations[i].type + ' rotation (pivot: ' + rotations[i].pivot + ')';
  }

  if (rotMsg.length > 0) {
    log('Deleted "' + value + '" → ' + rotMsg);
  } else {
    log('Deleted "' + value + '"');
  }

  const pivots = [];
  for (let i = 0; i < rotations.length; i++) {
    pivots.push(rotations[i].pivot);
  }

  render(pivots);
});

/**
 * Random generation button.
 * Clears the tree and inserts randomly generated keys one at a time,
 * pausing between each insertion to show the animated build-up.
 */
document.getElementById('btn-avl-random').addEventListener('click', async function() {
  const sizeInput = document.getElementById('avl-random-size');
  const type = document.getElementById('avl-random-type').value;
  const parsedSize = parseInt(sizeInput.value, 10) || 10;

  // Cap the size at the maximum number of unique values available for this type
  let maxSize;
  if (type === 'letter') {
    maxSize = 52;
  } else {
    maxSize = 200;
  }

  const size = Math.max(1, Math.min(parsedSize, maxSize));

  tree.clear();
  selectedNodeRef = null;
  clearTimeout(avlFadeTimer);

  const keys = generateRandomKeys(size, type);
  log('Generating random ' + type + ' AVL tree — ' + keys.length + ' keys: [' + keys.join(', ') + ']');

  setAVLControls(true);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const result = tree.insert(key);
    const rotations = result.rotations;

    const pivots = [];
    let rotMsg = '';

    for (let j = 0; j < rotations.length; j++) {
      pivots.push(rotations[j].pivot);

      if (rotMsg.length > 0) {
        rotMsg = rotMsg + ', ';
      }
      rotMsg = rotMsg + rotations[j].type + '(' + rotations[j].pivot + ')';
    }

    if (rotMsg.length > 0) {
      log('  insert "' + key + '" → ' + rotMsg);
    } else {
      log('  insert "' + key + '"');
    }

    // Render with highlights but no auto-fade so the highlight stays during the delay
    render(pivots, false);
    await sleep(650);
  }

  // Final clean render with no highlights
  render([]);
  setAVLControls(false);
});

/**
 * Clear button.
 * Removes all nodes from the tree and resets the display.
 */
document.getElementById('btn-clear').addEventListener('click', function() {
  tree.clear();
  selectedNodeRef = null;
  log('Tree cleared');
  render();
});

/**
 * Allow the Enter key to trigger the Insert button from the value input field.
 */
document.getElementById('node-value').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    document.getElementById('btn-insert').click();
  }
});

// Strip the SVG canvas background color from the island image, then render the initial (empty) tree
removeImageBackground('Island_node.png', [140, 185, 208], 40).then(function(url) {
  islandSrc = url;
  render();
});
