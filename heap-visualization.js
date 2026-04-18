const heap = new BinaryHeap('max');

const heapSvg = d3.select('#heap-svg');
const hWidth = 900;
const hHeight = 420;
const hImgW = 140, hImgH = 100;  // island image display size

heapSvg.attr('viewBox', `0 0 ${hWidth} ${hHeight}`);

const hg = heapSvg.append('g').attr('transform', 'translate(0, 40)');
const hLinksGroup = hg.append('g').attr('class', 'heap-links');
const hNodesGroup = hg.append('g').attr('class', 'heap-nodes');

let selectedHeapIndex = null;
let heapFadeTimer = null;
let hIslandSrc = 'Island_node.png';  // replaced with bg-stripped data-URL on init

function setHeapControls(disabled) {
  ['btn-heap-insert', 'btn-heap-extract', 'btn-heap-toggle',
   'btn-heap-clear', 'btn-heap-random'].forEach(id => {
    document.getElementById(id).disabled = disabled;
  });
  document.getElementById('btn-heap-delete').disabled = disabled || selectedHeapIndex === null;
}

function heapLog(message) {
  const list = document.getElementById('heap-log-list');
  const item = document.createElement('li');
  item.textContent = message;
  list.prepend(item);
  if (list.children.length > 20) list.removeChild(list.lastChild);
}

function updateHeapDeleteBtn() {
  const btn = document.getElementById('btn-heap-delete');
  const label = document.getElementById('heap-selection-label');
  if (selectedHeapIndex !== null) {
    const val = heap.data[selectedHeapIndex];
    btn.textContent = `Delete [${selectedHeapIndex}] = "${val}"`;
    btn.disabled = false;
    label.textContent = `Selected: index ${selectedHeapIndex} (value "${val}") — click Delete to remove`;
  } else {
    btn.textContent = 'Delete Selected';
    btn.disabled = true;
    label.textContent = 'Click a node to select it for deletion';
  }
}

function updateArrayDisplay() {
  const container = document.getElementById('heap-array-values');
  container.innerHTML = heap.data
    .map((v, i) => `<span class="${i === selectedHeapIndex ? 'selected-index' : ''}" title="index ${i}">[${i}]:${v}</span>`)
    .join('');
}

function heapNodeClass(d, highlightIndices, highlightClass) {
  if (d.data.index === selectedHeapIndex) return 'heap-node selected';
  if (highlightIndices.includes(d.data.index)) return `heap-node ${highlightClass}`;
  if (d.data.index === 0) return 'heap-node root';
  return 'heap-node normal';
}

function renderHeap(highlightIndices = [], highlightClass = 'inserted', autoFade = true) {
  const data = heap.toD3();

  if (!data) {
    hLinksGroup.selectAll('*').remove();
    hNodesGroup.selectAll('*').remove();
    updateArrayDisplay();
    updateHeapDeleteBtn();
    return;
  }

  const root = d3.hierarchy(data);
  const treeLayout = d3.tree().size([hWidth - 60, hHeight - 100]).separation(() => 1);
  treeLayout(root);
  root.each(d => { d.x += 30; });

  // Links
  const linkSel = hLinksGroup.selectAll('.heap-link')
    .data(root.links(), d => `${d.source.data.index}-${d.target.data.index}`);

  linkSel.enter()
    .append('path').attr('class', 'heap-link')
    .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y))
    .style('opacity', 0).transition().duration(400).style('opacity', 1);

  linkSel.transition().duration(400)
    .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y));

  linkSel.exit().transition().duration(300).style('opacity', 0).remove();

  // Nodes
  const nodeSel = hNodesGroup.selectAll('.heap-node')
    .data(root.descendants(), d => d.data.index);

  const onNodeClick = (event, d) => {
    selectedHeapIndex = d.data.index;
    updateHeapDeleteBtn();
    renderHeap();
  };

  const nodeEnter = nodeSel.enter()
    .append('g')
    .attr('class', d => heapNodeClass(d, highlightIndices, highlightClass))
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('opacity', 0).style('cursor', 'pointer')
    .on('click', onNodeClick);

  nodeEnter.append('image')
    .attr('href', hIslandSrc)
    .attr('width', hImgW).attr('height', hImgH)
    .attr('x', -hImgW / 2).attr('y', -hImgH / 2);
  nodeEnter.append('text').attr('class', 'node-label')
    .attr('dy', -hImgH / 2 + 13).attr('text-anchor', 'middle')
    .text(d => d.data.name);
  nodeEnter.transition().duration(400).style('opacity', 1);

  nodeSel
    .attr('class', d => heapNodeClass(d, highlightIndices, highlightClass))
    .on('click', onNodeClick)
    .transition().duration(400).attr('transform', d => `translate(${d.x},${d.y})`);

  nodeSel.select('.node-label').text(d => d.data.name);
  nodeSel.exit().transition().duration(300).style('opacity', 0).remove();

  updateArrayDisplay();
  updateHeapDeleteBtn();

  if (highlightIndices.length > 0 && autoFade) {
    clearTimeout(heapFadeTimer);
    heapFadeTimer = setTimeout(() => renderHeap([], 'normal'), 900);
  }
}

// Manual insert — supports integers and single letters
document.getElementById('btn-heap-insert').addEventListener('click', () => {
  const input = document.getElementById('heap-value');
  const value = parseKey(input.value);
  if (value === null) return;

  const swaps = heap.insert(value);
  input.value = '';
  selectedHeapIndex = null;

  const swapMsg = swaps.length > 0 ? ` → ${swaps.length} swap(s) during bubble-up` : '';
  heapLog(`Inserted "${value}"${swapMsg}`);
  renderHeap([...new Set(swaps.flat())], 'swapped');
});

// Delete by index (vertex reference)
document.getElementById('btn-heap-delete').addEventListener('click', () => {
  if (selectedHeapIndex === null) return;
  const index = selectedHeapIndex;
  const result = heap.deleteAt(index);
  selectedHeapIndex = null;

  const swapMsg = result.swaps.length > 0 ? ` → ${result.swaps.length} swap(s) to restore heap` : '';
  heapLog(`Deleted index ${index} (value "${result.value}")${swapMsg}`);
  renderHeap([...new Set(result.swaps.flat())], 'swapped');
});

// Extract root (deleteAt(0))
document.getElementById('btn-heap-extract').addEventListener('click', () => {
  if (heap.data.length === 0) { heapLog('Heap is empty'); return; }
  selectedHeapIndex = null;
  const result = heap.extractRoot();
  const swapMsg = result.swaps.length > 0 ? ` → ${result.swaps.length} swap(s) during sift-down` : '';
  heapLog(`Extracted root: "${result.value}"${swapMsg}`);
  renderHeap([...new Set(result.swaps.flat())], 'swapped');
});

// Random generation — insert keys one by one with animation
document.getElementById('btn-heap-random').addEventListener('click', async () => {
  const sizeInput = document.getElementById('heap-random-size');
  const type = document.getElementById('heap-random-type').value;
  const size = Math.max(1, Math.min(parseInt(sizeInput.value, 10) || 10, type === 'letter' ? 52 : 200));

  heap.clear();
  selectedHeapIndex = null;
  clearTimeout(heapFadeTimer);

  const keys = generateRandomKeys(size, type);
  heapLog(`Generating random ${type} heap — ${keys.length} keys: [${keys.join(', ')}]`);

  setHeapControls(true);

  for (const key of keys) {
    const swaps = heap.insert(key);
    const swapMsg = swaps.length > 0 ? ` → ${swaps.length} swap(s)` : '';
    heapLog(`  insert "${key}"${swapMsg}`);
    renderHeap([...new Set(swaps.flat())], 'swapped', false);  // no auto-fade
    await sleep(650);
  }

  renderHeap([], 'normal');   // final clean render
  setHeapControls(false);
});

// Toggle min/max
const toggleBtn = document.getElementById('btn-heap-toggle');
toggleBtn.addEventListener('click', () => {
  const newType = heap.type === 'max' ? 'min' : 'max';
  heap.setType(newType);
  selectedHeapIndex = null;
  toggleBtn.textContent = `Mode: ${newType === 'max' ? 'Max' : 'Min'}-Heap`;
  toggleBtn.classList.toggle('min', newType === 'min');
  heapLog(`Switched to ${newType}-heap — tree rebuilt`);
  renderHeap([], 'inserted');
});

// Clear
document.getElementById('btn-heap-clear').addEventListener('click', () => {
  heap.clear();
  selectedHeapIndex = null;
  heapLog('Heap cleared');
  renderHeap();
});

document.getElementById('heap-value').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-heap-insert').click();
});

removeImageBackground('Island_node.png', [140, 185, 208], 40).then(url => {
  hIslandSrc = url;
  renderHeap();
});
