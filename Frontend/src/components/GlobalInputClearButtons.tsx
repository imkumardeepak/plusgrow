import { useEffect } from "react";

const SMALL_DEVICE_QUERY = "(max-width: 640px)";
const CLEARABLE_INPUT_SELECTOR = [
  'input:not([data-no-clear]):not([type])',
  'input[type="text"]:not([data-no-clear])',
  'input[type="search"]:not([data-no-clear])',
  'input[type="email"]:not([data-no-clear])',
  'input[type="tel"]:not([data-no-clear])',
  'input[type="url"]:not([data-no-clear])',
  'input[type="number"]:not([data-no-clear])',
].join(",");

const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype,
  "value",
)?.set;

function setInputValue(input: HTMLInputElement, value: string) {
  nativeInputValueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function syncClearButton(input: HTMLInputElement) {
  const clearButton = input.nextElementSibling as HTMLButtonElement | null;
  if (!clearButton?.classList.contains("global-input-clear-button")) return;

  clearButton.hidden = !input.value || input.disabled || input.readOnly;
}

function enhanceInput(input: HTMLInputElement) {
  if (input.dataset.clearEnhanced === "true") return;
  if (input.disabled || input.readOnly) return;
  input.dataset.clearEnhanced = "true";
  input.classList.add("global-input-clear-target");

  const parent = input.parentElement;
  parent?.classList.add("global-input-clear-wrapper");
  input.closest(".mantine-Input-wrapper")?.classList.add("global-input-clear-wrapper");

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "global-input-clear-button";
  clearButton.setAttribute("aria-label", "Clear input");
  clearButton.innerHTML = "×";
  clearButton.hidden = !input.value;

  clearButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
  });

  clearButton.addEventListener("click", () => {
    setInputValue(input, "");
    input.focus();
    syncClearButton(input);
  });

  input.insertAdjacentElement("afterend", clearButton);

  input.addEventListener("input", () => syncClearButton(input));
  input.addEventListener("change", () => syncClearButton(input));
  syncClearButton(input);
}

function removeEnhancement(input: HTMLInputElement) {
  if (input.dataset.clearEnhanced !== "true") return;

  const clearButton = input.nextElementSibling;
  if (clearButton?.classList.contains("global-input-clear-button")) {
    clearButton.remove();
  }

  input.classList.remove("global-input-clear-target");
  delete input.dataset.clearEnhanced;
}

function enhanceInputs() {
  document
    .querySelectorAll<HTMLInputElement>(CLEARABLE_INPUT_SELECTOR)
    .forEach(enhanceInput);
}

function removeEnhancements() {
  document
    .querySelectorAll<HTMLInputElement>("input[data-clear-enhanced='true']")
    .forEach(removeEnhancement);
}

export function GlobalInputClearButtons() {
  useEffect(() => {
    const mediaQuery = window.matchMedia(SMALL_DEVICE_QUERY);

    const sync = () => {
      if (mediaQuery.matches) {
        enhanceInputs();
      } else {
        removeEnhancements();
      }
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });

    mediaQuery.addEventListener("change", sync);
    sync();

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", sync);
      removeEnhancements();
    };
  }, []);

  return null;
}
