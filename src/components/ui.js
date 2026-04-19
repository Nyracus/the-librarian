// src/components/ui.js

export function createElement(tag, props = {}, children = []) {
  const el = document.createElement(tag);

  if (props.className) el.className = props.className;
  if (props.text !== undefined && props.text !== null) el.textContent = props.text;

  if (props.attrs) {
    Object.entries(props.attrs).forEach(([key, value]) => {
      el.setAttribute(key, value);
    });
  }

  if (props.onClick) {
    el.addEventListener("click", props.onClick);
  }

  if (!Array.isArray(children)) children = [children];
  children
    .filter(Boolean)
    .forEach((child) => {
      if (typeof child === "string") el.appendChild(document.createTextNode(child));
      else el.appendChild(child);
    });

  return el;
}

export function normalizeWhitespace(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

