# Visualization of AVL Tree & Heap

A browser-based visualization of two classic data structures — an AVL tree and a binary heap — built with vanilla JavaScript and D3.js.

## What's what

**AVL Tree** — a self-balancing binary search tree. Every time you insert or delete a node, the tree automatically rotates to keep itself balanced so lookups stay fast. The operation log shows which rotations happened and where.

**Binary Heap** — an array-backed tree where the largest (max-heap) or smallest (min-heap) value is always at the root. Inserting bubbles the new value up; deleting pulls the last element into the gap and sifts it into place. The array strip at the bottom shows the raw index layout.

## How to run

No build step, no dependencies to install. Just open `index.html` in a browser.

```
open index.html
```

Or drag the file into any browser window. Everything runs locally.

## Controls

- Type a number or single letter into the input and hit **Insert** (or press Enter)
- Click any node on the canvas to select it, then hit **Delete** to remove it
- **Extract Root** removes the top of the heap
- **Generate** builds a random tree or heap of a given size with a step-by-step animation
- **Mode: Max/Min-Heap** toggles the heap ordering and rebuilds in place
- **Clear** wipes the canvas

## Made With/References

Images made with Google Gemini 3
Coding assisted by Claude Sonnet 4.6
Tutorials used - https://www.tutorialspoint.com/article/AVL-Tree-class-in-Javascript
                 https://www.geeksforgeeks.org/javascript/min-heap-in-javascript/