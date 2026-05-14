import { Client, Room } from 'colyseus';
import { ClosetRoomState } from '../schema/ClosetRoomState.js';

interface ClosetRoomCreateOptions {
  closetOwner?: string;
}

interface ClosetRoomJoinOptions {
  userId?: string;
}

export class ClosetRoom extends Room<ClosetRoomState> {
  override onCreate(options: ClosetRoomCreateOptions = {}): void {
    const state = new ClosetRoomState();
    state.closetOwner = options.closetOwner ?? '';
    this.setState(state);
  }

  override onJoin(client: Client, options: ClosetRoomJoinOptions = {}): void {
    const visitorId = options.userId ?? client.sessionId;
    this.state.visitors.push(visitorId);
  }

  override onLeave(client: Client): void {
    const idx = this.state.visitors.indexOf(client.sessionId);
    if (idx !== -1) this.state.visitors.splice(idx, 1);
  }
}
