import { Room, type Client } from 'colyseus';
import { ClosetRoomState } from '../schema/ClosetRoomState.js';

interface ClosetRoomCreateOptions {
  closetOwner?: string;
}

export class ClosetRoom extends Room<ClosetRoomState> {
  override onCreate(options: ClosetRoomCreateOptions = {}): void {
    const state = new ClosetRoomState();
    state.closetOwner = options.closetOwner ?? '';
    this.setState(state);
  }

  override onJoin(client: Client): void {
    this.state.visitors.push(client.sessionId);
  }

  override onLeave(client: Client): void {
    const idx = this.state.visitors.indexOf(client.sessionId);
    if (idx !== -1) this.state.visitors.splice(idx, 1);
  }
}
