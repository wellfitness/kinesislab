class MazeTool {
  constructor() {
    this.interval = null;
    this.isPlaying = false;
    this.currentSpeed = 4000;
  }
  togglePlay() {
    this.isPlaying = !this.isPlaying;
    const btn = document.getElementById('btnPlayPause');
    if (this.isPlaying) {
      btn.classList.add('active');
      document.getElementById('playIcon').textContent = 'pause';
      document.getElementById('playText').textContent = 'PAUSE';
      this.startEngine();
    } else {
      btn.classList.remove('active');
      document.getElementById('playIcon').textContent = 'play_arrow';
      document.getElementById('playText').textContent = 'RESUME';
      this.stopEngine();
    }
  }
  startEngine() {
    this.runMaze();
    this.interval = setInterval(() => this.runMaze(), this.currentSpeed * 2);
  }
  stopEngine() {
    if (this.interval) clearInterval(this.interval);
  }
  changeSpeed(ms) {
    this.currentSpeed = parseInt(ms, 10);
    if (this.isPlaying) { this.stopEngine(); this.startEngine(); }
  }

  runMaze() {
    const canvas = document.getElementById('mazeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Size and DPI sync
    const size = window.innerWidth * 0.9 < 800 ? window.innerWidth * 0.9 : 800;
    canvas.width = size;
    canvas.height = size;

    const diff = document.getElementById('diffSelect') ? document.getElementById('diffSelect').value : 'medio';
    let cols = 10;
    if(diff === 'dificil') cols = 15;
    else if(diff === 'facil') cols = 6;
    
    const rows = cols;
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;
    
    const grid = [];
    for(let r=0; r<rows; r++) {
      for(let c=0; c<cols; c++) {
        grid.push({ r, c, walls: [true, true, true, true], visited: false });
      }
    }
    const index = (r, c) => (r<0 || c<0 || r>=rows || c>=cols) ? -1 : c + r*cols;
    
    let current = grid[0];
    current.visited = true;
    const stack = [];
    
    while(true) {
        let n = [];
        let t = index(current.r-1, current.c); if(t!==-1 && !grid[t].visited) n.push({i:t, w:0});
        let r = index(current.r, current.c+1); if(r!==-1 && !grid[r].visited) n.push({i:r, w:1});
        let b = index(current.r+1, current.c); if(b!==-1 && !grid[b].visited) n.push({i:b, w:2});
        let l = index(current.r, current.c-1); if(l!==-1 && !grid[l].visited) n.push({i:l, w:3});
        
        if(n.length > 0) {
            let nextN = n[Math.floor(Math.random() * n.length)];
            let next = grid[nextN.i];
            current.walls[nextN.w] = false;
            next.walls[(nextN.w + 2) % 4] = false;
            next.visited = true;
            stack.push(current);
            current = next;
        } else if (stack.length > 0) {
            current = stack.pop();
        } else {
            break;
        }
    }
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = Math.max(4, cellW * 0.1);
    ctx.lineCap = 'round';
    
    for(let i=0; i<grid.length; i++) {
       let cell = grid[i];
       let x = cell.c * cellW;
       let y = cell.r * cellH;
       ctx.beginPath();
       if(cell.walls[0]) { ctx.moveTo(x,y); ctx.lineTo(x+cellW, y); }
       if(cell.walls[1]) { ctx.moveTo(x+cellW,y); ctx.lineTo(x+cellW, y+cellH); }
       if(cell.walls[2]) { ctx.moveTo(x+cellW,y+cellH); ctx.lineTo(x, y+cellH); }
       if(cell.walls[3]) { ctx.moveTo(x,y+cellH); ctx.lineTo(x, y); }
       ctx.stroke();
    }
    // Start / End points
    ctx.fillStyle = '#10b981';
    ctx.beginPath(); ctx.arc(cellW/2, cellH/2, cellW*0.25, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#e11d48';
    ctx.beginPath(); ctx.arc(canvas.width - cellW/2, canvas.height - cellH/2, cellW*0.25, 0, Math.PI*2); ctx.fill();
  }
}
const tool = new MazeTool();
