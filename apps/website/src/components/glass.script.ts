const rootStyle = document.documentElement.style;
const renderInterval = 120;
let connectedElements = 0;
let animationFrame = 0;
let renderTimeout = 0;
let lastRenderTime = 0;
let targetX = 50;
let targetY = 50;
let renderedX: number | undefined;
let renderedY: number | undefined;

const renderPointer = () => {
  animationFrame = 0;
  if (targetX !== renderedX) {
    rootStyle.setProperty("--pointer-x", `${targetX}%`);
    renderedX = targetX;
  }
  if (targetY !== renderedY) {
    rootStyle.setProperty("--pointer-y", `${targetY}%`);
    renderedY = targetY;
  }
  lastRenderTime = performance.now();
};

const queueRender = () => {
  renderTimeout = 0;
  animationFrame = window.requestAnimationFrame(renderPointer);
};

const trackPointer = (event: PointerEvent) => {
  targetX = Math.round((event.clientX / window.innerWidth) * 100);
  targetY = Math.round((event.clientY / window.innerHeight) * 100);

  if (animationFrame || renderTimeout || (targetX === renderedX && targetY === renderedY)) {
    return;
  }

  const delay = renderInterval - (performance.now() - lastRenderTime);
  if (delay > 0) {
    renderTimeout = window.setTimeout(queueRender, delay);
  } else {
    queueRender();
  }
};

class WrenGlass extends HTMLElement {
  connectedCallback() {
    connectedElements++;
    if (connectedElements === 1) {
      window.addEventListener("pointermove", trackPointer, { passive: true });
    }
  }

  disconnectedCallback() {
    connectedElements--;
    if (connectedElements === 0) {
      window.removeEventListener("pointermove", trackPointer);
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(renderTimeout);
      animationFrame = 0;
      renderTimeout = 0;
    }
  }
}

if (!customElements.get("wren-glass")) {
  customElements.define("wren-glass", WrenGlass);
}
