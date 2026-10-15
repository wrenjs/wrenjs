export const greet = (name: string) => `Hello from ${name}`;

class WrenGreeting extends HTMLElement {
  connectedCallback() {
    this.textContent = greet(this.getAttribute("name") ?? "web component");
  }
}

customElements.define("wren-greeting", WrenGreeting);
console.log(greet("test.ts"));
