const tree = new AVLTree();

const svg = d3.select('#tree-svg');
const width = 900;
const height = 500;
const imgW = 140, imgH = 100;  // island image display size

svg.attr('viewBox', `0 0 ${width} ${height}`);

const g = svg.append('g').attr('transform', 'translate(0, 40)');
const linksGroup = g.append('g').attr('class', 'links');
const nodesGroup = g.append('g').attr('class', 'nodes');


let selectedNodeRef = null;
let avlFadeTimer = null;
let islandSrc = 'Island_node.png';  // replaced with bg-stripped data-URL on init

const sleep = ms => new Promise(r => setTimeout(r, ms));

function setAVLControls(disabled) {
  ['btn-insert', 'btn-delete', 'btn-clear', 'btn-avl-random'].forEach(id => {
    document.getElementById(id).disabled = disabled || (id === 'btn-delete' && !selectedNodeRef);
  });
}

function log(message) {
  const list = document.getElementById('log-list');
  const item = document.createElement('li');
  item.textContent = message;
  list.prepend(item);
  if (list.children.length > 20) list.removeChild(list.lastChild);
}

function updateDeleteBtn() {
  const btn = document.getElementById('btn-delete');
  const label = document.getElementById('avl-selection-label');
  if (selectedNodeRef) {
    btn.textContent = `Delete "${selectedNodeRef.value}"`;
    btn.disabled = false;
    label.textContent = `Selected: "${selectedNodeRef.value}" — click Delete to remove`;
  } else {
    btn.textContent = 'Delete';
    btn.disabled = true;
    label.textContent = 'Click a node to select it for deletion';
  }
}

function nodeClass(d, rotatedPivots) {
  if (d.data.nodeRef === selectedNodeRef) return 'node selected';
  // Compare as strings so both number and letter keys match correctly
  if (rotatedPivots.map(String).includes(d.data.name)) return 'node rotated';
  return 'node normal';
}

// autoFade: if false, skip the 1 s cleanup timer (used during step animation)
function render(rotatedPivots = [], autoFade = true) {
  const data = tree.toD3();

  if (!data) {
    linksGroup.selectAll('*').remove();
    nodesGroup.selectAll('*').remove();
    updateDeleteBtn();
    return;
  }

  const root = d3.hierarchy(data);
  const treeLayout = d3.tree().size([width - 60, height - 100]).separation(() => 1);
  treeLayout(root);
  root.each(d => { d.x += 30; });

  // Links
  const linkSel = linksGroup.selectAll('.link')
    .data(root.links(), d => `${d.source.data.name}-${d.target.data.name}`);

  linkSel.enter()
    .append('path').attr('class', 'link')
    .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y))
    .style('opacity', 0).transition().duration(400).style('opacity', 1);

  linkSel.transition().duration(400)
    .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y));

  linkSel.exit().transition().duration(300).style('opacity', 0).remove();

  // Nodes
  const nodeSel = nodesGroup.selectAll('.node')
    .data(root.descendants(), d => d.data.name);

  const onNodeClick = (event, d) => {
    selectedNodeRef = d.data.nodeRef;
    updateDeleteBtn();
    render();
  };

  const nodeEnter = nodeSel.enter()
    .append('g')
    .attr('class', d => nodeClass(d, rotatedPivots))
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('opacity', 0).style('cursor', 'pointer')
    .on('click', onNodeClick);

  nodeEnter.append('image')
    .attr('href', islandSrc)
    .attr('width', imgW).attr('height', imgH)
    .attr('x', -imgW / 2).attr('y', -imgH / 2);
  // Value label at the upper-middle of the island image
  nodeEnter.append('text').attr('class', 'node-label')
    .attr('dy', -imgH / 2 + 13).attr('text-anchor', 'middle')
    .text(d => d.data.name);
  nodeEnter.append('text').attr('class', 'balance-label')
    .attr('dy', imgH / 2 + 13).attr('text-anchor', 'middle')
    .text(d => `bf:${d.data.bf}`);

  nodeEnter.transition().duration(400).style('opacity', 1);

  nodeSel
    .attr('class', d => nodeClass(d, rotatedPivots))
    .on('click', onNodeClick)
    .transition().duration(400).attr('transform', d => `translate(${d.x},${d.y})`);

  nodeSel.select('.node-label').text(d => d.data.name);
  nodeSel.select('.balance-label').text(d => `bf:${d.data.bf}`);
  nodeSel.exit().transition().duration(300).style('opacity', 0).remove();

  updateDeleteBtn();
  if (rotatedPivots.length > 0 && autoFade) {
    clearTimeout(avlFadeTimer);
    avlFadeTimer = setTimeout(() => render([]), 1000);
  }
}

// Manual insert — supports integers and single letters
document.getElementById('btn-insert').addEventListener('click', () => {
  const input = document.getElementById('node-value');
  const value = parseKey(input.value);
  if (value === null) return;

  const { rotations } = tree.insert(value);
  input.value = '';

  const rotMsg = rotations.map(r => `${r.type} rotation (pivot: ${r.pivot})`).join(', ');
  log(`Inserted "${value}"${rotMsg ? ' → ' + rotMsg : ''}`);
  render(rotations.map(r => r.pivot));
});

// Delete by stored AVLNode reference
document.getElementById('btn-delete').addEventListener('click', () => {
  if (!selectedNodeRef) return;
  const value = selectedNodeRef.value;
  const rotations = tree.deleteNode(selectedNodeRef);
  selectedNodeRef = null;

  const rotMsg = rotations.map(r => `${r.type} rotation (pivot: ${r.pivot})`).join(', ');
  log(`Deleted "${value}"${rotMsg ? ' → ' + rotMsg : ''}`);
  render(rotations.map(r => r.pivot));
});

// Random generation — insert keys one by one with animation
document.getElementById('btn-avl-random').addEventListener('click', async () => {
  const sizeInput = document.getElementById('avl-random-size');
  const type = document.getElementById('avl-random-type').value;
  const size = Math.max(1, Math.min(parseInt(sizeInput.value, 10) || 10, type === 'letter' ? 52 : 200));

  tree.clear();
  selectedNodeRef = null;
  clearTimeout(avlFadeTimer);

  const keys = generateRandomKeys(size, type);
  log(`Generating random ${type} AVL tree — ${keys.length} keys: [${keys.join(', ')}]`);

  setAVLControls(true);

  for (const key of keys) {
    const { rotations } = tree.insert(key);
    const pivots = rotations.map(r => r.pivot);
    const rotMsg = rotations.map(r => `${r.type}(${r.pivot})`).join(', ');
    log(`  insert "${key}"${rotMsg ? ' → ' + rotMsg : ''}`);
    render(pivots, false);   // render with highlights, no auto-fade
    await sleep(650);
  }

  render([]);                // final clean render
  setAVLControls(false);
});

// Clear
document.getElementById('btn-clear').addEventListener('click', () => {
  tree.clear();
  selectedNodeRef = null;
  log('Tree cleared');
  render();
});

document.getElementById('node-value').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-insert').click();
});

// Strip the SVG canvas background colour from the island image, then render
removeImageBackground('Island_node.png', [140, 185, 208], 40).then(url => {
  islandSrc = url;
  render();
});
