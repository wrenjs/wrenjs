import { LS_PKG_KEY } from "#/constants";

class WrenPackageSelector extends HTMLElement {
  #animationFrame = 0;
  #copyRequest = 0;
  #interval = 0;
  #toastTimeout = 0;

  connectedCallback() {
    const select = this.querySelector("select");
    const placeholder = select?.options[0];
    if (!select || !placeholder || select.options.length < 2) {
      throw new Error("Package selector options are missing");
    }

    this.addEventListener("input", this.#handleInput);
    const selectedPackageManager =
      localStorage.getItem(LS_PKG_KEY) || document.documentElement.dataset[LS_PKG_KEY];
    if (selectedPackageManager) {
      placeholder.textContent = `${selectedPackageManager} create wrenjs@latest`;
      return;
    }

    let packageManagerIndex = 0;
    placeholder.textContent = `${select.options[1].value} create wrenjs@latest`;
    this.#interval = window.setInterval(() => {
      packageManagerIndex = (packageManagerIndex + 1) % (select.options.length - 1);
      placeholder.textContent = `${select.options[packageManagerIndex + 1].value} create wrenjs@latest`;
    }, 1500);
  }

  disconnectedCallback() {
    this.#copyRequest++;
    this.removeEventListener("input", this.#handleInput);
    window.clearInterval(this.#interval);
    window.clearTimeout(this.#toastTimeout);
    window.cancelAnimationFrame(this.#animationFrame);
    this.#animationFrame = 0;
    this.#interval = 0;
    this.#toastTimeout = 0;

    const select = this.querySelector("select");
    const toast = this.querySelector<HTMLElement>("[data-toast]");
    const toastMessage = this.querySelector<HTMLElement>("[data-toast-message]");
    if (select) {
      select.value = "";
    }
    if (toast) {
      toast.hidden = true;
    }
    if (toastMessage) {
      toastMessage.textContent = "";
    }
  }

  #handleInput = async (event: Event) => {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement) || !select.value) {
      return;
    }

    const packageManager = select.value;
    const command = `${packageManager} create wrenjs@latest`;
    window.clearInterval(this.#interval);
    this.#interval = 0;
    select.options[0].textContent = command;
    const request = ++this.#copyRequest;
    window.cancelAnimationFrame(this.#animationFrame);
    this.#animationFrame = window.requestAnimationFrame(() => {
      select.value = "";
      this.#animationFrame = 0;
    });

    let message = "Copied to clipboard";
    try {
      await navigator.clipboard.writeText(command);
      localStorage.setItem(LS_PKG_KEY, packageManager);
    } catch {
      message = "Could not copy to clipboard";
    }

    if (this.isConnected && request === this.#copyRequest) {
      this.#showToast(message);
    }
  };

  #showToast(message: string) {
    const toast = this.querySelector<HTMLElement>("[data-toast]");
    const toastMessage = this.querySelector<HTMLElement>("[data-toast-message]");
    if (!toast || !toastMessage) {
      throw new Error("Package selector toast markup is missing");
    }

    window.clearTimeout(this.#toastTimeout);
    toastMessage.textContent = message;
    toast.hidden = false;
    this.#toastTimeout = window.setTimeout(() => {
      toast.hidden = true;
      toastMessage.textContent = "";
      this.#toastTimeout = 0;
    }, 2000);
  }
}

if (!customElements.get("wren-package-selector")) {
  customElements.define("wren-package-selector", WrenPackageSelector);
}
