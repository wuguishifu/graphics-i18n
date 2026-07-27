/** Tiny least-recently-used cache built on Map's insertion order. */
export class LruCache<K, V> {
  private readonly map = new Map<K, V>();

  constructor(readonly maxEntries: number) {}

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key) as V;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value as K;
      this.map.delete(oldest);
    }
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }

  keys(): K[] {
    return [...this.map.keys()];
  }

  async getOrCreate(key: K, create: () => Promise<V>): Promise<V> {
    const existing = this.get(key);
    if (existing !== undefined) return existing;
    const value = await create();
    this.set(key, value);
    return value;
  }
}
