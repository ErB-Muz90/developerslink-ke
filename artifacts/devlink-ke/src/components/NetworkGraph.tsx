import React, { useEffect, useRef } from "react";

interface Node {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  label: string;
  radius: number;
}

interface Edge {
  source: number;
  target: number;
  opacity: number;
}

const SKILLS = ["Backend", "Frontend", "Mobile", "AI/ML", "DevOps", "Design", "Data", "Security", "Cloud", "Web3"];

export function NetworkGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    let animationFrameId: number;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = 400; // max height for hero area
    
    const numNodes = 25;
    const maxDistance = 150;
    
    const nodes: Node[] = Array.from({ length: numNodes }).map((_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      label: SKILLS[Math.floor(Math.random() * SKILLS.length)],
      radius: Math.random() * 2 + 2,
    }));
    
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Update positions
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;
        
        if (node.x <= 0 || node.x >= width) node.vx *= -1;
        if (node.y <= 0 || node.y >= height) node.vy *= -1;
      });
      
      // Draw edges
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < maxDistance) {
            const opacity = 1 - (dist / maxDistance);
            ctx.strokeStyle = `rgba(22, 163, 74, ${opacity * 0.5})`; // Using primary green
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }
      
      // Draw nodes
      nodes.forEach(node => {
        ctx.fillStyle = "rgba(22, 163, 74, 0.8)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw some labels randomly
        if (node.id % 3 === 0) {
          ctx.fillStyle = "rgba(163, 230, 53, 0.7)"; // lighter green text
          ctx.font = "10px 'Space Mono', monospace";
          ctx.fillText(node.label, node.x + 8, node.y + 4);
        }
      });
      
      animationFrameId = requestAnimationFrame(draw);
    };
    
    draw();
    
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = 400;
    };
    
    window.addEventListener("resize", handleResize);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-[400px] pointer-events-none opacity-40 mix-blend-screen"
      style={{ zIndex: 1 }}
    />
  );
}
