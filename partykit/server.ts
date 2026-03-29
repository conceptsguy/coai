import type * as Party from "partykit/server";
import { onConnect, type YPartyKitOptions } from "y-partykit";

/**
 * PartyKit server for coai Yjs document sync.
 *
 * Each room corresponds to a project ID.
 * Uses PartyKit's built-in Durable Object storage for persistence.
 * The callback handler syncs messages to Supabase for server-side AI routes.
 */

const YJS_OPTIONS: YPartyKitOptions = {
  persist: { mode: "snapshot" },
  gc: false,
  callback: {
    handler: async (doc) => {
      // Future: sync messages to Supabase here for AI API routes
      // For now, the client-side ChatSidebar still writes messages
      // to Supabase directly via the existing API routes
    },
    debounceWait: 2000,
    debounceMaxWait: 10000,
  },
};

export default class YjsServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  async onConnect(conn: Party.Connection) {
    return onConnect(conn, this.room, YJS_OPTIONS);
  }
}
