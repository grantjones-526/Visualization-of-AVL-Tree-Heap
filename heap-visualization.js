const heap = new BinaryHeap('max');

const heapSvg = d3.select('#heap-svg');
const hWidth = 900;
const hHeight = 420;
const hImgW = 140;
const hImgH = 100;

heapSvg.attr('viewBox', '0 0 ' + hWidth + ' ' + hHeight);

const hg = heapSvg.append('g').attr('transform', 'translate(0, 60)');
const hLinksGroup = hg.append('g').attr('class', 'heap-links');
const hNodesGroup = hg.append('g').attr('class', 'heap-nodes');

const heapEmptyHint = heapSvg.append('text')
  .attr('class', 'empty-hint')
  .attr('x', hWidth / 2)
  .attr('y', hHeight / 2)
  .attr('text-anchor', 'middle')
  .attr('dominant-baseline', 'middle')
  .text('Insert a value to begin');

let selectedHeapIndex = null;
let heapFadeTimer = null;
let hIslandSrc = 'Island_node.png';

/**
 * Enables or disables all heap control buttons.
 */
function setHeapControls(disabled) {
  const ids = ['btn-heap-insert', 'btn-heap-extract', 'btn-heap-toggle', 'btn-heap-clear', 'btn-heap-random'];

  for (let i = 0; i < ids.length; i++) {
    document.getElementById(ids[i]).disabled = disabled;
  }

  // Delete also requires a node to be selected
  document.getElementById('btn-heap-delete').disabled = disabled || selectedHeapIndex === null;
}

/**
 * Adds new message to the heap operation log panel.
 * The log is capped at 20 entries.
 */
function heapLog(message) {
  const list = document.getElementById('heap-log-list');
  const item = document.createElement('li');
  item.textContent = message;
  list.prepend(item);
  if (list.children.length > 20) {
    list.removeChild(list.lastChild);
  }
}

/**
 * Updates the Delete button label.
 */
function updateHeapDeleteBtn() {
  const btn = document.getElementById('btn-heap-delete');
  const label = document.getElementById('heap-selection-label');

  if (selectedHeapIndex !== null) {
    const val = heap.data[selectedHeapIndex];
    btn.textContent = 'Delete [' + selectedHeapIndex + '] = "' + val + '"';
    btn.disabled = false;
    label.textContent = 'Selected: index ' + selectedHeapIndex + ' (value "' + val + '") — click Delete to remove';
  } else {
    btn.textContent = 'Delete Selected';
    btn.disabled = true;
    label.textContent = 'Click a node to select it for deletion';
  }
}

/**
 * Rebuilds the array display strip below the heap visualization.
 */
function updateArrayDisplay() {
  const container = document.getElementById('heap-array-values');
  let html = '';

  for (let i = 0; i < heap.data.length; i++) {
    let cssClass = '';
    if (i === selectedHeapIndex) {
      cssClass = 'selected-index';
    }
    html = html + '<span class="' + cssClass + '" title="index ' + i + '">[' + i + ']:' + heap.data[i] + '</span>';
  }

  container.innerHTML = html;
}

/**
 * Returns the CSS class string for a given heap node element.
 * Priority: selected > highlighted (swapped during operation) > root > normal.
 */
function heapNodeClass(d, highlightIndices, highlightClass) {
  if (d.data.index === selectedHeapIndex) {
    return 'heap-node selected';
  }

  if (highlightIndices.indexOf(d.data.index) !== -1) {
    return 'heap-node ' + highlightClass;
  }

  if (d.data.index === 0) {
    return 'heap-node root';
  }

  return 'heap-node normal';
}

/**
 * Collects all unique array indices from a list of swap pairs.
 * Each swap pair is a two-element array [i, j]. This helper is used
 * to determine which nodes to highlight after an operation.
 */
function collectSwappedIndices(swaps) {
  const indices = [];

  for (let i = 0; i < swaps.length; i++) {
    for (let j = 0; j < swaps[i].length; j++) {
      const idx = swaps[i][j];
      if (indices.indexOf(idx) === -1) {
        indices.push(idx);
      }
    }
  }

  return indices;
}

/**
 * Renders the current heap to the SVG canvas using D3.
 * New nodes fade in; moved nodes animate to their new positions; removed nodes fade out.
 */
function renderHeap(highlightIndices, highlightClass, autoFade) {
  if (highlightIndices === undefined) {
    highlightIndices = [];
  }
  if (highlightClass === undefined) {
    highlightClass = 'inserted';
  }
  if (autoFade === undefined) {
    autoFade = true;
  }

  const data = heap.toD3();

  // If the heap is empty, clear both layer groups, show the hint, and reset controls
  if (data === null) {
    hLinksGroup.selectAll('*').remove();
    hNodesGroup.selectAll('*').remove();
    heapEmptyHint.style('display', null);
    updateArrayDisplay();
    updateHeapDeleteBtn();
    return;
  }

  heapEmptyHint.style('display', 'none');

  // Build the D3 hierarchy and compute (x, y) positions using the tree layout
  const root = d3.hierarchy(data);
  const treeLayout = d3.tree()
    .size([hWidth - 60, hHeight - 100])
    .separation(function() { return 1; });
  treeLayout(root);

  // Shift all node positions 30px to the right so they are not clipped at the left edge
  root.each(function(d) { d.x = d.x + 30; });

  // Links
  const linkSel = hLinksGroup.selectAll('.heap-link')
    .data(root.links(), function(d) {
      return d.source.data.index + '-' + d.target.data.index;
    });

  // New links fade in
  linkSel.enter()
    .append('path')
    .attr('class', 'heap-link')
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

  // Nodes
  const nodeSel = hNodesGroup.selectAll('.heap-node')
    .data(root.descendants(), function(d) { return d.data.index; });

  // Click handler: select this node for deletion
  function onNodeClick(event, d) {
    selectedHeapIndex = d.data.index;
    updateHeapDeleteBtn();
    renderHeap();
  }

  // New nodes: create the group, append image and text label, then fade in
  const nodeEnter = nodeSel.enter()
    .append('g')
    .attr('class', function(d) { return heapNodeClass(d, highlightIndices, highlightClass); })
    .attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; })
    .style('opacity', 0)
    .style('cursor', 'pointer')
    .on('click', onNodeClick);

  nodeEnter.append('image')
    .attr('href', hIslandSrc)
    .attr('width', hImgW)
    .attr('height', hImgH)
    .attr('x', -hImgW / 2)
    .attr('y', -hImgH / 2);

  // Value label positioned near the top of the island image
  nodeEnter.append('text')
    .attr('class', 'node-label')
    .attr('dy', -hImgH / 2 + 13)
    .attr('text-anchor', 'middle')
    .text(function(d) { return d.data.name; });

  nodeEnter.transition().duration(400).style('opacity', 1);

  // Existing nodes: update class and animate to the new position
  nodeSel
    .attr('class', function(d) { return heapNodeClass(d, highlightIndices, highlightClass); })
    .on('click', onNodeClick)
    .transition().duration(400)
    .attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });

  nodeSel.select('.node-label').text(function(d) { return d.data.name; });

  // Removed nodes fade out
  nodeSel.exit()
    .transition().duration(300)
    .style('opacity', 0)
    .remove();

  updateArrayDisplay();
  updateHeapDeleteBtn();

  // Schedule an automatic fade of swap highlights after 900 ms
  if (highlightIndices.length > 0 && autoFade) {
    clearTimeout(heapFadeTimer);
    heapFadeTimer = setTimeout(function() { renderHeap([], 'normal'); }, 900);
  }
}

// Event Listeners

/**
 * Manual insert button.
 * Reads the input field, inserts the value into the heap,
 * and renders the result with swapped nodes highlighted.
 */
document.getElementById('btn-heap-insert').addEventListener('click', function() {
  const input = document.getElementById('heap-value');
  const value = parseKey(input.value);

  if (value === null) {
    return;
  }

  const swaps = heap.insert(value);
  input.value = '';
  selectedHeapIndex = null;

  let swapMsg = '';
  if (swaps.length > 0) {
    swapMsg = ' → ' + swaps.length + ' swap(s) during bubble-up';
  }
  heapLog('Inserted "' + value + '"' + swapMsg);

  renderHeap(collectSwappedIndices(swaps), 'swapped');
});

/**
 * Delete by index button.
 * Removes the currently selected node from the heap by its array index.
 */
document.getElementById('btn-heap-delete').addEventListener('click', function() {
  if (selectedHeapIndex === null) {
    return;
  }

  const index = selectedHeapIndex;
  const result = heap.deleteAt(index);
  selectedHeapIndex = null;

  let swapMsg = '';
  if (result.swaps.length > 0) {
    swapMsg = ' → ' + result.swaps.length + ' swap(s) to restore heap';
  }
  heapLog('Deleted index ' + index + ' (value "' + result.value + '")' + swapMsg);

  renderHeap(collectSwappedIndices(result.swaps), 'swapped');
});

/**
 * Extract root button.
 * Removes the element at index 0 (the maximum or minimum value) from the heap.
 */
document.getElementById('btn-heap-extract').addEventListener('click', function() {
  if (heap.data.length === 0) {
    heapLog('Heap is empty');
    return;
  }

  selectedHeapIndex = null;
  const result = heap.extractRoot();

  let swapMsg = '';
  if (result.swaps.length > 0) {
    swapMsg = ' → ' + result.swaps.length + ' swap(s) during sift-down';
  }
  heapLog('Extracted root: "' + result.value + '"' + swapMsg);

  renderHeap(collectSwappedIndices(result.swaps), 'swapped');
});

/**
 * Random generation button.
 * Clears the heap and inserts randomly generated keys one at a time,
 * pausing between each insertion to show the animated build-up.
 */
document.getElementById('btn-heap-random').addEventListener('click', async function() {
  const sizeInput = document.getElementById('heap-random-size');
  const type = document.getElementById('heap-random-type').value;
  const parsedSize = parseInt(sizeInput.value, 10) || 10;

  // Cap the size at the maximum number of unique values available for this type
  let maxSize;
  if (type === 'letter') {
    maxSize = 52;
  } else {
    maxSize = 200;
  }

  const size = Math.max(1, Math.min(parsedSize, maxSize));

  heap.clear();
  selectedHeapIndex = null;
  clearTimeout(heapFadeTimer);

  const keys = generateRandomKeys(size, type);
  heapLog('Generating random ' + type + ' heap — ' + keys.length + ' keys: [' + keys.join(', ') + ']');

  setHeapControls(true);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const swaps = heap.insert(key);

    let swapMsg = '';
    if (swaps.length > 0) {
      swapMsg = ' → ' + swaps.length + ' swap(s)';
    }
    heapLog('  insert "' + key + '"' + swapMsg);

    // Render with highlights but no auto-fade so the highlight stays during the delay
    renderHeap(collectSwappedIndices(swaps), 'swapped', false);
    await sleep(650);
  }

  // Final clean render with no highlights
  renderHeap([], 'normal');
  setHeapControls(false);
});

/**
 * Toggle min/max button.
 * Switches the heap between max-heap and min-heap mode, then rebuilds the heap.
 */
const toggleBtn = document.getElementById('btn-heap-toggle');
toggleBtn.addEventListener('click', function() {
  let newType;
  if (heap.type === 'max') {
    newType = 'min';
  } else {
    newType = 'max';
  }

  heap.setType(newType);
  selectedHeapIndex = null;

  if (newType === 'max') {
    toggleBtn.textContent = 'Mode: Max-Heap';
    toggleBtn.classList.remove('min');
  } else {
    toggleBtn.textContent = 'Mode: Min-Heap';
    toggleBtn.classList.add('min');
  }

  heapLog('Switched to ' + newType + '-heap — tree rebuilt');
  renderHeap([], 'inserted');
});

/**
 * Clear button.
 * Empties the heap and resets the display.
 */
document.getElementById('btn-heap-clear').addEventListener('click', function() {
  heap.clear();
  selectedHeapIndex = null;
  heapLog('Heap cleared');
  renderHeap();
});

/**
 * Allow the Enter key to trigger the Insert button from the value input field.
 */
document.getElementById('heap-value').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    document.getElementById('btn-heap-insert').click();
  }
});

// Strip the SVG canvas background color from the island image, then render the initial (empty) heap
removeImageBackground('Island_node.png', [140, 185, 208], 40).then(function(url) {
  hIslandSrc = url;
  renderHeap();
});
