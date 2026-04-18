const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Load an image and return a data-URL with the background made transparent.
// Uses flood-fill from all border pixels so only connected background is removed,
// leaving interior pixels (e.g. island water) untouched.
function removeImageBackground(src, bgRgb, tolerance = 50) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      const w = canvas.width, h = canvas.height;
      const [tr, tg, tb] = bgRgb;

      const visited = new Uint8Array(w * h);
      // Queue stores flat pixel indices
      const queue = [];

      const enqueue = (x, y) => {
        const idx = y * w + x;
        if (visited[idx]) return;
        visited[idx] = 1;
        const pi = idx * 4;
        const dist = Math.sqrt(
          (d[pi] - tr) ** 2 + (d[pi + 1] - tg) ** 2 + (d[pi + 2] - tb) ** 2
        );
        if (dist < tolerance) queue.push(idx);
      };

      // Seed from every border pixel
      for (let x = 0; x < w; x++) { enqueue(x, 0); enqueue(x, h - 1); }
      for (let y = 1; y < h - 1; y++) { enqueue(0, y); enqueue(w - 1, y); }

      // BFS — only spreads through pixels close to the background colour
      while (queue.length) {
        const idx = queue.pop();
        const pi = idx * 4;
        d[pi + 3] = 0; // make transparent
        const x = idx % w, y = Math.floor(idx / w);
        if (x > 0)     enqueue(x - 1, y);
        if (x < w - 1) enqueue(x + 1, y);
        if (y > 0)     enqueue(x, y - 1);
        if (y < h - 1) enqueue(x, y + 1);
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL());
    };
    img.src = src;
  });
}

// Generate `size` unique random keys of the given type ('number' or 'letter').
// Numbers: random integers 1–999.
// Letters: random chars from a–z / A–Z (max 52 unique values).
function generateRandomKeys(size, type) {
  const pool = new Set();
  const max = type === 'letter' ? Math.min(size, LETTERS.length) : size;

  while (pool.size < max) {
    if (type === 'letter') {
      pool.add(LETTERS[Math.floor(Math.random() * LETTERS.length)]);
    } else {
      pool.add(Math.floor(Math.random() * 999) + 1);
    }
  }

  return [...pool];
}

// Parse a single user-typed key: integer string → Number, single letter → string, else null.
function parseKey(raw) {
  const s = raw.trim();
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^[a-zA-Z]$/.test(s)) return s;
  return null;
}
