console.log("Serving at http://localhost:4590");

Bun.serve<{ room: string }>({
  async fetch(request, server) {
    const url = new URL(request.url);
    const room = url.searchParams.get("room") ?? "default";

    const success = server.upgrade(request, { data: { room: url.searchParams.has("meta") ? `${room}/meta` : room } });
    if (success) {
      // Bun automatically returns a 101 Switching Protocols
      // if the upgrade succeeds
      return undefined;
    }

    return new Response("Hello, world!");
  },

  websocket: {
    open(ws) {
      ws.subscribe(ws.data.room);
      console.log("WebSocket opened", ws.remoteAddress);
    },

    close(ws) {
      console.log("WebSocket closed", ws.remoteAddress);
    },

    message(ws, rawData) {
      ws.publish(ws.data.room, rawData);
    },
  },

  port: 4590,
});
