export class GridShader {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null;
  private program: WebGLProgram | null = null;
  private positionLocation = -1;
  private resolutionLocation: WebGLUniformLocation | null = null;
  private timeLocation: WebGLUniformLocation | null = null;
  private dprLocation: WebGLUniformLocation | null = null;
  private startTime = Date.now();
  private animationFrame = 0;
  private externalPaused = false;
  private hidden = document.hidden;
  private isAnimating = false;
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private resizeHandler = () => this.resize();
  private visibilityHandler = () => {
    this.hidden = document.hidden;
    if (!this.shouldPause()) this.startAnimation();
  };
  private reducedMotionHandler = () => {
    if (this.shouldPause()) {
      this.stopAnimation();
    } else {
      this.startAnimation();
    }
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;

    if (!this.gl) {
      this.fallbackToCss();
      return;
    }

    this.init();
  }

  destroy() {
    window.removeEventListener("resize", this.resizeHandler);
    document.removeEventListener("visibilitychange", this.visibilityHandler);
    this.reducedMotion.removeEventListener("change", this.reducedMotionHandler);
    this.stopAnimation();
  }

  setPaused(paused: boolean) {
    this.externalPaused = paused;
    if (this.shouldPause()) {
      this.stopAnimation();
    } else {
      this.startAnimation();
    }
  }

  private fallbackToCss() {
    this.canvas.style.display = "none";
    document.body.style.background = "#414254";
  }

  private init() {
    const gl = this.gl;
    if (!gl) return;

    const vertexShader = this.compileShader(
      gl.VERTEX_SHADER,
      `
        attribute vec2 a_position;
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `,
    );
    const fragmentShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform float u_dpr;
        const vec3 gridBack = vec3(0.255, 0.259, 0.329);
        const vec3 gridLines = vec3(0.341, 0.341, 0.404);
        void main() {
          vec2 uv = gl_FragCoord.xy / u_dpr;
          float speed = 15.0;
          vec2 offset = vec2(u_time * speed, -u_time * speed);
          float cellSize = 30.0;
          float lineWidth = 1.0;
          vec2 gridPos = mod(uv + offset, cellSize);
          float lineX = step(cellSize - lineWidth, gridPos.x);
          float lineY = step(cellSize - lineWidth, gridPos.y);
          float grid = max(lineX, lineY);
          vec3 color = mix(gridBack, gridLines, grid);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    );

    if (!vertexShader || !fragmentShader) {
      this.fallbackToCss();
      return;
    }

    this.program = gl.createProgram();
    if (!this.program) {
      this.fallbackToCss();
      return;
    }

    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      this.fallbackToCss();
      return;
    }

    this.positionLocation = gl.getAttribLocation(this.program, "a_position");
    this.resolutionLocation = gl.getUniformLocation(this.program, "u_resolution");
    this.timeLocation = gl.getUniformLocation(this.program, "u_time");
    this.dprLocation = gl.getUniformLocation(this.program, "u_dpr");

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

    this.resize();
    window.addEventListener("resize", this.resizeHandler);
    document.addEventListener("visibilitychange", this.visibilityHandler);
    this.reducedMotion.addEventListener("change", this.reducedMotionHandler);
    this.startAnimation();
  }

  private compileShader(type: number, source: string) {
    const gl = this.gl;
    if (!gl) return null;
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private resize() {
    const gl = this.gl;
    if (!gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private startAnimation() {
    if (this.isAnimating || this.shouldPause()) return;
    this.isAnimating = true;
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  private stopAnimation() {
    this.isAnimating = false;
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  }

  private animate() {
    const gl = this.gl;
    if (!gl || !this.program) {
      this.isAnimating = false;
      return;
    }
    if (this.shouldPause()) {
      this.stopAnimation();
      return;
    }

    const time = (Date.now() - this.startTime) / 1000;
    gl.useProgram(this.program);
    gl.uniform2f(this.resolutionLocation, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.timeLocation, time);
    gl.uniform1f(this.dprLocation, Math.min(window.devicePixelRatio || 1, 2));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  private shouldPause() {
    return this.externalPaused || this.hidden || this.reducedMotion.matches;
  }
}
