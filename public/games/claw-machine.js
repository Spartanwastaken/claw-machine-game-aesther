// Claw Machine Game - Adapted from Ma5a's CodePen
// https://codepen.io/Ma5a/pen/YPzzpep

// Global variable to hold custom prizes
let clawMachinePrizes = [];

// Random color presets for the claw machine
const clawMachinePresets = [
  { name: 'Ocean', bg: '#1a1a2e', machine: '#32c2db', claw: '#f1c40f', button: '#3498db', wrapper: '#84dfe2' },
  { name: 'Sunset', bg: '#2c1810', machine: '#e74c3c', claw: '#f39c12', button: '#e67e22', wrapper: '#f5b041' },
  { name: 'Forest', bg: '#1a2e1a', machine: '#27ae60', claw: '#2ecc71', button: '#16a085', wrapper: '#82e0aa' },
  { name: 'Galaxy', bg: '#1a1a2e', machine: '#9b59b6', claw: '#e74c3c', button: '#8e44ad', wrapper: '#d7bde2' },
  { name: 'Candy', bg: '#2e1a2e', machine: '#ff6b9d', claw: '#c44569', button: '#f8b500', wrapper: '#ffc0cb' },
  { name: 'Arctic', bg: '#1a2e3e', machine: '#5dade2', claw: '#aed6f1', button: '#3498db', wrapper: '#d4e6f1' },
  { name: 'Lava', bg: '#2e1a1a', machine: '#c0392b', claw: '#f39c12', button: '#e74c3c', wrapper: '#f1948a' },
  { name: 'Toxic', bg: '#1a2e1a', machine: '#00ff41', claw: '#39ff14', button: '#32cd32', wrapper: '#90ee90' },
  { name: 'Royal', bg: '#1a1a3e', machine: '#6c3483', claw: '#f4d03f', button: '#9b59b6', wrapper: '#bb8fce' },
  { name: 'Retro', bg: '#2e2e1a', machine: '#f4d03f', claw: '#e74c3c', button: '#f39c12', wrapper: '#f9e79f' },
  { name: 'Midnight', bg: '#0d0d1a', machine: '#2c3e50', claw: '#ecf0f1', button: '#34495e', wrapper: '#85929e' },
  { name: 'Tropical', bg: '#1a3e2e', machine: '#1abc9c', claw: '#f1c40f', button: '#16a085', wrapper: '#76d7c4' }
];

// Get a random preset
function getRandomClawPreset() {
  return clawMachinePresets[Math.floor(Math.random() * clawMachinePresets.length)];
}

class ClawMachineGame {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('Claw machine container not found');
      return;
    }
    
    this.options = options;
    this.customPrizes = options.prizes || clawMachinePrizes || [];
    
    // Gameplay settings (passed from options or defaults)
    this.gameplaySettings = {
      clawStrength: options.clawStrength || 70,  // 0-100, higher = stronger grip
      dropChance: options.dropChance || 20,       // 0-100, chance to drop while moving
      maxTries: options.maxTries || 0,            // 0 = unlimited
      triesUsed: 0
    };
    
    console.log('Gameplay settings:', this.gameplaySettings);
    
    // Get random color preset
    this.colorPreset = getRandomClawPreset();
    console.log('Using color preset:', this.colorPreset.name);
    
    this.elements = {
      clawMachine: null,
      box: null,
      collectionBox: null,
      collectionArrow: null,
      toys: [],
    };
    
    this.settings = {
      targetToy: null,
      collectedNumber: 0,
    };
    
    this.m = 2;
    // Default toy sizes (used as fallback)
    this.defaultToySize = { w: 40, h: 40 };
    this.toys = {
      bear: { w: 20 * this.m, h: 27 * this.m },
      bunny: { w: 20 * this.m, h: 29 * this.m },
      golem: { w: 20 * this.m, h: 27 * this.m },
      cucumber: { w: 16 * this.m, h: 28 * this.m },
      penguin: { w: 24 * this.m, h: 22 * this.m },
      robot: { w: 20 * this.m, h: 30 * this.m },
    };
    
    this.cornerBuffer = 16;
    this.machineBuffer = { x: 36, y: 16 };
    
    this.init();
  }
  
  init() {
    this.createHTML();
    this.applyColorPreset();
    this.cacheElements();
    this.setupMeasurements();
    this.createToys();
    this.setupControls();
  }
  
  createHTML() {
    this.container.innerHTML = `
      <div class="claw-wrapper">
        <div class="collection-box pix"></div>
        <div class="claw-machine">
          <div class="box pix">
            <div class="machine-top pix">
              <div class="arm-joint pix">
                <div class="arm pix">
                  <div class="claws pix"></div>
                </div>
              </div>
              <div class="rail vert pix"></div>
              <div class="rail hori pix"></div>
            </div>
            <div class="machine-bottom pix">
              <div class="collection-point pix"></div>
            </div>
          </div>
          <div class="control pix">
            <div class="cover left"></div>
            <button class="hori-btn pix"></button>
            <button class="vert-btn pix"></button>
            <div class="cover right">
              <div class="instruction pix"></div>
            </div>
            <div class="cover bottom"></div>
            <div class="cover top">
              <div class="collection-arrow pix"></div>
            </div>
            <div class="collection-point pix"></div>
          </div>
        </div>
        <div class="claw-sign">
          
        </div>
      </div>
    `;
  }
  
  applyColorPreset() {
    const wrapper = this.container.querySelector('.claw-wrapper');
    if (wrapper && this.colorPreset) {
      wrapper.style.setProperty('--machine-color', this.colorPreset.machine);
      wrapper.style.setProperty('--claw-color', this.colorPreset.claw);
      wrapper.style.setProperty('--button-color', this.colorPreset.button);
      wrapper.style.backgroundColor = this.colorPreset.wrapper;
      this.container.style.backgroundColor = this.colorPreset.bg;
    }
  }
  
  cacheElements() {
    this.elements.clawMachine = this.container.querySelector('.claw-machine');
    this.elements.box = this.container.querySelector('.box');
    this.elements.collectionBox = this.container.querySelector('.collection-box');
    this.elements.collectionArrow = this.container.querySelector('.collection-arrow');
  }
  
  setupMeasurements() {
    const clawMachine = this.elements.clawMachine;
    const machineTop = this.container.querySelector('.machine-top');
    const machineBottom = this.container.querySelector('.machine-bottom');
    
    const cmRect = clawMachine.getBoundingClientRect();
    this.machineWidth = cmRect.width;
    this.machineHeight = cmRect.height;
    this.machineTop = cmRect.top;
    
    const mtRect = machineTop.getBoundingClientRect();
    this.machineTopHeight = mtRect.height;
    
    const mbRect = machineBottom.getBoundingClientRect();
    this.machineBottomHeight = mbRect.height;
    this.machineBottomTop = mbRect.top;
    
    this.maxArmLength = this.machineBottomTop - this.machineTop - this.machineBuffer.y;
    
    this.elements.box.style.setProperty('--shadow-pos', `${this.maxArmLength}px`);
  }
  
  radToDeg(rad) {
    return Math.round(rad * (180 / Math.PI));
  }
  
  calcX(i, n) {
    return i % n;
  }
  
  calcY(i, n) {
    return Math.floor(i / n);
  }
  
  adjustAngle(angle) {
    const adjustedAngle = angle % 360;
    return adjustedAngle < 0 ? adjustedAngle + 360 : adjustedAngle;
  }
  
  randomN(min, max) {
    return Math.round(min - 0.5 + Math.random() * (max - min + 1));
  }
  
  createToys() {
    // Check if we have custom prizes
    if (this.customPrizes && this.customPrizes.length > 0) {
      this.createCustomToys();
    } else {
      this.createDefaultToys();
    }
  }
  
  createCustomToys() {
    // Shuffle and limit to 11 prizes (12 slots minus 1 skip)
    const shuffledPrizes = [...this.customPrizes].sort(() => 0.5 - Math.random());
    const prizesToShow = shuffledPrizes.slice(0, 11);
    
    let prizeIndex = 0;
    for (let i = 0; i < 12; i++) {
      if (i === 8) continue; // Skip one slot for variety
      
      if (prizeIndex >= prizesToShow.length) {
        prizeIndex = 0; // Loop back if we have fewer prizes than slots
      }
      
      const prize = prizesToShow[prizeIndex];
      prizeIndex++;
      
      const size = { w: 45, h: 45 };
      
      // Create the toy element with custom image
      const toyEl = document.createElement('div');
      toyEl.className = 'toy pix custom-prize';
      toyEl.dataset.prizeId = prize.id;
      toyEl.dataset.prizeName = prize.name;
      toyEl.dataset.prizeRarity = prize.rarity || 'common';
      
      // Add image or emoji
      if (prize.image) {
        const img = document.createElement('img');
        img.src = prize.image;
        img.alt = prize.name;
        img.style.cssText = 'width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated;';
        img.draggable = false;
        toyEl.appendChild(img);
      } else if (prize.emoji) {
        toyEl.innerHTML = `<span class="prize-emoji">${prize.emoji}</span>`;
      } else {
        toyEl.innerHTML = `<span class="prize-emoji">🎁</span>`;
      }
      
      // Add rarity glow
      toyEl.classList.add(`rarity-${prize.rarity || 'common'}`);
      
      const toy = new Toy({
        game: this,
        el: toyEl,
        x: this.cornerBuffer + this.calcX(i, 4) * ((this.machineWidth - this.cornerBuffer * 3) / 4) + size.w / 2 + this.randomN(-6, 6),
        y: this.machineBottomTop - this.machineTop + this.cornerBuffer + this.calcY(i, 4) * ((this.machineBottomHeight - this.cornerBuffer * 2) / 3) - size.h / 2 + this.randomN(-2, 2),
        z: 0,
        toyType: 'custom',
        prizeData: prize,
        ...size,
        index: i,
      });
      
      this.elements.box.append(toy.el);
      this.elements.toys.push(toy);
    }
  }
  
  createDefaultToys() {
    const sortedToys = [...Object.keys(this.toys), ...Object.keys(this.toys)].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < 12; i++) {
      if (i === 8) continue; // Skip one slot
      
      const toyType = sortedToys[i];
      const size = this.toys[toyType];
      
      const toy = new Toy({
        game: this,
        el: Object.assign(document.createElement('div'), {
          className: `toy pix ${toyType}`,
        }),
        x: this.cornerBuffer + this.calcX(i, 4) * ((this.machineWidth - this.cornerBuffer * 3) / 4) + size.w / 2 + this.randomN(-6, 6),
        y: this.machineBottomTop - this.machineTop + this.cornerBuffer + this.calcY(i, 4) * ((this.machineBottomHeight - this.cornerBuffer * 2) / 3) - size.h / 2 + this.randomN(-2, 2),
        z: 0,
        toyType,
        ...size,
        index: i,
      });
      
      this.elements.box.append(toy.el);
      this.elements.toys.push(toy);
    }
  }
  
  setupControls() {
    this.armJoint = new WorldObject({
      game: this,
      className: 'arm-joint',
    });
    
    this.vertRail = new WorldObject({
      game: this,
      className: 'vert',
      moveWith: [null, this.armJoint],
    });
    
    this.arm = new WorldObject({
      game: this,
      className: 'arm',
    });
    
    this.armJoint.resizeShadow();
    
    // Initial animation
    this.armJoint.move({
      moveKey: 'y',
      target: this.machineTopHeight - this.machineBuffer.y,
      moveTime: 50,
      next: () => this.vertRail.resumeMove({
        moveKey: 'x',
        target: this.machineBuffer.x,
        moveTime: 50,
        next: () => {
          Object.assign(this.armJoint.default, {
            y: this.machineTopHeight - this.machineBuffer.y,
            x: this.machineBuffer.x,
          });
          Object.assign(this.vertRail.default, {
            x: this.machineBuffer.x,
          });
          this.activateHoriBtn();
        },
      }),
    });
    
    // Create buttons
    this.horiBtn = new Button({
      game: this,
      className: 'hori-btn',
      isLocked: true,
      pressAction: () => {
        // Check if we've exceeded max tries
        if (this.gameplaySettings.maxTries > 0 && this.gameplaySettings.triesUsed >= this.gameplaySettings.maxTries) {
          console.log('No tries remaining!');
          document.dispatchEvent(new CustomEvent('clawNoTriesLeft'));
          return;
        }
        
        // Increment tries
        this.gameplaySettings.triesUsed++;
        document.dispatchEvent(new CustomEvent('clawTryUsed', { 
          detail: { 
            triesUsed: this.gameplaySettings.triesUsed, 
            maxTries: this.gameplaySettings.maxTries 
          } 
        }));
        
        this.arm.el.classList.remove('missed');
        this.vertRail.move({
          moveKey: 'x',
          target: this.machineWidth - this.armJoint.w - this.machineBuffer.x,
          next: () => this.stopHoriBtnAndActivateVertBtn(),
        });
      },
      releaseAction: () => {
        clearInterval(this.vertRail.interval);
        this.stopHoriBtnAndActivateVertBtn();
      },
    });
    
    this.vertBtn = new Button({
      game: this,
      className: 'vert-btn',
      isLocked: true,
      pressAction: () => {
        if (this.vertBtn.isLocked) return;
        this.armJoint.move({
          moveKey: 'y',
          target: this.machineBuffer.y,
        });
      },
      releaseAction: () => {
        clearInterval(this.armJoint.interval);
        this.vertBtn.deactivate();
        this.getClosestToy();
        setTimeout(() => {
          this.arm.el.classList.add('open');
          this.arm.move({
            moveKey: 'h',
            target: this.maxArmLength,
            next: () => setTimeout(() => {
              this.arm.el.classList.remove('open');
              this.grabToy();
              this.arm.resumeMove({
                moveKey: 'h',
                next: () => {
                  this.vertRail.resumeMove({
                    moveKey: 'x',
                    next: () => {
                      this.armJoint.resumeMove({
                        moveKey: 'y',
                        next: () => this.dropToy(),
                      });
                    },
                  });
                },
              });
            }, 500),
          });
        }, 500);
      },
    });
  }
  
  stopHoriBtnAndActivateVertBtn() {
    this.armJoint.interval = null;
    this.horiBtn.deactivate();
    this.vertBtn.activate();
  }
  
  activateHoriBtn() {
    this.horiBtn.activate();
    [this.vertRail, this.armJoint, this.arm].forEach(c => (c.interval = null));
  }
  
  doOverlap(a, b) {
    return b.x > a.x && b.x < a.x + a.w && b.y > a.y && b.y < a.y + a.h;
  }
  
  getClosestToy() {
    const claw = {
      y: this.armJoint.y + this.maxArmLength + this.machineBuffer.y + 7,
      x: this.armJoint.x + 7,
      w: 40,
      h: 32,
    };
    
    const overlappedToys = this.elements.toys.filter(t => this.doOverlap(t, claw));
    
    if (overlappedToys.length) {
      const toy = overlappedToys.sort((a, b) => b.index - a.index)[0];
      toy.setTransformOrigin({
        x: claw.x - toy.x,
        y: claw.y - toy.y,
      });
      toy.setClawPos({
        x: claw.x,
        y: claw.y,
      });
      this.settings.targetToy = toy;
    }
  }
  
  grabToy() {
    if (this.settings.targetToy) {
      // Check if claw successfully grabs based on clawStrength
      const grabRoll = Math.random() * 100;
      const grabSuccess = grabRoll < this.gameplaySettings.clawStrength;
      
      console.log(`Grab attempt: roll=${grabRoll.toFixed(1)}, strength=${this.gameplaySettings.clawStrength}, success=${grabSuccess}`);
      
      if (grabSuccess) {
        [this.vertRail, this.armJoint, this.arm].forEach(obj => (obj.moveWith[0] = this.settings.targetToy));
        this.settings.targetToy.setRotateAngle();
        this.settings.targetToy.el.classList.add('grabbed');
        
        // Check for drop during lift (based on dropChance)
        // Higher dropChance = more likely to drop
        const willDrop = Math.random() * 100 < this.gameplaySettings.dropChance;
        if (willDrop) {
          // Schedule a drop partway through the lift
          const dropDelay = 300 + Math.random() * 500; // Drop after 300-800ms
          setTimeout(() => {
            if (this.settings.targetToy && this.settings.targetToy.el.classList.contains('grabbed')) {
              console.log('Toy slipped during lift!');
              this.settings.targetToy.el.classList.remove('grabbed');
              this.settings.targetToy.el.classList.add('dropped');
              [this.vertRail, this.armJoint, this.arm].forEach(obj => (obj.moveWith[0] = null));
              
              // Animate drop
              this.settings.targetToy.z = 1;
              this.settings.targetToy.move({
                moveKey: 'y',
                target: this.machineBottomTop - this.machineTop + this.cornerBuffer + 60,
                moveTime: 30,
              });
              this.settings.targetToy = null;
              
              // Dispatch slip event
              document.dispatchEvent(new CustomEvent('clawSlipped'));
            }
          }, dropDelay);
        }
      } else {
        // Failed to grab - claw closes but toy slips out immediately
        console.log('Failed to grab toy - weak grip!');
        this.arm.el.classList.add('missed');
        this.settings.targetToy = null;
      }
    } else {
      this.arm.el.classList.add('missed');
    }
  }
  
  dropToy() {
    this.arm.el.classList.add('open');
    if (this.settings.targetToy) {
      this.settings.targetToy.z = 3;
      this.settings.targetToy.move({
        moveKey: 'y',
        target: this.machineHeight - this.settings.targetToy.h - 30,
        moveTime: 50,
      });
      [this.vertRail, this.armJoint, this.arm].forEach(obj => (obj.moveWith[0] = null));
    }
    setTimeout(() => {
      this.arm.el.classList.remove('open');
      this.activateHoriBtn();
      if (this.settings.targetToy) {
        this.settings.targetToy.el.classList.add('selected');
        this.elements.collectionArrow.classList.add('active');
        this.settings.targetToy = null;
      }
    }, 700);
  }
  
  // Shuffle toys in the machine with new prizes
  shuffleToys(newPrizes = null) {
    // Remove existing toys that aren't being grabbed or collected
    this.elements.toys.forEach(toy => {
      if (!toy.el.classList.contains('grabbed') && !toy.el.classList.contains('selected')) {
        toy.el.remove();
      }
    });
    
    // Filter out removed toys
    this.elements.toys = this.elements.toys.filter(toy => 
      toy.el.classList.contains('grabbed') || toy.el.classList.contains('selected')
    );
    
    // Update custom prizes if provided
    if (newPrizes) {
      this.customPrizes = newPrizes;
    }
    
    // Shuffle the prizes
    const shuffledPrizes = [...this.customPrizes].sort(() => 0.5 - Math.random());
    const prizesToShow = shuffledPrizes.slice(0, 11);
    
    let prizeIndex = 0;
    const existingCount = this.elements.toys.length;
    const slotsNeeded = 11 - existingCount;
    
    // Create new toys for empty slots
    let slotIndex = 0;
    for (let i = 0; i < 12 && prizeIndex < slotsNeeded; i++) {
      if (i === 8) continue; // Skip one slot
      
      // Check if this slot is taken by an existing toy
      const slotTaken = this.elements.toys.some(t => t.index === i);
      if (slotTaken) continue;
      
      if (prizeIndex >= prizesToShow.length) {
        prizeIndex = 0;
      }
      
      const prize = prizesToShow[prizeIndex];
      prizeIndex++;
      
      const size = { w: 45, h: 45 };
      
      const toyEl = document.createElement('div');
      toyEl.className = 'toy pix custom-prize';
      toyEl.dataset.prizeId = prize.id;
      toyEl.dataset.prizeName = prize.name;
      toyEl.dataset.prizeRarity = prize.rarity || 'common';
      
      if (prize.image) {
        const img = document.createElement('img');
        img.src = prize.image;
        img.alt = prize.name;
        img.style.cssText = 'width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated;';
        img.draggable = false;
        toyEl.appendChild(img);
      } else if (prize.emoji) {
        toyEl.innerHTML = `<span class="prize-emoji">${prize.emoji}</span>`;
      } else {
        toyEl.innerHTML = `<span class="prize-emoji">🎁</span>`;
      }
      
      toyEl.classList.add(`rarity-${prize.rarity || 'common'}`);
      
      // Add shuffle animation
      toyEl.style.animation = 'shuffleIn 0.5s ease-out';
      
      const toy = new Toy({
        game: this,
        el: toyEl,
        x: this.cornerBuffer + this.calcX(i, 4) * ((this.machineWidth - this.cornerBuffer * 3) / 4) + size.w / 2 + this.randomN(-6, 6),
        y: this.machineBottomTop - this.machineTop + this.cornerBuffer + this.calcY(i, 4) * ((this.machineBottomHeight - this.cornerBuffer * 2) / 3) - size.h / 2 + this.randomN(-2, 2),
        z: 0,
        toyType: 'custom',
        prizeData: prize,
        ...size,
        index: i,
      });
      
      this.elements.box.append(toy.el);
      this.elements.toys.push(toy);
    }
    
    console.log(`🔀 Shuffled! ${this.elements.toys.length} toys in machine`);
  }
}

// Button class
class Button {
  constructor({ game, className, action, isLocked, pressAction, releaseAction }) {
    this.game = game;
    this.el = game.container.querySelector(`.${className}`);
    this.isLocked = isLocked;
    
    if (action) this.el.addEventListener('click', action);
    ['mousedown', 'touchstart'].forEach(evt => this.el.addEventListener(evt, pressAction));
    ['mouseup', 'touchend'].forEach(evt => this.el.addEventListener(evt, releaseAction));
    
    if (!isLocked) this.activate();
  }
  
  activate() {
    this.isLocked = false;
    this.el.classList.add('active');
  }
  
  deactivate() {
    this.isLocked = true;
    this.el.classList.remove('active');
  }
}

// WorldObject class
class WorldObject {
  constructor(props) {
    Object.assign(this, {
      x: 0,
      y: 0,
      z: 0,
      angle: 0,
      transformOrigin: { x: 0, y: 0 },
      interval: null,
      default: {},
      moveWith: [],
      el: props.className && props.game.container.querySelector(`.${props.className}`),
      ...props,
    });
    
    this.setStyles();
    
    if (props.className) {
      const { width, height } = this.el.getBoundingClientRect();
      this.w = width;
      this.h = height;
    }
    
    ['x', 'y', 'w', 'h'].forEach(key => {
      this.default[key] = this[key];
    });
  }
  
  setStyles() {
    Object.assign(this.el.style, {
      left: `${this.x}px`,
      top: !this.bottom && `${this.y}px`,
      bottom: this.bottom,
      width: `${this.w}px`,
      height: `${this.h}px`,
      transformOrigin: this.transformOrigin,
    });
    this.el.style.zIndex = this.z;
  }
  
  setClawPos(clawPos) {
    this.clawPos = clawPos;
  }
  
  setTransformOrigin(transformOrigin) {
    this.transformOrigin = transformOrigin === 'center' ? 'center' : `${transformOrigin.x}px ${transformOrigin.y}px`;
    this.setStyles();
  }
  
  handleNext(next) {
    clearInterval(this.interval);
    if (next) next();
  }
  
  resumeMove({ moveKey, target, moveTime, next }) {
    this.interval = null;
    this.move({ moveKey, target, moveTime, next });
  }
  
  resizeShadow() {
    this.game.elements.box.style.setProperty('--scale', 0.5 + this.h / this.game.maxArmLength / 2);
  }
  
  move({ moveKey, target, moveTime, next }) {
    if (this.interval) {
      this.handleNext(next);
    } else {
      const moveTarget = target ?? this.default[moveKey];
      this.interval = setInterval(() => {
        const distance = Math.abs(this[moveKey] - moveTarget) < 10 ? Math.abs(this[moveKey] - moveTarget) : 10;
        const increment = this[moveKey] > moveTarget ? -distance : distance;
        
        if (increment > 0 ? this[moveKey] < moveTarget : this[moveKey] > moveTarget) {
          this[moveKey] += increment;
          this.setStyles();
          if (moveKey === 'h') this.resizeShadow();
          if (this.moveWith.length) {
            this.moveWith.forEach(obj => {
              if (!obj) return;
              obj[moveKey === 'h' ? 'y' : moveKey] += increment;
              obj.setStyles();
            });
          }
        } else {
          this.handleNext(next);
        }
      }, moveTime || 100);
    }
  }
  
  distanceBetween(target) {
    return Math.round(Math.sqrt(Math.pow(this.x - target.x, 2) + Math.pow(this.y - target.y, 2)));
  }
}

// Toy class
class Toy extends WorldObject {
  constructor(props) {
    super(props);
    this.prizeData = props.prizeData || null;
    
    const self = this;
    this.el.addEventListener('click', () => this.collectToy(self));
  }
  
  collectToy(toy) {
    console.log('🎯 collectToy called!', toy);
    console.log('🎯 Prize data:', toy.prizeData);
    
    toy.el.classList.remove('selected');
    toy.x = this.game.machineWidth / 2 - toy.w / 2;
    toy.y = this.game.machineHeight / 2 - toy.h / 2;
    toy.z = 7;
    toy.el.style.setProperty('--rotate-angle', '0deg');
    toy.setTransformOrigin('center');
    toy.el.classList.add('display');
    this.game.elements.clawMachine.classList.add('show-overlay');
    this.game.settings.collectedNumber++;
    
    // Create collection item based on toy type
    let collectionHTML;
    if (toy.prizeData) {
      // Custom prize with image or emoji
      if (toy.prizeData.image) {
        collectionHTML = `<div class="toy pix custom-prize rarity-${toy.prizeData.rarity || 'common'}">
          <img src="${toy.prizeData.image}" alt="${toy.prizeData.name}" style="width: 100%; height: 100%; object-fit: contain;">
        </div>`;
      } else {
        collectionHTML = `<div class="toy pix custom-prize rarity-${toy.prizeData.rarity || 'common'}">
          <span class="prize-emoji">${toy.prizeData.emoji || '🎁'}</span>
        </div>`;
      }
    } else {
      // Default pixel toy
      collectionHTML = `<div class="toy pix ${toy.toyType}"></div>`;
    }
    
    this.game.elements.collectionBox.appendChild(
      Object.assign(document.createElement('div'), {
        className: `toy-wrapper ${this.game.settings.collectedNumber > 6 ? 'squeeze-in' : ''}`,
        innerHTML: collectionHTML,
      })
    );
    
    // Dispatch custom event for prize collection
    console.log('🎯 About to dispatch event, prizeData:', toy.prizeData);
    if (toy.prizeData) {
      const event = new CustomEvent('clawPrizeCollected', { 
        detail: toy.prizeData 
      });
      console.log('🎯 Dispatching clawPrizeCollected event');
      document.dispatchEvent(event);
    } else {
      console.warn('⚠️ No prizeData on toy, cannot dispatch event');
    }
    
    // Remove the displayed toy after animation completes
    setTimeout(() => {
      toy.el.style.display = 'none';
      toy.el.remove();
    }, 2000); // 1s delay + 0.8s animation + buffer
    
    setTimeout(() => {
      this.game.elements.clawMachine.classList.remove('show-overlay');
      if (!this.game.container.querySelector('.selected')) {
        this.game.elements.collectionArrow.classList.remove('active');
      }
    }, 1000);
  }
  
  setRotateAngle() {
    const angle = this.game.radToDeg(
      Math.atan2(this.y + this.h / 2 - this.clawPos.y, this.x + this.w / 2 - this.clawPos.x)
    ) - 90;
    const adjustedAngle = Math.round(this.game.adjustAngle(angle));
    this.angle = adjustedAngle < 180 ? adjustedAngle * -1 : 360 - adjustedAngle;
    this.el.style.setProperty('--rotate-angle', `${this.angle}deg`);
  }
}

// Initialize the game when called
function initClawMachine(containerId, options = {}) {
  return new ClawMachineGame(containerId, options);
}

// Set prizes globally for the claw machine
function setClawMachinePrizes(prizes) {
  clawMachinePrizes = prizes;
}
