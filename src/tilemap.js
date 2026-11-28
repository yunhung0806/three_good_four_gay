/* The town is drawn from tiles. Terrain and collision share the same grid. */
(function (root) {
  const cols = 48, rows = 27, tile = 32;
  const width = cols * tile, height = rows * tile;
  const ground = Array.from({ length: rows }, () => Array(cols).fill('grass'));
  const solid = Array.from({ length: rows }, () => Array(cols).fill(false));
  const buildings = [
    { x: 8, y: 3, w: 11, h: 6, kind: 'cafe', roof: '#aa5358', roofDark: '#713d47', roofLight: '#df8c79', awning: '#ba5059', wall: '#edc99f' },
    { x: 28, y: 2, w: 13, h: 7, kind: 'school', roof: '#58718e', roofDark: '#354d69', roofLight: '#8ca6b7', wall: '#e9ddbd' },
    { x: 38, y: 12, w: 8, h: 6, kind: 'bakery', roof: '#bf7449', roofDark: '#865340', roofLight: '#ecaa6e', awning: '#d68b46', wall: '#f0d3a8' },
    { x: 7, y: 18, w: 10, h: 6, kind: 'shop', roof: '#528d76', roofDark: '#356655', roofLight: '#8bbd96', awning: '#4c9974', wall: '#e7d7aa' }
  ];
  const trees = [[3,3],[5,5],[3,9],[19,3],[22,6],[26,4],[44,5],[46,10],[4,17],[8,15],[16,15],[32,13],[45,19],[6,25],[19,25],[29,25],[45,25]];
  const flowers = [[5,2],[14,2],[20,9],[27,9],[31,10],[36,12],[17,19],[30,23],[43,24],[2,10],[10,16],[20,25],[31,25],[45,7]];
  const lamps = [[7,12],[21,9],[31,12],[46,9],[20,23],[33,23]];
  const cafeTables = [[6,7],[20,8]];
  function paint(kind, x, y, w, h) {
    for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) {
      if (row >= 0 && row < rows && col >= 0 && col < cols) ground[row][col] = kind;
    }
  }
  function block(x, y, w, h) {
    for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) {
      if (row >= 0 && row < rows && col >= 0 && col < cols) solid[row][col] = true;
    }
  }
  paint('path', 4, 10, 44, 2);
  paint('path', 12, 9, 3, 17);
  paint('path', 23, 0, 3, 27);
  paint('path', 34, 8, 3, 15);
  paint('path', 4, 20, 44, 3);
  paint('path', 17, 21, 2, 4);
  paint('path', 12, 24, 7, 2);
  paint('path', 39, 17, 3, 9);
  paint('path', 35, 18, 10, 8);
  paint('water', 0, 14, 5, 13);
  paint('water', 18, 13, 13, 6);
  paint('bridge', 23, 13, 3, 6);
  paint('plaza', 35, 19, 10, 6);
  paint('path', 34, 20, 3, 3);
  for (const b of buildings) block(b.x, b.y, b.w, b.h);
  for (const [x, y] of trees) block(x, y, 1, 1);
  for (const [x, y] of [...lamps, ...cafeTables]) block(x, y, 1, 1);
  block(39, 21, 2, 2); // basin footprint only; surrounding plaza stays walkable
  block(37, 19, 2, 1); block(42, 19, 2, 1); // benches
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (ground[y][x] === 'water') solid[y][x] = true;

  const rect = (ctx, color, x, y, w, h) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  function polygon(ctx, color, points) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
  }
  function drawWindow(ctx, x, y, w, h, frame = '#665449') {
    rect(ctx, frame, x - 4, y - 4, w + 8, h + 8);
    rect(ctx, '#9bc9ca', x, y, w, h);
    rect(ctx, '#d8eee1', x + 4, y + 3, 5, Math.max(7, h - 12));
    rect(ctx, '#eee2bd', x + Math.floor(w / 2) - 2, y, 4, h);
    rect(ctx, '#eee2bd', x, y + Math.floor(h / 2), w, 3);
  }
  function drawBuilding(ctx, b) {
    const x = b.x * tile, y = b.y * tile, w = b.w * tile, h = b.h * tile;
    rect(ctx, '#4e684f', x - 8, y + h - 2, w + 18, 11);
    if (b.kind === 'cafe') drawCafeBuilding(ctx, x, y, w, h, b);
    if (b.kind === 'school') drawSchoolBuilding(ctx, x, y, w, h, b);
    if (b.kind === 'bakery') drawBakeryBuilding(ctx, x, y, w, h, b);
    if (b.kind === 'shop') drawShopBuilding(ctx, x, y, w, h, b);
  }
  function drawDoor(ctx, cx, bottom, color = '#9b694d') {
    rect(ctx, '#51413d', cx - 21, bottom - 55, 42, 55);
    rect(ctx, color, cx - 16, bottom - 50, 32, 50);
    rect(ctx, '#d4a576', cx - 11, bottom - 45, 22, 35);
    rect(ctx, '#f4d58b', cx + 9, bottom - 22, 4, 4);
    rect(ctx, '#d7bb8b', cx - 24, bottom - 2, 48, 5);
  }
  function drawAwning(ctx, x, y, w, color, height = 17) {
    rect(ctx, '#57483f', x - 3, y - 6, w + 6, 8);
    rect(ctx, '#f6e8bd', x, y, w, height);
    for (let xx = x; xx < x + w; xx += 24) rect(ctx, color, xx, y, Math.min(12, x + w - xx), height);
    rect(ctx, '#5e4b42', x, y + height, w, 3);
  }
  function drawCafeBuilding(ctx, x, y, w, h, b) {
    // Flat parapet and a full-width shopfront give the café its street-corner shape.
    rect(ctx, '#68483f', x + 5, y + 16, w - 10, h - 16);
    rect(ctx, b.wall, x + 11, y + 22, w - 22, h - 27);
    rect(ctx, b.roofDark, x + 1, y + 2, w - 2, 24);
    rect(ctx, b.roof, x + 7, y + 8, w - 14, 20);
    rect(ctx, b.roofLight, x + 7, y + 8, w - 14, 4);
    for (const dx of [4, w - 24]) rect(ctx, b.roofDark, x + dx, y - 4, 20, 34);
    rect(ctx, '#cf9b75', x + 10, y + 105, w - 20, 7);
    for (const dx of [22, w - 35]) rect(ctx, '#ad735d', x + dx, y + 30, 13, h - 35);
    for (const dx of [42, 104, 166, 228]) drawWindow(ctx, x + dx, y + 57, 32, 36, '#875c4e');
    drawAwning(ctx, x + 17, y + h - 86, w - 34, b.awning);
    drawDoor(ctx, x + w / 2, y + h);
    drawCafeDetails(ctx, x, y, w, h);
    for (const dx of [25, w - 47]) {
      rect(ctx, '#76503d', x + dx, y + h - 25, 28, 7);
      rect(ctx, '#427b52', x + dx + 4, y + h - 35, 20, 12);
      rect(ctx, '#efb9aa', x + dx + 7, y + h - 37, 5, 6);
      rect(ctx, '#f5d27f', x + dx + 17, y + h - 39, 5, 7);
    }
  }
  function drawSchoolBuilding(ctx, x, y, w, h, b) {
    // A wide, symmetrical two-storey façade has a central clock tower and portico.
    rect(ctx, '#647180', x + 4, y + 34, w - 8, h - 34);
    rect(ctx, b.wall, x + 11, y + 39, w - 22, h - 46);
    polygon(ctx, b.roofDark, [[x - 3, y + 44], [x + 42, y + 4], [x + w - 42, y + 4], [x + w + 3, y + 44]]);
    polygon(ctx, b.roof, [[x + 9, y + 38], [x + 47, y + 11], [x + w - 47, y + 11], [x + w - 9, y + 38]]);
    rect(ctx, b.roofLight, x + 44, y + 9, w - 88, 5);
    rect(ctx, b.roofDark, x - 5, y + 42, w + 10, 8);
    rect(ctx, '#b9ac91', x + 11, y + 103, w - 22, 8);
    rect(ctx, '#f7eacd', x + 11, y + 107, w - 22, 3);
    for (const yy of [y + 64, y + 126]) for (const dx of [31, 87, 143, w - 174, w - 118, w - 62]) {
      drawWindow(ctx, x + dx, yy, 28, 33, '#817463');
    }
    drawSchoolDetails(ctx, x, y, w, h);
  }
  function drawBakeryBuilding(ctx, x, y, w, h, b) {
    // Small timber-framed bakery with a steep gable and working chimney.
    rect(ctx, '#795845', x + 12, y + 40, w - 24, h - 40);
    rect(ctx, b.wall, x + 18, y + 47, w - 36, h - 54);
    rect(ctx, '#6f4c43', x + 42, y - 23, 31, 45);
    rect(ctx, '#d49f70', x + 47, y - 20, 21, 39);
    rect(ctx, '#6f4c43', x + 39, y - 25, 37, 6);
    polygon(ctx, b.roofDark, [[x - 5, y + 66], [x + w / 2, y - 24], [x + w + 5, y + 66]]);
    polygon(ctx, b.roof, [[x + 9, y + 57], [x + w / 2, y - 10], [x + w - 9, y + 57]]);
    for (let i = 0; i < 4; i++) {
      const inset = 31 + i * 24;
      rect(ctx, b.roofLight, x + inset, y + 31 + i * 9, w - inset * 2, 3);
    }
    rect(ctx, '#8a593f', x + 17, y + 64, w - 34, 10);
    for (const dx of [18, w - 28]) rect(ctx, '#8a593f', x + dx, y + 72, 10, h - 78);
    for (const dx of [38, w - 51]) drawWindow(ctx, x + dx, y + 77, 29, 25, '#93664b');
    drawAwning(ctx, x + 17, y + h - 84, w - 34, b.awning, 15);
    drawDoor(ctx, x + w / 2, y + h, '#ad7950');
    drawBakeryDetails(ctx, x, y, w, h);
  }
  function drawShopBuilding(ctx, x, y, w, h, b) {
    // Low market storefront: broad fascia, timber posts, deep canopy and open displays.
    rect(ctx, '#6c5847', x + 7, y + 25, w - 14, h - 25);
    rect(ctx, b.wall, x + 14, y + 31, w - 28, h - 38);
    for (let xx = x + 27; xx < x + w - 20; xx += 26) rect(ctx, '#c8ae7e', xx, y + 41, 3, 39);
    rect(ctx, b.roofDark, x + 2, y + 13, w - 4, 20);
    rect(ctx, b.roof, x + 9, y + 2, w - 18, 25);
    rect(ctx, b.roofLight, x + 11, y + 3, w - 22, 5);
    rect(ctx, '#6a503e', x + 17, y + 73, w - 34, 7);
    drawAwning(ctx, x + 8, y + 80, w - 16, b.awning, 28);
    for (const dx of [12, w - 22]) rect(ctx, '#735641', x + dx, y + 105, 10, h - 110);
    drawDoor(ctx, x + w / 2, y + h, '#8a674e');
    drawShopDetails(ctx, x, y, w, h);
  }
  function drawNameplate(ctx, text, x, y, w, color) {
    rect(ctx, '#4e423d', x - 3, y - 3, w + 6, 30);
    rect(ctx, color, x, y, w, 24);
    rect(ctx, '#f5d9a4', x + 4, y + 3, w - 8, 2);
    ctx.save();
    ctx.fillStyle = '#fff8df';
    ctx.font = 'bold 18px "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + 14);
    ctx.restore();
  }
  function drawCafeDetails(ctx, x, y, w, h) {
    drawNameplate(ctx, '微光咖啡', x + w / 2 - 70, y + 8, 140, '#87464d');
    // A cup on the hanging sign remains visible even when the player is nearby.
    const sx = x + w - 64, sy = y + 48;
    rect(ctx, '#5f433f', sx + 13, sy - 8, 3, 10);
    rect(ctx, '#70443e', sx, sy, 44, 45);
    rect(ctx, '#f4d9a7', sx + 3, sy + 3, 38, 39);
    rect(ctx, '#a65c51', sx + 10, sy + 17, 20, 12);
    rect(ctx, '#a65c51', sx + 28, sy + 19, 6, 8);
    rect(ctx, '#a65c51', sx + 12, sy + 30, 20, 3);
    for (const dx of [14, 23]) rect(ctx, '#a65c51', sx + dx, sy + 10, 3, 5);
    for (const dx of [29, w - 88]) {
      rect(ctx, '#6b4e45', x + dx, y + h - 67, 58, 58);
      rect(ctx, '#9fd4d0', x + dx + 4, y + h - 63, 50, 46);
      rect(ctx, '#f3dfc3', x + dx + 25, y + h - 63, 4, 46);
      rect(ctx, '#d5aa7c', x + dx + 1, y + h - 17, 56, 5);
    }
  }
  function drawSchoolDetails(ctx, x, y, w, h) {
    const cx = x + w / 2;
    // Bell tower, clock face, and entrance columns distinguish the school.
    rect(ctx, '#637b89', cx - 34, y - 17, 68, 27);
    rect(ctx, '#e9ddbd', cx - 29, y - 13, 58, 31);
    rect(ctx, '#354d69', cx - 37, y - 20, 74, 7);
    rect(ctx, '#8ca6b7', cx - 22, y - 27, 44, 7);
    rect(ctx, '#354d69', cx - 3, y - 37, 6, 10);
    ctx.save();
    ctx.fillStyle = '#f6efd6';
    ctx.strokeStyle = '#354d69';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, y + 2, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    rect(ctx, '#354d69', cx - 1, y - 6, 2, 9);
    rect(ctx, '#354d69', cx, y + 1, 7, 2);
    drawNameplate(ctx, '小鎮學校', cx - 80, y + 47, 160, '#435e76');
    for (const dx of [-65, 49]) {
      rect(ctx, '#b4a586', cx + dx, y + h - 82, 16, 82);
      rect(ctx, '#f7eacf', cx + dx + 3, y + h - 78, 10, 74);
      rect(ctx, '#778d9c', cx + dx - 4, y + h - 84, 24, 7);
    }
    rect(ctx, '#42566c', cx - 33, y + h - 61, 66, 61);
    rect(ctx, '#9bc8c8', cx - 28, y + h - 57, 26, 51);
    rect(ctx, '#9bc8c8', cx + 2, y + h - 57, 26, 51);
    rect(ctx, '#d8e8d7', cx - 23, y + h - 52, 8, 22);
    rect(ctx, '#d8e8d7', cx + 7, y + h - 52, 8, 22);
    rect(ctx, '#f1d28e', cx - 7, y + h - 27, 4, 4);
    rect(ctx, '#f1d28e', cx + 3, y + h - 27, 4, 4);
  }
  function drawBakeryDetails(ctx, x, y, w, h) {
    drawNameplate(ctx, '麵包坊', x + w / 2 - 62, y + 72, 124, '#9d5e3e');
    const sx = x + w - 57, sy = y + 49;
    rect(ctx, '#6f4d3d', sx, sy, 42, 43);
    rect(ctx, '#f9e7bf', sx + 3, sy + 3, 36, 37);
    rect(ctx, '#c17a42', sx + 8, sy + 22, 26, 10);
    rect(ctx, '#e8a45e', sx + 12, sy + 15, 18, 12);
    for (const dx of [15, 22]) rect(ctx, '#fff0ca', sx + dx, sy + 19, 2, 6);
    for (const dx of [22, w - 85]) {
      rect(ctx, '#805644', x + dx, y + h - 69, 58, 59);
      rect(ctx, '#aed4ce', x + dx + 4, y + h - 65, 50, 46);
      rect(ctx, '#a97044', x + dx + 5, y + h - 28, 48, 5);
      for (const bx of [9, 25, 41]) {
        rect(ctx, '#b66e3f', x + dx + bx, y + h - 26, 12, 8);
        rect(ctx, '#e9a75f', x + dx + bx + 2, y + h - 29, 8, 8);
        rect(ctx, '#fff0c6', x + dx + bx + 4, y + h - 28, 2, 4);
      }
    }
  }
  function drawShopDetails(ctx, x, y, w, h) {
    drawNameplate(ctx, '雜貨店', x + w / 2 - 62, y + 8, 124, '#477d61');
    for (const dx of [22, w - 81]) {
      rect(ctx, '#665141', x + dx, y + h - 72, 60, 55);
      rect(ctx, '#a8d3c8', x + dx + 4, y + h - 68, 52, 46);
      rect(ctx, '#608866', x + dx + 5, y + h - 29, 50, 8);
      for (let i = 0; i < 3; i++) {
        rect(ctx, ['#e5a343', '#cf5f4b', '#76a65a'][i], x + dx + 8 + i * 15, y + h - 39, 12, 12);
        rect(ctx, '#4c8153', x + dx + 12 + i * 15, y + h - 42, 4, 4);
      }
      rect(ctx, '#8a6344', x + dx + 3, y + h - 17, 56, 15);
      rect(ctx, '#b28656', x + dx + 6, y + h - 14, 50, 9);
    }
    const sx = x + w - 62, sy = y + 49;
    rect(ctx, '#3f6c56', sx, sy, 43, 43);
    rect(ctx, '#e7e3b9', sx + 3, sy + 3, 37, 37);
    rect(ctx, '#af7850', sx + 8, sy + 26, 27, 8);
    for (const dx of [12, 22, 30]) {
      rect(ctx, '#6ea354', sx + dx, sy + 15, 8, 13);
      rect(ctx, '#a9c974', sx + dx + 2, sy + 13, 4, 6);
    }
  }
  function drawTree(ctx, tx, ty) {
    const x = tx * tile, y = ty * tile;
    rect(ctx, '#497a54', x + 3, y + 26, 27, 5);
    rect(ctx, '#674a36', x + 13, y + 16, 7, 15);
    rect(ctx, '#245f49', x + 2, y + 11, 28, 16);
    rect(ctx, '#317b54', x + 5, y + 5, 23, 19);
    rect(ctx, '#4f9c62', x + 8, y + 2, 17, 16);
    rect(ctx, '#9acb78', x + 10, y + 5, 9, 5);
    rect(ctx, '#77b66b', x + 20, y + 14, 5, 4);
  }
  function drawFountain(ctx) {
    const x = 39 * tile, y = 21 * tile;
    rect(ctx, '#a29d84', x, y + 46, 64, 15);
    rect(ctx, '#e7dcc0', x + 3, y + 37, 58, 20);
    rect(ctx, '#4d9bb1', x + 8, y + 40, 48, 12);
    rect(ctx, '#91d9d9', x + 12, y + 42, 14, 3);
    rect(ctx, '#91d9d9', x + 40, y + 46, 12, 3);
    rect(ctx, '#f7ebd0', x + 24, y + 27, 16, 16);
    rect(ctx, '#c7b99a', x + 27, y + 15, 10, 20);
    rect(ctx, '#8fd8dc', x + 30, y + 2, 4, 23);
    rect(ctx, '#d1f0df', x + 26, y + 12, 12, 3);
  }
  function drawLamp(ctx, tx, ty) {
    const x = tx * tile, y = ty * tile;
    rect(ctx, '#4f6a51', x + 9, y + 27, 16, 4);
    rect(ctx, '#3f5051', x + 14, y + 7, 5, 22);
    rect(ctx, '#f6d890', x + 10, y + 3, 13, 12);
    rect(ctx, '#eaf0c4', x + 13, y + 5, 7, 7);
    rect(ctx, '#40535a', x + 8, y + 2, 17, 4);
    rect(ctx, '#40535a', x + 10, y + 15, 13, 3);
  }
  function drawTable(ctx, tx, ty) {
    const x = tx * tile, y = ty * tile;
    rect(ctx, '#598658', x + 2, y + 24, 28, 5);
    rect(ctx, '#6f5043', x + 3, y + 12, 5, 13);
    rect(ctx, '#6f5043', x + 24, y + 12, 5, 13);
    rect(ctx, '#f5ddaa', x + 8, y + 6, 17, 15);
    rect(ctx, '#cb685d', x + 10, y + 5, 13, 13);
    rect(ctx, '#f5ddaa', x + 15, y + 3, 3, 17);
  }
  function drawTerrain(ctx) {
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const type = ground[y][x], px = x * tile, py = y * tile, seed = (x * 37 + y * 53) % 17;
      if (type === 'grass') {
        rect(ctx, ['#7fbd77','#82c17a','#76b771','#88c57d'][seed % 4], px, py, tile, tile);
        if (seed % 3 === 0) {
          rect(ctx, '#5e9d66', px + 6, py + 18, 3, 6);
          rect(ctx, '#a8d391', px + 9, py + 17, 3, 4);
        }
        if (seed % 5 === 0) rect(ctx, '#add48f', px + 22, py + 9, 5, 3);
      } else if (type === 'path' || type === 'plaza') {
        rect(ctx, type === 'path' ? '#d9b982' : '#d8c69f', px, py, tile, tile);
        rect(ctx, type === 'path' ? '#e8ca91' : '#e8d8b8', px, py + 2, tile, 2);
        if (type === 'path') {
          if (x === 0 || !['path','plaza','bridge'].includes(ground[y][x - 1])) rect(ctx, '#f3dfa8', px, py, 4, tile);
          if (x === cols - 1 || !['path','plaza','bridge'].includes(ground[y][x + 1])) rect(ctx, '#b99464', px + tile - 3, py, 3, tile);
          if (y === 0 || !['path','plaza','bridge'].includes(ground[y - 1][x])) rect(ctx, '#f3dfa8', px, py, tile, 3);
          if (y === rows - 1 || !['path','plaza','bridge'].includes(ground[y + 1][x])) rect(ctx, '#b99464', px, py + tile - 3, tile, 3);
          if (seed % 3 === 0) rect(ctx, '#c59d69', px + 9, py + 20, 7, 3);
        } else {
          rect(ctx, '#c6b38f', px + 16, py, 2, tile);
          rect(ctx, '#eee0c0', px + 3, py + 15, 26, 2);
          if (seed % 4 === 0) rect(ctx, '#f4e8c9', px + 21, py + 6, 4, 3);
        }
      } else if (type === 'water') {
        rect(ctx, seed % 3 ? '#438fb1' : '#3886a9', px, py, tile, tile);
        rect(ctx, '#67b9c8', px + 5, py + 8, 14, 3);
        rect(ctx, '#2e799f', px + 15, py + 25, 12, 3);
        if (seed % 8 === 0) {
          rect(ctx, '#5f9d66', px + 16, py + 14, 12, 5);
          rect(ctx, '#e8b4c1', px + 19, py + 10, 5, 5);
        }
        if (x > 0 && !['water','bridge'].includes(ground[y][x - 1])) rect(ctx, '#9cbf98', px, py, 4, tile);
        if (x < cols - 1 && !['water','bridge'].includes(ground[y][x + 1])) rect(ctx, '#9cbf98', px + 28, py, 4, tile);
        if (y > 0 && !['water','bridge'].includes(ground[y - 1][x])) rect(ctx, '#add0a0', px, py, tile, 4);
        if (y < rows - 1 && !['water','bridge'].includes(ground[y + 1][x])) rect(ctx, '#8cae8c', px, py + 28, tile, 4);
      } else {
        rect(ctx, '#795b46', px, py, tile, tile);
        rect(ctx, '#bd8e61', px + 3, py + 2, tile - 6, tile - 5);
        for (let yy = 6; yy < tile; yy += 9) {
          rect(ctx, '#e8ba7c', px + 2, py + yy, tile - 4, 3);
          rect(ctx, '#6c5140', px + 7, py + yy + 4, 3, 3);
        }
      }
    }
    for (const edgeX of [23 * tile + 2, 26 * tile - 7]) {
      rect(ctx, '#6e513f', edgeX, 13 * tile, 5, 6 * tile);
      for (let y = 13; y < 19; y++) {
        rect(ctx, '#e7b97c', edgeX - 2, y * tile + 4, 9, 10);
        rect(ctx, '#78533f', edgeX - 2, y * tile + 14, 9, 3);
      }
    }
    for (const b of buildings) drawBuilding(ctx, b);
    for (const [x, y] of trees) drawTree(ctx, x, y);
    for (const [x, y] of flowers) {
      const px=x*tile,py=y*tile;
      rect(ctx, '#397f61', px + 6, py + 18, 20, 7);
      rect(ctx, '#f6d5b2', px + 7, py + 10, 7, 7);
      rect(ctx, '#e89db4', px + 17, py + 8, 8, 8);
      rect(ctx, '#f5e5ad', px + 10, py + 12, 3, 3);
      rect(ctx, '#f5e5ad', px + 20, py + 10, 3, 3);
    }
    for (const [x,y] of lamps) drawLamp(ctx,x,y);
    for (const [x,y] of cafeTables) drawTable(ctx,x,y);
    for (const x of [37, 42]) {
      rect(ctx, '#684a3a', x * tile, 19 * tile + 10, 55, 16);
      rect(ctx, '#c18b5d', x * tile + 3, 19 * tile + 6, 49, 12);
      rect(ctx, '#efc389', x * tile + 6, 19 * tile + 8, 43, 3);
      rect(ctx, '#664b3c', x * tile + 7, 19 * tile + 25, 5, 7);
      rect(ctx, '#664b3c', x * tile + 44, 19 * tile + 25, 5, 7);
    }
    for (let x = 35; x < 45; x += 2) {
      rect(ctx, '#43855f', x * tile + 8, 24 * tile + 18, 18, 9);
      rect(ctx, '#f3c7bc', x * tile + 11, 24 * tile + 14, 5, 6);
      rect(ctx, '#f5d18d', x * tile + 21, 24 * tile + 13, 4, 6);
    }
    drawFountain(ctx);
  }
  let terrainCanvas;
  function getTerrain() {
    if (!terrainCanvas && typeof document !== 'undefined') {
      terrainCanvas = document.createElement('canvas');
      terrainCanvas.width = width; terrainCanvas.height = height;
      const ctx = terrainCanvas.getContext?.('2d');
      if (ctx) drawTerrain(ctx);
    }
    return terrainCanvas;
  }
  function drawActor(ctx, x, y, direction, frame) {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y));
    const walking = frame >= 0, stride = walking && Math.floor(frame) % 2 ? 3 : 0;
    rect(ctx, '#416b54aa', -10, -3, 20, 5);
    rect(ctx, '#293b58', -8, -11 - stride, 6, 11 + stride);
    rect(ctx, '#293b58', 2, -11 + stride, 6, 11 - stride);
    rect(ctx, '#e6d4a5', -10, -27, 20, 17);
    rect(ctx, '#385978', -10, -15, 20, 6);
    rect(ctx, '#efc49d', -13, -25 + stride, 4, 12);
    rect(ctx, '#efc49d', 9, -25 - stride, 4, 12);
    rect(ctx, '#efc49d', -9, -39, 18, 15);
    rect(ctx, '#28374d', -10, -42, 20, 7);
    if (direction === 'up') rect(ctx, '#28374d', -10, -37, 20, 9);
    else if (direction === 'left' || direction === 'right') rect(ctx, '#28374d', direction === 'left' ? -10 : 6, -34, 4, 5);
    else { rect(ctx, '#28374d', -5, -31, 3, 3); rect(ctx, '#28374d', 3, -31, 3, 3); }
    ctx.restore();
  }
  function cameraFor(viewWidth, viewHeight, playerX, playerY) {
    const scale = Math.max(viewWidth / (30 * tile), viewHeight / (16 * tile));
    const visibleWidth = viewWidth / scale;
    const visibleHeight = viewHeight / scale;
    const x = Math.min(width - visibleWidth, Math.max(0, Math.round(playerX * width / 100 - visibleWidth / 2)));
    const y = Math.min(height - visibleHeight, Math.max(0, Math.round(playerY * height / 100 - visibleHeight / 2)));
    return { x, y, width: visibleWidth, height: visibleHeight, scale };
  }

  function screenPoint(camera, xPercent, yPercent) {
    return {
      x: (xPercent * width / 100 - camera.x) * camera.scale,
      y: (yPercent * height / 100 - camera.y) * camera.scale
    };
  }

  function draw(canvas, camera, xPercent, yPercent, direction, frame) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const terrain = getTerrain();
    ctx.drawImage(terrain, camera.x, camera.y, camera.width, camera.height, 0, 0, canvas.width, canvas.height);
    const actor = screenPoint(camera, xPercent, yPercent);
    ctx.save();
    ctx.translate(Math.round(actor.x), Math.round(actor.y));
    ctx.scale(camera.scale, camera.scale);
    drawActor(ctx, 0, 0, direction, frame);
    ctx.restore();
  }
  function drawMinimap(canvas, xPercent, yPercent, direction) {
    const ctx = canvas.getContext?.('2d');
    if (!ctx) return;
    const center = canvas.width / 2;
    const scale = canvas.width / (12 * tile);
    const x = xPercent * width / 100;
    const y = yPercent * height / 100;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#283c32';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(getTerrain(), Math.round(center - x * scale), Math.round(center - y * scale), width * scale, height * scale);

    ctx.save();
    ctx.translate(center, center);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#18251e';
    ctx.fillStyle = '#fff3cd';
    ctx.beginPath();
    if (direction) {
      ctx.rotate({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[direction]);
      ctx.moveTo(0, -12);
      ctx.lineTo(9, 8);
      ctx.lineTo(0, 5);
      ctx.lineTo(-9, 8);
      ctx.closePath();
    } else {
      ctx.arc(0, 0, 7, 0, 2 * Math.PI);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawOverview(canvas) {
    const ctx = canvas.getContext?.('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(getTerrain(), 0, 0, canvas.width, canvas.height);
  }

  function canWalk(xPercent, yPercent) {
    const px = xPercent * width / 100, py = yPercent * height / 100;
    for (const ox of [-6, 6]) for (const oy of [-5, 0]) {
      const x = Math.floor((px + ox) / tile), y = Math.floor((py + oy) / tile);
      if (x < 0 || y < 0 || x >= cols || y >= rows || solid[y][x]) return false;
    }
    return true;
  }
  function move(xPercent, yPercent, dx, dy, seconds) {
    const magnitude = Math.hypot(dx, dy) || 1;
    const distance = 118 * Math.min(seconds, 0.05) / magnitude;
    const nextX = xPercent + dx * distance / width * 100;
    const nextY = yPercent + dy * distance / height * 100;
    if (canWalk(nextX, yPercent)) xPercent = nextX;
    if (canWalk(xPercent, nextY)) yPercent = nextY;
    return [xPercent, yPercent];
  }
  root.LUMINA_TILEMAP = { cols, rows, tile, width, height, ground, solid, buildings, canWalk, move, cameraFor, screenPoint, draw, drawMinimap, drawOverview };
})(typeof window === 'undefined' ? globalThis : window);
