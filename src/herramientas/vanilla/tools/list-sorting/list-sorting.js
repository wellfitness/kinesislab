class ListSortingTool {
  constructor() {
    this.animals = [
      { name: 'HORMIGA', size: 1, category: 'animal' },
      { name: 'RATÓN', size: 2, category: 'animal' },
      { name: 'GATO', size: 3, category: 'animal' },
      { name: 'PERRO', size: 4, category: 'animal' },
      { name: 'CABALLO', size: 5, category: 'animal' },
      { name: 'ELEFANTE', size: 6, category: 'animal' },
      { name: 'BALLENA', size: 7, category: 'animal' }
    ];
    this.foods = [
      { name: 'UVA', size: 1, category: 'food' },
      { name: 'FRESA', size: 2, category: 'food' },
      { name: 'LIMÓN', size: 3, category: 'food' },
      { name: 'MANZANA', size: 4, category: 'food' },
      { name: 'PIÑA', size: 5, category: 'food' },
      { name: 'SANDÍA', size: 6, category: 'food' },
      { name: 'CALABAZA', size: 7, category: 'food' }
    ];
    this.level = 1;
    this.itemCount = 3;
    this.speed = 2000;
    this.isPlaying = false;
    this.phase = 'idle';
    this.currentItems = [];
    this.correctOrder = [];
    this.userOrder = [];
    this.nextTapIndex = 0;
    this.hits = 0;
    this.misses = 0;
    this.rounds = 0;
    this.bestSpan = 0;
    this.presentIndex = 0;
    this.timer = null;
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    const btn = document.getElementById('btnPlayPause');
    if (this.isPlaying) {
      btn.classList.add('active');
      document.getElementById('playIcon').textContent = 'pause';
      document.getElementById('playText').textContent = 'PAUSA';
      ScreenWakeLock.request();
      this.startRound();
    } else {
      btn.classList.remove('active');
      document.getElementById('playIcon').textContent = 'play_arrow';
      document.getElementById('playText').textContent = 'REANUDAR';
      ScreenWakeLock.release();
      this.clearTimers();
    }
  }

  changeLevel(val) {
    this.level = parseInt(val, 10);
  }

  changeCount(val) {
    this.itemCount = parseInt(val, 10);
  }

  changeSpeed(ms) {
    this.speed = parseInt(ms, 10);
  }

  clearTimers() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  pickItems() {
    if (this.level === 1) {
      const pool = Math.random() < 0.5 ? [...this.animals] : [...this.foods];
      return this.shuffle(pool).slice(0, this.itemCount);
    }
    const animalCount = Math.max(1, Math.floor(this.itemCount / 2));
    const foodCount = this.itemCount - animalCount;
    const picked = [
      ...this.shuffle([...this.animals]).slice(0, animalCount),
      ...this.shuffle([...this.foods]).slice(0, foodCount)
    ];
    return this.shuffle(picked);
  }

  getCorrectOrder(items) {
    if (this.level === 1) {
      return [...items].sort((a, b) => a.size - b.size);
    }
    const foods = items.filter(i => i.category === 'food').sort((a, b) =>
      this.level === 3 ? b.size - a.size : a.size - b.size
    );
    const animals = items.filter(i => i.category === 'animal').sort((a, b) =>
      this.level === 3 ? b.size - a.size : a.size - b.size
    );
    return [...foods, ...animals];
  }

  startRound() {
    if (!this.isPlaying) return;
    this.currentItems = this.pickItems();
    this.correctOrder = this.getCorrectOrder(this.currentItems);
    this.userOrder = [];
    this.nextTapIndex = 0;
    this.presentIndex = 0;
    this.phase = 'presenting';

    this.setInstruction('Memoriza...');
    this.hideResponseArea();
    document.getElementById('presentZone').style.display = '';
    this.showPresentItem();
  }

  showPresentItem() {
    if (!this.isPlaying || this.phase !== 'presenting') return;

    const el = document.getElementById('presentItem');
    const catEl = document.getElementById('presentCat');
    const counterEl = document.getElementById('presentCounter');

    if (this.presentIndex < this.currentItems.length) {
      const item = this.currentItems[this.presentIndex];
      el.textContent = item.name;
      el.className = 'present-item cat-' + item.category + ' fade-in';
      catEl.textContent = item.category === 'animal' ? 'Animal' : 'Alimento';
      catEl.className = 'present-cat cat-' + item.category;
      counterEl.textContent = (this.presentIndex + 1) + ' / ' + this.currentItems.length;

      el.style.display = '';
      catEl.style.display = '';
      counterEl.style.display = '';

      if (navigator.vibrate) navigator.vibrate(30);

      this.presentIndex++;
      this.timer = setTimeout(() => {
        el.classList.remove('fade-in');
        this.timer = setTimeout(() => this.showPresentItem(), 200);
      }, this.speed - 200);
    } else {
      el.style.display = 'none';
      catEl.style.display = 'none';
      counterEl.style.display = 'none';
      document.getElementById('presentZone').style.display = 'none';
      this.phase = 'responding';
      this.showResponsePhase();
    }
  }

  showResponsePhase() {
    const texts = {
      1: '¡Ordénalos de menor a mayor!',
      2: '¡Alimentos primero, luego animales! (menor a mayor)',
      3: '¡Alimentos primero, luego animales! (mayor a menor)'
    };
    this.setInstruction(texts[this.level]);

    const grid = document.getElementById('responseGrid');
    grid.innerHTML = '';

    const shuffled = this.shuffle([...this.currentItems]);
    shuffled.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'response-btn cat-' + item.category;
      btn.innerHTML = '<span class="rb-name">' + item.name + '</span>' +
        '<span class="rb-cat">' + (item.category === 'animal' ? 'Animal' : 'Alimento') + '</span>';
      btn.onclick = () => this.handleTap(btn, item);
      grid.appendChild(btn);
    });

    document.getElementById('responseArea').style.display = '';
    document.getElementById('userSequence').innerHTML = '';
    document.getElementById('correctSequence').innerHTML = '';
  }

  handleTap(btn, item) {
    if (this.phase !== 'responding' || btn.disabled) return;

    const expected = this.correctOrder[this.nextTapIndex];
    const seqEl = document.getElementById('userSequence');

    if (item.name === expected.name) {
      btn.classList.add('correct');
      btn.disabled = true;

      const tag = document.createElement('span');
      tag.className = 'seq-tag correct';
      tag.textContent = item.name;
      seqEl.appendChild(tag);

      if (navigator.vibrate) navigator.vibrate(30);
      this.nextTapIndex++;

      if (this.nextTapIndex >= this.correctOrder.length) {
        this.hits++;
        this.rounds++;
        if (this.itemCount > this.bestSpan) this.bestSpan = this.itemCount;
        this.updateStats();
        this.phase = 'feedback';
        this.setInstruction('¡Correcto!');
        this.timer = setTimeout(() => this.startRound(), 1500);
      }
    } else {
      btn.classList.add('wrong');
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);

      const tag = document.createElement('span');
      tag.className = 'seq-tag wrong';
      tag.textContent = item.name;
      seqEl.appendChild(tag);

      this.misses++;
      this.rounds++;
      this.updateStats();
      this.phase = 'feedback';
      this.showCorrectOrder();
      this.timer = setTimeout(() => this.startRound(), 3000);
    }
  }

  showCorrectOrder() {
    this.setInstruction('Orden correcto:');
    const el = document.getElementById('correctSequence');
    el.innerHTML = '';
    this.correctOrder.forEach(item => {
      const tag = document.createElement('span');
      tag.className = 'seq-tag hint cat-' + item.category;
      tag.textContent = item.name;
      el.appendChild(tag);
    });
  }

  hideResponseArea() {
    document.getElementById('responseArea').style.display = 'none';
    document.getElementById('userSequence').innerHTML = '';
    document.getElementById('correctSequence').innerHTML = '';
  }

  setInstruction(text) {
    document.getElementById('instruction').textContent = text;
  }

  updateStats() {
    document.getElementById('statHits').textContent = this.hits;
    document.getElementById('statMisses').textContent = this.misses;
    document.getElementById('statTotal').textContent = this.rounds;
    document.getElementById('statBest').textContent = this.bestSpan;
  }
}

const tool = new ListSortingTool();
