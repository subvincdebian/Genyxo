'use client';
import { useEffect, useRef } from 'react';
import { ControllerScope } from './controller-scope';
import type { SyntheticEvent } from 'react';

export type Initializer = (scope: ControllerScope) => void;
export type ControllerLoader = () => Promise<Initializer>;

export function useController(loader: ControllerLoader) {
  const scopeRef = useRef<ControllerScope | null>(null);
  useEffect(() => {
    let cancelled = false;
    const scope = new ControllerScope();
    scopeRef.current = scope;
    loader().then(initialize => {
      if (cancelled) return;
      initialize(scope);
      scope.ready();
    }).catch(error => {
      if (cancelled) return;
      console.error('Page initialization failed', error instanceof Error ? error.message : 'Unknown error');
      const alert = document.createElement('div');
      alert.setAttribute('role', 'alert');
      alert.textContent = 'Unable to load this page. Please refresh to try again.';
      document.body.append(alert);
      scope.cleanup(() => alert.remove());
    });
    return () => { cancelled = true; scopeRef.current = null; scope.dispose(); };
  }, [loader]);
  return (name: string, event: SyntheticEvent<Element>) => {
    const currentTarget = event.currentTarget;
    const nativeEvent = new Proxy(event.nativeEvent, { get(target, key) {
      if (key === 'currentTarget') return currentTarget;
      if (key === 'preventDefault') return () => event.preventDefault();
      if (key === 'stopPropagation') return () => event.stopPropagation();
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    } });
    return scopeRef.current?.invoke(name, nativeEvent, currentTarget);
  };
}

