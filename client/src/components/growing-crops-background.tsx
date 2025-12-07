import { useEffect, useRef } from 'react';

interface Point {
  x: number;
  y: number;
}

class Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.x = Math.random() * width;
    this.y = Math.random() * height * 0.6; // Stars mostly in upper sky
    this.size = Math.random() * 1.5 + 0.5;
    this.alpha = Math.random();
    this.twinkleSpeed = 0.01 + Math.random() * 0.03;
  }

  draw(time: number, opacity: number) {
    if (opacity <= 0) return;
    const twinkle = Math.sin(time * this.twinkleSpeed) * 0.3 + 0.7;
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha * twinkle * opacity})`;
    this.ctx.fill();
  }
}

class Plant {
  x: number;
  y: number;
  height: number;
  maxHeight: number;
  growthRate: number;
  angle: number;
  branches: Branch[];
  color: string;
  ctx: CanvasRenderingContext2D;
  age: number;
  swayOffset: number;
  swaySpeed: number;
  type: 'corn' | 'wheat' | 'paddy' | 'generic';

  constructor(ctx: CanvasRenderingContext2D, x: number, y: number) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.height = 0;
    this.maxHeight = 200 + Math.random() * 300;
    this.growthRate = 0.5 + Math.random() * 0.5;
    this.angle = (Math.random() - 0.5) * 0.15;
    this.branches = [];
    this.age = 0;
    this.swayOffset = Math.random() * Math.PI * 2;
    this.swaySpeed = 0.01 + Math.random() * 0.02;
    
    const rand = Math.random();
    if (rand < 0.25) this.type = 'corn';
    else if (rand < 0.5) this.type = 'wheat';
    else if (rand < 0.75) this.type = 'paddy';
    else this.type = 'generic';

    if (this.type === 'wheat') {
      this.color = `rgb(218, 165, 32)`; 
    } else if (this.type === 'paddy') {
      this.color = `rgb(100, 180, 50)`; 
    } else if (this.type === 'corn') {
      this.color = `rgb(34, 139, 34)`; 
    } else {
      const green = Math.floor(100 + Math.random() * 80);
      this.color = `rgb(34, ${green}, 34)`;
    }
  }

  grow(time: number, lightness: number) {
    this.age++;
    if (this.height < this.maxHeight) {
      this.height += this.growthRate;
      let branchChance = 0.01;
      if (this.type === 'corn') branchChance = 0.03;
      if (Math.random() < branchChance && this.height > 40) {
        this.branches.push(new Branch(this.ctx, this.x, this.y - this.height, this.height, this.color, this.type));
      }
    }

    this.draw(time, lightness);
    this.branches.forEach(branch => {
      let t = (this.y - branch.y) / this.height;
      t = Math.max(0, Math.min(1, t));
      const currentSway = this.sway(time, this.height);
      const endX = this.x + (this.angle * this.height * 2) + currentSway;
      const controlX = this.x + Math.sin(this.height * 0.05) * 5 + (this.angle * this.height) + (currentSway * 0.5);
      const p0x = this.x;
      const p1x = controlX;
      const p2x = endX;
      const stemX = Math.pow(1-t, 2) * p0x + 2 * (1-t) * t * p1x + Math.pow(t, 2) * p2x;
      branch.grow(time, stemX, lightness);
    });
  }

  sway(time: number, heightPoint: number) {
    const wind = Math.sin(time * this.swaySpeed + this.swayOffset) * (15 + (this.height / 20));
    return (heightPoint / this.maxHeight) * wind;
  }

  draw(time: number, lightness: number) {
    const currentSway = this.sway(time, this.height);
    const startX = this.x;
    const startY = this.y;
    const endX = this.x + (this.angle * this.height * 2) + currentSway;
    const endY = this.y - this.height;

    if (this.height < 5) {
      this.ctx.beginPath();
      this.ctx.fillStyle = '#5D4037';
      this.ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
      this.ctx.fill();
      return;
    }

    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    const controlX = this.x + Math.sin(this.height * 0.05) * 5 + (this.angle * this.height) + (currentSway * 0.5);
    this.ctx.quadraticCurveTo(controlX, this.y - this.height / 2, endX, endY);
    
    // Apply lightness to color
    this.ctx.strokeStyle = this.adjustColor(this.color, lightness);
    this.ctx.lineWidth = Math.max(1, 8 - (this.height / this.maxHeight) * 6);
    this.ctx.lineCap = 'round';
    this.ctx.stroke();

    if (this.height > this.maxHeight * 0.9) {
      if (this.type === 'wheat') {
        this.drawWheatHead(endX, endY, currentSway, lightness);
      } else if (this.type === 'paddy') {
        this.drawPaddyHead(endX, endY, currentSway, lightness);
      } else if (this.type === 'corn') {
        this.drawCornTassel(endX, endY, currentSway, lightness);
      }
    }
  }

  adjustColor(color: string, lightness: number) {
    // Simple darkening: parse rgb, multiply by lightness
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const r = Math.floor(parseInt(match[1]) * lightness);
      const g = Math.floor(parseInt(match[2]) * lightness);
      const b = Math.floor(parseInt(match[3]) * lightness);
      return `rgb(${r}, ${g}, ${b})`;
    }
    return color;
  }

  drawWheatHead(x: number, y: number, sway: number, lightness: number) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(sway * 0.02); 
    
    this.ctx.fillStyle = this.adjustColor('rgb(218, 165, 32)', lightness);
    for(let i = 0; i < 8; i++) {
      this.ctx.beginPath();
      this.ctx.ellipse(0, -i * 5, 4, 8, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.beginPath();
    this.ctx.moveTo(0, -40);
    this.ctx.lineTo(-5, -60);
    this.ctx.moveTo(0, -35);
    this.ctx.lineTo(5, -55);
    this.ctx.strokeStyle = this.adjustColor('rgba(218, 165, 32, 0.6)', lightness);
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawPaddyHead(x: number, y: number, sway: number, lightness: number) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(sway * 0.03 + Math.PI / 6); 
    this.ctx.strokeStyle = this.adjustColor('rgb(200, 200, 100)', lightness);
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.quadraticCurveTo(10, 10, 20, 30);
    this.ctx.stroke();
    this.ctx.fillStyle = this.adjustColor('rgb(220, 220, 120)', lightness);
    for(let i = 0; i < 6; i++) {
      this.ctx.beginPath();
      this.ctx.ellipse(5 + i*2, 5 + i*4, 2, 4, 0.5, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawCornTassel(x: number, y: number, sway: number, lightness: number) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(sway * 0.02);
    this.ctx.strokeStyle = this.adjustColor('rgb(240, 230, 140)', lightness);
    this.ctx.lineWidth = 1;
    for(let i = -2; i <= 2; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.quadraticCurveTo(i * 5, -10, i * 8, -20);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }
}

class Branch {
  x: number;
  y: number;
  length: number;
  maxLength: number;
  angle: number;
  growthRate: number;
  ctx: CanvasRenderingContext2D;
  parentHeightAtSpawn: number;
  color: string;
  type: string;

  constructor(ctx: CanvasRenderingContext2D, x: number, y: number, parentHeight: number, color: string, type: string) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.parentHeightAtSpawn = parentHeight;
    this.length = 0;
    this.maxLength = 30 + Math.random() * 40; 
    this.angle = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 3 + Math.random() * 0.5);
    this.growthRate = 0.2 + Math.random() * 0.3;
    this.color = color;
    this.type = type;
  }

  grow(time: number, stemX: number, lightness: number) {
    if (this.length < this.maxLength) {
      this.length += this.growthRate;
    }
    const startX = stemX;
    const startY = this.y;
    const endX = startX + Math.cos(this.angle) * this.length + (Math.sin(time * 0.05) * 3); 
    const endY = startY + Math.sin(this.angle) * this.length;
    this.draw(startX, startY, endX, endY, lightness);
  }

  draw(startX: number, startY: number, endX: number, endY: number, lightness: number) {
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    if (this.type === 'corn') {
      this.ctx.quadraticCurveTo(startX + (endX - startX) / 2, startY + (endY - startY) / 2 + 10, endX, endY + 10);
    } else {
      this.ctx.quadraticCurveTo(startX + (endX - startX) / 2, startY + (endY - startY) / 2 - 10, endX, endY);
    }
    this.ctx.strokeStyle = this.adjustColor(this.color, lightness);
    this.ctx.lineWidth = Math.max(0.5, 3 - (this.length / this.maxLength) * 3);
    this.ctx.stroke();
  }

  adjustColor(color: string, lightness: number) {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const r = Math.floor(parseInt(match[1]) * lightness);
      const g = Math.floor(parseInt(match[2]) * lightness);
      const b = Math.floor(parseInt(match[3]) * lightness);
      return `rgb(${r}, ${g}, ${b})`;
    }
    return color;
  }
}

class Spore {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.size = Math.random() * 2 + 0.5;
    this.alpha = Math.random() * 0.5 + 0.1;
  }

  update(width: number, height: number, lightness: number) {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0) this.x = width;
    if (this.x > width) this.x = 0;
    if (this.y < 0) this.y = height;
    if (this.y > height) this.y = 0;
    this.draw(lightness);
  }

  draw(lightness: number) {
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(255, 255, 200, ${this.alpha * lightness})`;
    this.ctx.fill();
  }
}

export function GrowingCropsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let plants: Plant[] = [];
    let spores: Spore[] = [];
    let stars: Star[] = [];
    let time = 0;
    const cycleDuration = 4000; // Slower cycle for smooth transitions

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initPlants();
      initSpores();
      initStars();
    };

    const initPlants = () => {
      plants = [];
      const numberOfPlants = Math.floor(canvas.width / 60); 
      for (let i = 0; i < numberOfPlants; i++) {
        const x = Math.random() * canvas.width;
        const y = canvas.height + 20; 
        plants.push(new Plant(ctx, x, y));
      }
    };

    const initSpores = () => {
      spores = [];
      const numberOfSpores = 50;
      for (let i = 0; i < numberOfSpores; i++) {
        spores.push(new Spore(ctx, canvas.width, canvas.height));
      }
    };

    const initStars = () => {
      stars = [];
      const numberOfStars = 100;
      for (let i = 0; i < numberOfStars; i++) {
        stars.push(new Star(ctx, canvas.width, canvas.height));
      }
    };

    const getSkyGradient = (cycle: number) => {
      // cycle 0-1. 0=Sunrise, 0.25=Noon, 0.5=Sunset, 0.75=Midnight
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      
      let topColor, bottomColor;
      
      if (cycle < 0.25) { // Sunrise to Noon
        const t = cycle / 0.25;
        // Sunrise: Orange/Purple -> Blue/Cyan
        topColor = interpolateColor([20, 20, 60], [135, 206, 235], t); // Dark Blue -> Sky Blue
        bottomColor = interpolateColor([255, 140, 0], [224, 255, 255], t); // Orange -> Light Cyan
      } else if (cycle < 0.5) { // Noon to Sunset
        const t = (cycle - 0.25) / 0.25;
        // Blue/Cyan -> Orange/Purple
        topColor = interpolateColor([135, 206, 235], [20, 20, 60], t);
        bottomColor = interpolateColor([224, 255, 255], [255, 69, 0], t);
      } else if (cycle < 0.75) { // Sunset to Midnight
        const t = (cycle - 0.5) / 0.25;
        // Orange/Purple -> Dark Night
        topColor = interpolateColor([20, 20, 60], [0, 0, 20], t);
        bottomColor = interpolateColor([255, 69, 0], [0, 0, 40], t);
      } else { // Midnight to Sunrise
        const t = (cycle - 0.75) / 0.25;
        // Dark Night -> Sunrise
        topColor = interpolateColor([0, 0, 20], [20, 20, 60], t);
        bottomColor = interpolateColor([0, 0, 40], [255, 140, 0], t);
      }
      
      gradient.addColorStop(0, `rgb(${topColor[0]}, ${topColor[1]}, ${topColor[2]})`);
      gradient.addColorStop(1, `rgb(${bottomColor[0]}, ${bottomColor[1]}, ${bottomColor[2]})`);
      return gradient;
    };

    const interpolateColor = (c1: number[], c2: number[], t: number) => {
      return [
        Math.round(c1[0] + (c2[0] - c1[0]) * t),
        Math.round(c1[1] + (c2[1] - c1[1]) * t),
        Math.round(c1[2] + (c2[2] - c1[2]) * t)
      ];
    };

    const drawSunMoon = (cycle: number) => {
      const cx = canvas.width / 2;
      const cy = canvas.height;
      const radius = Math.min(canvas.width, canvas.height) * 0.8;
      
      // Sun position: 0 to 0.5 cycle
      if (cycle < 0.55 || cycle > 0.95) {
        // Sun is visible roughly from 0 to 0.5
        // Map cycle 0..0.5 to angle -PI to 0
        let sunAngle = ((cycle) / 0.5) * Math.PI - Math.PI;
        if (cycle > 0.95) sunAngle = ((cycle - 1) / 0.5) * Math.PI - Math.PI;

        const sunX = cx + Math.cos(sunAngle) * radius;
        const sunY = cy + Math.sin(sunAngle) * radius;
        
        if (sunY < canvas.height + 100) {
          ctx.beginPath();
          ctx.arc(sunX, sunY, 40, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
          ctx.shadowColor = 'rgba(255, 255, 0, 0.5)';
          ctx.shadowBlur = 50;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Moon position: 0.5 to 1.0 cycle
      if (cycle > 0.45 && cycle < 1.05) {
        let moonAngle = ((cycle - 0.5) / 0.5) * Math.PI - Math.PI;
        const moonX = cx + Math.cos(moonAngle) * radius;
        const moonY = cy + Math.sin(moonAngle) * radius;

        if (moonY < canvas.height + 100) {
          ctx.beginPath();
          ctx.arc(moonX, moonY, 30, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
          ctx.shadowBlur = 30;
          ctx.fill();
          // Crater
          ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
          ctx.beginPath();
          ctx.arc(moonX - 10, moonY - 5, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    };

    const animate = () => {
      time++;
      const cycle = (time % cycleDuration) / cycleDuration;
      
      // Calculate lightness based on cycle (0 to 1)
      // Day is bright (1), Night is dark (0.2)
      let lightness = 1;
      if (cycle > 0.5 && cycle < 1) { // Night
        // Sunset transition
        if (cycle < 0.6) lightness = 1 - (cycle - 0.5) * 8; // 1 -> 0.2
        else if (cycle > 0.9) lightness = 0.2 + (cycle - 0.9) * 8; // 0.2 -> 1
        else lightness = 0.2;
      }
      lightness = Math.max(0.2, Math.min(1, lightness));

      // Export timing information for logo synchronization
      document.documentElement.style.setProperty('--current-cycle', cycle.toString());
      document.documentElement.style.setProperty('--current-lightness', lightness.toString());

      // Draw Sky
      const gradient = getSkyGradient(cycle);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Stars (opacity based on lightness inverted)
      const starOpacity = 1 - lightness;
      if (starOpacity > 0) {
        stars.forEach(star => star.draw(time, starOpacity));
      }

      // Draw Sun/Moon
      drawSunMoon(cycle);
      
      // Export timing information for perfect logo synchronization
      document.documentElement.style.setProperty('--current-cycle', cycle.toString());
      document.documentElement.style.setProperty('--current-lightness', lightness.toString());

      plants.forEach(plant => plant.grow(time, lightness));
      spores.forEach(spore => spore.update(canvas.width, canvas.height, lightness));
      
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
      // Clean up timing properties
      document.documentElement.style.removeProperty('--current-cycle');
      document.documentElement.style.removeProperty('--current-lightness');
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: -1 }}
    />
  );
}
