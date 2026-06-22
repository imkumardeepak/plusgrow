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
const NUMERIC_INPUT_SELECTOR = [
  'input[type="number"]:not([data-no-stepper])',
  'input[inputmode="numeric"]:not([data-no-stepper])',
  'input[inputmode="decimal"]:not([data-no-stepper])',
  'input[role="spinbutton"]:not([data-no-stepper])',
  'input[aria-valuenow]:not([data-no-stepper])',
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
  const clearButton = input.parentElement?.querySelector<HTMLButtonElement>(
    ".global-input-clear-button",
  );
  if (!clearButton) return;

  clearButton.hidden = !input.value || input.disabled || input.readOnly;
}

function syncStepperButtons(input: HTMLInputElement) {
  const stepper = input.parentElement?.querySelector<HTMLElement>(
    ".global-input-stepper",
  );
  if (!stepper) return;

  const shouldHide = input.disabled || input.readOnly;
  stepper.hidden = shouldHide;

  const decrementButton = stepper.querySelector<HTMLButtonElement>(
    "[data-step-direction='down']",
  );
  if (!decrementButton) return;

  const min = input.min === "" ? null : Number(input.min);
  const currentValue = Number(input.value || 0);
  decrementButton.disabled =
    shouldHide ||
    (Number.isFinite(min) && Number.isFinite(currentValue) && currentValue <= min);
}

function getDecimalPlaces(value: number) {
  if (!Number.isFinite(value)) return 0;
  const [, decimalPart = ""] = String(value).split(".");
  return decimalPart.length;
}

function getStepValue(input: HTMLInputElement, direction: 1 | -1) {
  const currentValue = Number(input.value || 0);
  const step = input.step && input.step !== "any" ? Number(input.step) : 1;
  const min = input.min === "" ? null : Number(input.min);
  const max = input.max === "" ? null : Number(input.max);
  const fallback = Number.isFinite(min) && direction > 0 ? Number(min) : 0;
  const baseValue = Number.isFinite(currentValue) ? currentValue : fallback;
  const resolvedStep = Number.isFinite(step) ? step : 1;
  const decimalPlaces = Math.max(
    getDecimalPlaces(baseValue),
    getDecimalPlaces(resolvedStep),
  );
  const nextValue = Number(
    (baseValue + resolvedStep * direction).toFixed(decimalPlaces),
  );

  if (Number.isFinite(min) && nextValue < Number(min)) return Number(min);
  if (Number.isFinite(max) && nextValue > Number(max)) return Number(max);
  return nextValue;
}

function createInputButton(className: string, label: string, text: string) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.setAttribute("aria-label", label);
  button.innerHTML = text;

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  return button;
}

function enhanceNumericInput(input: HTMLInputElement) {
  if (!input.matches(NUMERIC_INPUT_SELECTOR)) return;
  if (input.dataset.stepperEnhanced === "true") return;

  input.dataset.stepperEnhanced = "true";
  input.classList.add("global-input-stepper-target");

  const stepper = document.createElement("span");
  stepper.className = "global-input-stepper";

  const decrementButton = createInputButton(
    "global-input-stepper-button",
    "Decrease value",
    "-",
  );
  decrementButton.dataset.stepDirection = "down";
  decrementButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setInputValue(input, String(getStepValue(input, -1)));
    input.focus();
    syncClearButton(input);
    syncStepperButtons(input);
  });

  const incrementButton = createInputButton(
    "global-input-stepper-button",
    "Increase value",
    "+",
  );
  incrementButton.dataset.stepDirection = "up";
  incrementButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setInputValue(input, String(getStepValue(input, 1)));
    input.focus();
    syncClearButton(input);
    syncStepperButtons(input);
  });

  stepper.append(decrementButton, incrementButton);
  input.insertAdjacentElement("afterend", stepper);
  syncStepperButtons(input);
}

function enhanceInput(input: HTMLInputElement) {
  if (input.dataset.clearEnhanced === "true") {
    enhanceNumericInput(input);
    syncClearButton(input);
    syncStepperButtons(input);
    return;
  }
  if (input.disabled || input.readOnly) return;
  input.dataset.clearEnhanced = "true";
  input.classList.add("global-input-clear-target");

  const parent = input.parentElement;
  parent?.classList.add("global-input-clear-wrapper");
  input.closest(".mantine-Input-wrapper")?.classList.add("global-input-clear-wrapper");

  const clearButton = createInputButton(
    "global-input-clear-button",
    "Clear input",
    "×",
  );
  clearButton.hidden = !input.value;

  clearButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setInputValue(input, "");
    input.focus();
    syncClearButton(input);
    syncStepperButtons(input);
  });

  input.insertAdjacentElement("afterend", clearButton);
  enhanceNumericInput(input);

  input.addEventListener("input", () => syncClearButton(input));
  input.addEventListener("input", () => syncStepperButtons(input));
  input.addEventListener("change", () => syncClearButton(input));
  input.addEventListener("change", () => syncStepperButtons(input));
  syncClearButton(input);
}

function removeEnhancement(input: HTMLInputElement) {
  if (input.dataset.clearEnhanced !== "true") return;

  const clearButton = input.parentElement?.querySelector(
    ".global-input-clear-button",
  );
  if (clearButton?.classList.contains("global-input-clear-button")) {
    clearButton.remove();
  }
  input.parentElement?.querySelector(".global-input-stepper")?.remove();

  input.classList.remove("global-input-clear-target");
  input.classList.remove("global-input-stepper-target");
  delete input.dataset.clearEnhanced;
  delete input.dataset.stepperEnhanced;
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
    let animationFrameId = 0;

    const sync = () => {
      if (mediaQuery.matches) {
        enhanceInputs();
      } else {
        removeEnhancements();
      }
    };

    const scheduleSync = () => {
      if (animationFrameId) return;
      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = 0;
        sync();
      });
    };

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["disabled", "readonly", "type", "inputmode", "role"],
      childList: true,
      subtree: true,
    });

    mediaQuery.addEventListener("change", scheduleSync);
    sync();

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
      observer.disconnect();
      mediaQuery.removeEventListener("change", scheduleSync);
      removeEnhancements();
    };
  }, []);

  return null;
}
