import DOMPurify from "dompurify";
/** Owns the lifetime of imperative browser integrations mounted by React. */
export type PageAction = (this: Element, event: Event) => unknown;

export class ControllerScope {
  private cleanups: Array<() => void> = [];
  private callbacks: Array<() => unknown> = [];
  private actions = new Map<string, PageAction>();
  private disposed = false;
  private nextAction = 0;
  private isReady = false;
  private abort = new AbortController();
  readonly context: Record<string, unknown> = {};
  readonly document: Document;
  readonly window: Window & typeof globalThis;

  constructor() {
    this.document = new Proxy(document, {
      get: (target, key) => {
        if (key === "addEventListener")
          return (
            type: string,
            callback: EventListener,
            options?: AddEventListenerOptions,
          ) => {
            if (type === "DOMContentLoaded")
              this.onReady(() => callback.call(document, new Event(type)));
            else this.listen(target, type, callback, options);
          };
        const value = Reflect.get(target, key, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    this.window = new Proxy(window, {
      get: (target, key) => {
        if (key === "addEventListener")
          return (
            type: string,
            callback: EventListener,
            options?: AddEventListenerOptions,
          ) => {
            if (type === "load" || type === "DOMContentLoaded")
              this.onReady(() => callback.call(window, new Event(type)));
            else this.listen(target, type, callback, options);
          };
        const value = Reflect.get(target, key, target);
        return typeof value === "function" && !String(key).match(/^[A-Z]/)
          ? value.bind(target)
          : value;
      },
      set: (_target, key, value) => {
        if (key === "onload")
          this.onReady(() => value.call(window, new Event("load")));
        else this.expose(String(key), value);
        return true;
      },
    });
    const initialNodes = new Set(document.body.children);
    this.cleanup(() => {
      for (const element of document.body.children) {
        if (!initialNodes.has(element)) element.remove();
      }
    });
    for (const type of [
      "click",
      "error",
      "load",
      "mouseover",
      "mouseout",
      "change",
      "input",
      "keydown",
      "keyup",
      "submit",
      "focus",
      "blur",
      "mousedown",
      "mouseup",
    ]) {
      this.listen(
        document,
        type,
        (event) => {
          let element = event.target instanceof Element ? event.target : null;
          while (element) {
            const action = element.getAttribute("data-gx-" + type);
            if (action) {
              const currentTarget = element;
              const localEvent = new Proxy(event, {
                get(target, key) {
                  if (key === "currentTarget") return currentTarget;
                  if (key === "stopPropagation")
                    return () => target.stopImmediatePropagation();
                  const value = Reflect.get(target, key, target);
                  return typeof value === "function"
                    ? value.bind(target)
                    : value;
                },
              });
              this.invoke(action, localEvent, element);
              if (event.cancelBubble) break;
            }
            element = element.parentElement;
          }
        },
        ["error", "load", "focus", "blur"].includes(type),
      );
    }
    const bodyStyle = document.body.getAttribute("style");
    const htmlStyle = document.documentElement.getAttribute("style");
    this.cleanup(() => {
      if (bodyStyle === null) document.body.removeAttribute("style");
      else document.body.setAttribute("style", bodyStyle);
      if (htmlStyle === null) document.documentElement.removeAttribute("style");
      else document.documentElement.setAttribute("style", htmlStyle);
    });
  }

  cleanup(callback: () => void) {
    this.cleanups.push(callback);
  }
  onReady(callback: () => unknown) {
    if (this.isReady && !this.disposed) callback();
    else this.callbacks.push(callback);
  }
  async ready() {
    if (this.disposed || this.isReady) return;
    this.isReady = true;
    await Promise.all(
      this.callbacks.splice(0).map((callback) => Promise.resolve(callback())),
    );
  }
  listen(
    target: EventTarget,
    type: string,
    callback: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) {
    target.addEventListener(type, callback, options);
    this.cleanup(() => target.removeEventListener(type, callback, options));
  }
  sanitizeHtml(value: string) {
    // HTML parsers discard standalone rows outside a table. Preserve their
    // parsing context while sanitizing every cell, attribute and handler.
    if (/^\s*<tr(?:\s|>)/i.test(value)) {
      const fragment = DOMPurify.sanitize('<table><tbody>' + value + '</tbody></table>', { RETURN_DOM: true });
      return (fragment as ParentNode).querySelector('tbody')?.innerHTML || '';
    }
    return DOMPurify.sanitize(value);
  }
  bindHandler(handler: PageAction) {
    const name = "dynamic-" + ++this.nextAction;
    this.register(name, handler);
    return name;
  }
  register(name: string, handler: PageAction) {
    this.actions.set(name, handler);
  }
  invoke(name: string, event: Event, element: Element) {
    if (this.disposed) return;
    const result = this.actions.get(name)?.call(element, event);
    if (result === false) event.preventDefault();
    return result;
  }
  expose(name: string, value: unknown) {
    const previous = Object.getOwnPropertyDescriptor(window, name);
    if (previous && !previous.configurable) {
      if (previous.writable) Reflect.set(window, name, value);
      return;
    }
    Object.defineProperty(window, name, {
      configurable: true,
      writable: true,
      value,
    });
    this.cleanup(() => {
      if (Reflect.get(window, name) !== value) return;
      if (previous) Object.defineProperty(window, name, previous);
      else Reflect.deleteProperty(window, name);
    });
  }
  fetch = (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, {
      ...init,
      signal: init?.signal
        ? AbortSignal.any([init.signal, this.abort.signal])
        : this.abort.signal,
    });
  setTimeout = (callback: () => void, delay?: number) => {
    const id = window.setTimeout(() => {
      if (!this.disposed) callback();
    }, delay);
    this.cleanup(() => window.clearTimeout(id));
    return id;
  };
  setInterval = (callback: () => void, delay?: number) => {
    const id = window.setInterval(() => {
      if (!this.disposed) callback();
    }, delay);
    this.cleanup(() => window.clearInterval(id));
    return id;
  };
  requestAnimationFrame = (callback: FrameRequestCallback) => {
    const id = window.requestAnimationFrame((time) => {
      if (!this.disposed) callback(time);
    });
    this.cleanup(() => window.cancelAnimationFrame(id));
    return id;
  };
  createIntersectionObserver(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    const observer = new IntersectionObserver(callback, options);
    this.cleanup(() => observer.disconnect());
    return observer;
  }
  createResizeObserver(callback: ResizeObserverCallback) {
    const observer = new ResizeObserver(callback);
    this.cleanup(() => observer.disconnect());
    return observer;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.abort.abort();
    for (const callback of this.cleanups.reverse()) callback();
    this.cleanups = [];
    this.callbacks = [];
    this.actions.clear();
  }
}
