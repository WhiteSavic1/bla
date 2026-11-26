import { EventEmitter } from "events";

export type RealtimeEvent =
  | { type: "sync"; keys: string[]; ts: number }
  | { type: "room"; convId: string; ts: number }
  | { type: "call"; convId: string; ts: number }
  | { type: "typing"; convId: string; userId: string; nickname: string; ts: number };

const globalForBus = globalThis as unknown as {
  __personaRealtimeBus?: EventEmitter;
};

function getBus(): EventEmitter {
  if (!globalForBus.__personaRealtimeBus) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(500);
    globalForBus.__personaRealtimeBus = emitter;
  }
  return globalForBus.__personaRealtimeBus;
}

export function emitRealtimeEvent(ev: RealtimeEvent): void {
  getBus().emit("event", ev);
}

export function subscribeRealtimeEvents(
  listener: (ev: RealtimeEvent) => void
): () => void {
  const bus = getBus();
  bus.on("event", listener);
  return () => {
    bus.off("event", listener);
  };
}
