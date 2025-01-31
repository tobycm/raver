import * as v from "valibot";

const JoinRoomSchema = v.object({
  type: v.literal("join"),
  room: v.string(),
});

const LeaveRoomSchema = v.object({
  type: v.literal("leave"),
  room: v.string(),
});

const DataMessageSchema = v.object({
  type: v.literal("data"),
  data: v.any(),
});

export const MessageSchema = v.variant("type", [JoinRoomSchema, LeaveRoomSchema, DataMessageSchema]);
