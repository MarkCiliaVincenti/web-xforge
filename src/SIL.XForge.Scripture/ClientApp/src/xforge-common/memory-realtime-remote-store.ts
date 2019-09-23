import arrayDiff, { InsertDiff, MoveDiff, RemoveDiff } from 'arraydiff';
import * as OTJson0 from 'ot-json0';
import { EMPTY, Subject } from 'rxjs';
import { OTType, types } from 'sharedb/lib/client';
import { Snapshot } from './models/snapshot';
import { performQuery, QueryParameters } from './query-parameters';
import { RealtimeDocAdapter, RealtimeQueryAdapter, RealtimeRemoteStore } from './realtime-remote-store';
import { objectId } from './utils';

function addSnapshotDefaults(snapshot: Partial<Snapshot>): Snapshot {
  if (snapshot.id == null) {
    snapshot.id = objectId();
  }
  if (snapshot.data == null) {
    snapshot.data = {};
  }
  if (snapshot.v == null) {
    snapshot.v = 0;
  }
  if (snapshot.type == null) {
    snapshot.type = OTJson0.type.name;
  }
  return snapshot as Snapshot;
}

/**
 * This is the memory-based implementation of the real-time remote store. It is useful for testing.
 */
export class MemoryRealtimeRemoteStore extends RealtimeRemoteStore {
  private readonly snapshots = new Map<string, Map<string, Snapshot>>();

  addSnapshots<T>(collection: string, snapshots: Partial<Snapshot<T>>[]): void {
    let collectionSnapshots = this.snapshots.get(collection);
    if (collectionSnapshots == null) {
      collectionSnapshots = new Map<string, Snapshot>();
      this.snapshots.set(collection, collectionSnapshots);
    }
    for (const snapshot of snapshots) {
      collectionSnapshots.set(snapshot.id, addSnapshotDefaults(snapshot));
    }
  }

  addSnapshot<T>(collection: string, snapshot: Partial<Snapshot<T>>): void {
    let collectionSnapshots = this.snapshots.get(collection);
    if (collectionSnapshots == null) {
      collectionSnapshots = new Map<string, Snapshot>();
      this.snapshots.set(collection, collectionSnapshots);
    }
    collectionSnapshots.set(snapshot.id, addSnapshotDefaults(snapshot));
  }

  getSnapshots(collection: string): IterableIterator<Snapshot> {
    const collectionSnapshots = this.snapshots.get(collection);
    if (collectionSnapshots == null) {
      return [].values();
    }
    return collectionSnapshots.values();
  }

  clear(): void {
    this.snapshots.clear();
  }

  createDocAdapter(collection: string, id: string): RealtimeDocAdapter {
    const collectionSnapshots = this.snapshots.get(collection);
    let snapshot: Snapshot;
    if (collectionSnapshots != null) {
      snapshot = collectionSnapshots.get(id);
    }
    if (snapshot == null) {
      return new MemoryRealtimeDocAdapter(collection, id);
    }
    return new MemoryRealtimeDocAdapter(collection, id, snapshot.data, types.map[snapshot.type], snapshot.v);
  }

  createQueryAdapter(collection: string, parameters: QueryParameters): RealtimeQueryAdapter {
    return new MemoryRealtimeQueryAdapter(this, collection, parameters);
  }
}

/**
 * This is a memory-based implementation of the real-time document adapter interface. It is useful for unit tests.
 */
export class MemoryRealtimeDocAdapter implements RealtimeDocAdapter {
  readonly pendingOps: any[] = [];
  subscribed: boolean = false;
  version: number = -1;
  readonly remoteChanges$ = new Subject<any>();
  readonly create$ = new Subject<void>();
  readonly delete$ = new Subject<void>();
  readonly idle$ = EMPTY;

  constructor(
    public readonly collection: string,
    public readonly id: string,
    public data?: any,
    public type: OTType = OTJson0.type,
    version?: number
  ) {
    if (this.version != null) {
      this.version = version;
    } else if (this.data != null) {
      this.version = 0;
    }
  }

  create(data: any, type?: OTType): Promise<void> {
    this.data = data;
    this.type = type;
    this.version = 0;
    this.emitCreate();
    return Promise.resolve();
  }

  fetch(): Promise<void> {
    return Promise.resolve();
  }

  ingestSnapshot(_snapshot: Snapshot): Promise<void> {
    return Promise.resolve();
  }

  subscribe(): Promise<void> {
    this.subscribed = true;
    return Promise.resolve();
  }

  submitOp(op: any, source?: any): Promise<void> {
    if (op != null && this.type.normalize != null) {
      op = this.type.normalize(op);
    }
    this.data = this.type.apply(this.data, op);
    this.version++;
    if (!source) {
      this.emitRemoteChange(op);
    }
    return Promise.resolve();
  }

  exists(): Promise<boolean> {
    return Promise.resolve(true);
  }

  delete(): Promise<void> {
    this.data = undefined;
    this.version = -1;
    this.type = undefined;
    this.emitDelete();
    return Promise.resolve();
  }

  destroy(): Promise<void> {
    return Promise.resolve();
  }

  emitRemoteChange(op?: any): void {
    this.remoteChanges$.next(op);
  }

  emitCreate(): void {
    this.create$.next();
  }

  emitDelete(): void {
    this.delete$.next();
  }
}

export class MemoryRealtimeQueryAdapter implements RealtimeQueryAdapter {
  subscribed: boolean = false;
  ready: boolean = true;
  unpagedCount: number = 0;
  docIds: string[] = [];
  count: number = 0;

  readonly ready$ = new Subject<void>();
  readonly insert$ = new Subject<{ index: number; docIds: string[] }>();
  readonly remove$ = new Subject<{ index: number; docIds: string[] }>();
  readonly move$ = new Subject<{ from: number; to: number; length: number }>();
  readonly remoteChanges$ = new Subject<void>();

  constructor(
    private readonly remoteStore: MemoryRealtimeRemoteStore,
    public readonly collection: string,
    public readonly parameters: QueryParameters
  ) {}

  fetch(): Promise<void> {
    this.performQuery();
    this.ready = true;
    this.ready$.next();
    return Promise.resolve();
  }

  subscribe(_initialDocIds?: string[]): void {
    this.performQuery();
    this.subscribed = true;
    this.ready = true;
    this.ready$.next();
  }

  update(): void {
    if (this.performQuery()) {
      this.remoteChanges$.next();
    }
  }

  destroy(): void {}

  private performQuery(): boolean {
    let changed = false;
    const snapshots = Array.from(this.remoteStore.getSnapshots(this.collection));
    const [results, unpagedCount] = performQuery(this.parameters, snapshots);
    if (this.count !== results.length) {
      this.count = results.length;
      changed = true;
    }
    if (this.parameters.$count == null) {
      const before = this.docIds;
      const after = results.map(s => s.id);
      this.docIds = after;
      const diffs = arrayDiff(before, after);
      for (const diff of diffs) {
        switch (diff.type) {
          case 'insert':
            const insertDiff = diff as InsertDiff;
            this.insert$.next({ index: insertDiff.index, docIds: insertDiff.values });
            break;

          case 'remove':
            const removeDiff = diff as RemoveDiff;
            this.remove$.next({
              index: removeDiff.index,
              docIds: before.slice(removeDiff.index, removeDiff.index + removeDiff.howMany)
            });
            break;

          case 'move':
            const moveDiff = diff as MoveDiff;
            this.move$.next({ from: moveDiff.from, to: moveDiff.to, length: moveDiff.howMany });
            break;
        }

        changed = true;
      }
    }
    this.unpagedCount = unpagedCount;
    return changed;
  }
}
