import { useCallback, useEffect, useRef, useState } from 'react';

type Initializer<T> = T | (() => T);
type SetValue<T> = (value: T | ((prev: T) => T)) => void;

function resolve<T>(initial: Initializer<T>): T {
  return initial instanceof Function ? initial() : initial;
}

function readValue<T>(key: string, initial: Initializer<T>): T {
  if (typeof window === 'undefined') return resolve(initial);
  try {
    const raw = window.localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : resolve(initial);
  } catch (error) {
    console.warn(`[useLocalStorage] Não foi possível ler "${key}":`, error);
    return resolve(initial);
  }
}

/**
 * Estado React sincronizado com o localStorage.
 * - Lê o valor salvo na primeira renderização (ou usa o valor inicial).
 * - Salva automaticamente a cada alteração.
 * - Sincroniza entre abas abertas do navegador.
 * Retorna [valor, setValor, removerChave].
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: Initializer<T>,
): [T, SetValue<T>, () => void] {
  const initialRef = useRef(initialValue);
  const [value, setStored] = useState<T>(() => readValue(key, initialValue));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`[useLocalStorage] Não foi possível salvar "${key}":`, error);
    }
  }, [key, value]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage || event.key !== key) return;
      if (event.newValue === null) {
        setStored(resolve(initialRef.current));
        return;
      }
      try {
        setStored(JSON.parse(event.newValue) as T);
      } catch {
        /* valor corrompido em outra aba: ignora */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  const setValue: SetValue<T> = useCallback((next) => {
    setStored((prev) => (next instanceof Function ? next(prev) : next));
  }, []);

  const remove = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignora */
    }
    setStored(resolve(initialRef.current));
  }, [key]);

  return [value, setValue, remove];
}
