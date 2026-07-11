"use client";

class PageCache {
  private cache: Record<string, any> = {};

  get(key: string) {
    return this.cache[key];
  }

  set(key: string, value: any) {
    this.cache[key] = value;
  }

  clear() {
    this.cache = {};
  }
}

export const pageCache = new PageCache();
