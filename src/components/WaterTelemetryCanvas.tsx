import { useEffect, useRef } from "react";

export default function WaterTelemetryCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 500);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener("resize", handleResize);

    // Telemetry node particles
    const nodes = Array.from({ length: 22 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.7,
      radius: Math.random() * 2.5 + 2,
      pulse: Math.random() * Math.PI * 2,
      color: [
        "#4b5d16", // Kyuri Green
        "#e45c10", // Tobiko Orange
        "#f2b635", // Sneezeweeds Yellow
      ][Math.floor(Math.random() * 3)],
    }));

    let phase = 0;

    const render = () => {
      phase += 0.018;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw flowing sine water wave layers
      const waveConfigs = [
        { amplitude: 22, frequency: 0.007, speed: phase * 1.3, color: "rgba(75, 93, 22, 0.14)", yOffset: height * 0.42 },
        { amplitude: 28, frequency: 0.005, speed: phase * 0.9, color: "rgba(242, 182, 53, 0.16)", yOffset: height * 0.52 },
        { amplitude: 18, frequency: 0.011, speed: phase * 1.6, color: "rgba(228, 92, 16, 0.12)", yOffset: height * 0.64 },
        { amplitude: 32, frequency: 0.004, speed: phase * 0.7, color: "rgba(34, 51, 0, 0.10)", yOffset: height * 0.76 },
      ];

      waveConfigs.forEach((wave) => {
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 8) {
          const y = wave.yOffset + Math.sin(x * wave.frequency + wave.speed) * wave.amplitude;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.fillStyle = wave.color;
        ctx.fill();
      });

      // 2. Draw subtle mini telemetry stream graph line overlay
      ctx.beginPath();
      ctx.strokeStyle = "rgba(75, 93, 22, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      const graphY = height * 0.35;
      for (let x = 0; x <= width; x += 15) {
        const noise = Math.sin(x * 0.03 + phase * 2) * 12 + Math.cos(x * 0.02) * 8;
        if (x === 0) ctx.moveTo(x, graphY + noise);
        else ctx.lineTo(x, graphY + noise);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Update & Render Telemetry Data Nodes & Connections
      nodes.forEach((node, i) => {
        node.x += node.vx;
        node.y += node.vy;
        node.pulse += 0.04;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        const currentRadius = node.radius + Math.sin(node.pulse) * 1;

        // Draw mesh lines to nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(75, 93, 22, ${0.25 - dist / 500})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }

        // Draw glowing particle node
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(1.5, currentRadius), 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-90 transition-opacity duration-500"
    />
  );
}
