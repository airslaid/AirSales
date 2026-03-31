import React, { useEffect, useRef } from 'react';

const COLORS = [
  '#4285F4', // Blue
  '#EA4335', // Red
  '#FBBC05', // Gold/Yellow (using as highlight)
  '#34A853', // Green
  '#A142F4', // Purple
  '#F4429A', // Pink
];

export const AntigravityBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const particleCount = 150;

    class Particle {
      x: number = 0;
      y: number = 0;
      radius: number = 0;
      color: string = '';
      angle: number = 0;
      distance: number = 0;
      speed: number = 0;
      thickness: number = 0;
      length: number = 0;

      constructor(width: number, height: number) {
        this.reset(width, height);
      }

      reset(width: number, height: number) {
        this.angle = Math.random() * Math.PI * 2;
        this.distance = Math.random() * Math.max(width, height) * 0.6;
        this.speed = 0.002 + Math.random() * 0.005;
        this.radius = Math.random() * 2 + 1;
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.thickness = Math.random() * 2 + 1;
        this.length = Math.random() * 20 + 10;
        this.updatePos(width, height);
      }

      updatePos(width: number, height: number) {
        this.x = width / 2 + Math.cos(this.angle) * this.distance;
        this.y = height / 2 + Math.sin(this.angle) * this.distance;
      }

      update(width: number, height: number) {
        this.angle += this.speed;
        // Subtle distance oscillation
        this.distance += Math.sin(this.angle * 0.5) * 0.5;
        this.updatePos(width, height);
      }

      draw(context: CanvasRenderingContext2D) {
        context.save();
        context.translate(this.x, this.y);
        context.rotate(this.angle + Math.PI / 2);
        
        context.beginPath();
        context.moveTo(0, -this.length / 2);
        context.lineTo(0, this.length / 2);
        
        context.strokeStyle = this.color;
        context.lineWidth = this.thickness;
        context.lineCap = 'round';
        context.globalAlpha = 0.6;
        context.stroke();
        
        context.restore();
      }
    }

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = Array.from({ length: particleCount }, () => new Particle(canvas.width, canvas.height));
    };

    window.addEventListener('resize', resize);
    resize();

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw a subtle radial gradient background to match the "clean" look
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.7
      );
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(1, '#f8fafc');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.update(canvas.width, canvas.height);
        p.draw(ctx);
      });
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{
        display: 'block',
      }}
    />
  );
};
