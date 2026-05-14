import { ArraySchema, Schema, type } from '@colyseus/schema';

export class ClosetRoomState extends Schema {
  @type('string') closetOwner = '';
  @type(['string']) visitors = new ArraySchema<string>();
}
