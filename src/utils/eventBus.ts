type Listener = (payload?: any) => void;

class EventBus {
  private listeners: Record<string, Listener[]> = {};

  on(event: string, cb: Listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
    return () => this.off(event, cb);
  }

  off(event: string, cb: Listener) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== cb);
  }

  emit(event: string, payload?: any) {
    (this.listeners[event] || []).slice().forEach(cb => {
      try { cb(payload); } catch (e) { console.error('EventBus listener error', e); }
    });
  }
}

export const eventBus = new EventBus();

export default eventBus;
