import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { formatTime } from "@/lib/player";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Copy,
  DoorOpen,
  Link2,
  Maximize,
  MessageSquare,
  Mic,
  MicOff,
  MonitorPlay,
  Pause,
  Play,
  Radio,
  Search,
  SkipBack,
  SkipForward,
  Users,
  Video,
  VideoOff,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Talk = Doc<"dhammaTalks">;

type RoomState = {
  _id: string;
  code: string;
  hostId: Id<"users">;
  isHost: boolean;
  youtubeId?: string;
  isPlaying: boolean;
  positionSec: number
  stateUpdatedAt: number;
  hostName: string;
  members: { userId: Id<"users">; name: string; micOn: boolean; camOn: boolean }[];
};

/* ------------------------------------------------------------------ */
/* Loader YouTube IFrame API (riêng cho trang này)                     */
/* ------------------------------------------------------------------ */

let ytApiPromise: Promise<YTNamespace> | null = null;
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: Record<string, unknown>,
  ) => YTPlayerLike;
  PlayerState: { PLAYING: number; PAUSED: number; BUFFERING: number; ENDED: number };
};
type YTPlayerLike = {
  loadVideoById(id: string): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(sec: number, allow: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  mute(): void;
  unMute(): void;
  destroy(): void;
};

function loadYT(): Promise<YTNamespace> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const w = window as unknown as {
      YT?: YTNamespace;
      onYouTubeIframeAPIReady?: () => void;
    };
    if (w.YT?.Player) return resolve(w.YT);
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(w.YT!);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

/* ------------------------------------------------------------------ */
/* Trang chính                                                         */
/* ------------------------------------------------------------------ */

export default function WatchTogether() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const create = useMutation(api.watchRooms.create);
  const join = useMutation(api.watchRooms.join);
  const heartbeat = useMutation(api.watchRooms.heartbeat);
  const [joining, setJoining] = useState(false);
  const [codeInput, setCodeInput] = useState("");

  // Mã phòng đang tham gia (lưu phiên để F5 không rơi ra)
  const [code, setCode] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const url = new URL(window.location.href);
    return url.searchParams.get("room") ?? sessionStorage.getItem("watchRoom");
  });

  const room = useQuery(
    api.watchRooms.getRoom,
    code ? { code } : "skip",
  ) as RoomState | null | undefined;

  // Đã xác thực chưa (query trả null khi chưa là thành viên)
  const inRoom = code !== null && room !== null && room !== undefined;

  // Tự join khi mở link ?room=CODE
  useEffect(() => {
    if (!code || inRoom || joining || !isAuthenticated) return;
    setJoining(true);
    join({ code })
      .then(() => sessionStorage.setItem("watchRoom", code))
      .catch((e: Error) => {
        toast.error(e.message);
        setCode(null);
        sessionStorage.removeItem("watchRoom");
      })
      .finally(() => setJoining(false));
  }, [code, inRoom, joining, join, isAuthenticated]);

  // Heartbeat mỗi 10s; rời phòng khi đóng trang
  useEffect(() => {
    if (!inRoom || !code) return;
    const hb = () => void heartbeat({ code, present: true });
    hb();
    const iv = window.setInterval(hb, 10_000);
    const leave = () => void heartbeat({ code, present: false });
    window.addEventListener("pagehide", leave);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [inRoom, code, heartbeat]);

  const leaveRoom = useCallback(() => {
    if (code) void heartbeat({ code, present: false });
    sessionStorage.removeItem("watchRoom");
    const url = new URL(window.location.href);
    url.searchParams.delete("room");
    window.history.replaceState(null, "", url.toString());
    setCode(null);
  }, [code, heartbeat]);

  if (authLoading) {
    return <LobbyShell />;
  }

  if (!isAuthenticated) {
    return (
      <LobbyShell>
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-8 text-center shadow-xl">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/15">
              <MonitorPlay className="h-8 w-8 text-gold" />
            </span>
            <h2 className="mt-5 text-lg font-bold text-zinc-100">
              Vui lòng đăng nhập để sử dụng tính năng này
            </h2>
            <p className="mt-2 text-xs text-zinc-500">
              Đăng nhập đang được nâng cấp — hãy quay lại sau.
            </p>
          </div>
        </div>
      </LobbyShell>
    );
  }

  if (inRoom && room) {
    return (
      <RoomView
        room={room}
        myId={user?._id}
        myName={user?.dhammaName || user?.name || "Ẩn danh"}
        onLeave={leaveRoom}
      />
    );
  }

  /* ---------- Sảnh: tạo / tham gia phòng (w2g style) ---------- */
  return (
    <LobbyShell>
      <div className="mx-auto w-full max-w-2xl">
        {/* Tiêu đề w2g style */}
        <div className="mb-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/30 to-gold/5 ring-1 ring-gold/30">
            <MonitorPlay className="h-8 w-8 text-gold" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Xem cùng nhau
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Tạo phòng, gửi mã cho bạn bè và cùng xem pháp thoại theo thời gian
            thực — có mic, camera và chat.
          </p>
        </div>

        <div className="grid gap-4">
          {/* Tạo phòng */}
          <button
            type="button"
            disabled={joining}
            onClick={async () => {
              try {
                const res = await create({});
                sessionStorage.setItem("watchRoom", res.code);
                const url = new URL(window.location.href);
                url.searchParams.set("room", res.code);
                window.history.replaceState(null, "", url.toString());
                setCode(res.code);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Lỗi tạo phòng");
              }
            }}
            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900/70 p-5 text-left transition hover:border-gold/40 hover:bg-zinc-800/80"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold/15 transition group-hover:bg-gold/25">
              <Link2 className="h-5.5 w-5.5 text-gold" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-zinc-100">
                Tạo phòng mới
              </span>
              <span className="mt-0.5 block text-sm text-zinc-500">
                Bạn là chủ phòng — chọn video và điều khiển cho cả phòng
              </span>
            </span>
            <span className="text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-gold">
              →
            </span>
          </button>

          {/* Tham gia */}
          <form
            className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              const c = codeInput.trim().toUpperCase();
              if (c.length < 4) {
                toast.error("Mã phòng không hợp lệ.");
                return;
              }
              sessionStorage.setItem("watchRoom", c);
              setCode(c);
            }}
          >
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5">
                <Users className="h-5.5 w-5.5 text-zinc-300" />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block font-semibold text-zinc-100">
                  Tham gia bằng mã
                </span>
                <span className="mt-0.5 block text-sm text-zinc-500">
                  Nhập mã phòng 6 ký tự bạn bè gửi cho bạn
                </span>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="VD: K7M2XQ"
                maxLength={6}
                className="h-11 flex-1 rounded-xl border border-white/10 bg-black/40 px-4 text-center font-mono text-lg tracking-[0.35em] text-zinc-100 uppercase outline-none placeholder:text-zinc-600 focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
              />
              <Button
                type="submit"
                disabled={joining}
                className="h-11 rounded-xl bg-gold px-6 font-semibold text-black hover:bg-gold/90"
              >
                Vào phòng
              </Button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Mã phòng gồm 6 ký tự — dễ chia sẻ qua tin nhắn.
        </p>
      </div>
    </LobbyShell>
  );
}

/* ------------------------------------------------------------------ */
/* Khung sảnh tối (được dùng cho mọi trạng thái ngoài phòng)           */
/* ------------------------------------------------------------------ */

function LobbyShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      <div className="mx-auto flex min-h-[60vh] w-full max-w-5xl flex-col justify-center px-4 py-10">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Phòng đang hoạt động — layout w2g.tv                                */
/* ------------------------------------------------------------------ */

function RoomView({
  room,
  myId,
  myName,
  onLeave,
}: {
  room: RoomState;
  myId?: Id<"users">;
  myName: string;
  onLeave(): void;
}) {
  const setState = useMutation(api.watchRooms.setState);
  const setMediaState = useMutation(api.watchRooms.setMediaState);
  const sendSignal = useMutation(api.watchRooms.sendSignal);
  const drainSignals = useMutation(api.watchRooms.drainSignals);
  const sendChat = useMutation(api.watchRooms.sendChat);

  const [showPicker, setShowPicker] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);

  /* ---------- Trình phát đồng bộ ---------- */
  const ytHostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerLike | null>(null);
  const [ready, setReady] = useState(false);
  const [curPos, setCurPos] = useState(0);
  const [curDur, setCurDur] = useState(0);

  // Mục tiêu vị trí theo trạng thái phòng
  const targetSec = useCallback(() => {
    const elapsed = room.isPlaying ? (Date.now() - room.stateUpdatedAt) / 1000 : 0;
    return room.positionSec + elapsed;
  }, [room.isPlaying, room.positionSec, room.stateUpdatedAt]);

  useEffect(() => {
    let cancelled = false;
    loadYT().then((YT) => {
      if (cancelled || !ytHostRef.current || playerRef.current) return;
      const mount = document.createElement("div");
      ytHostRef.current.appendChild(mount);
      playerRef.current = new YT.Player(mount, {
        width: "100%",
        height: "100%",
        playerVars: { playsinline: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: () => setReady(true),
        },
      });
    });
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* noop */
      }
      playerRef.current = null;
      if (ytHostRef.current) ytHostRef.current.innerHTML = "";
    };
  }, []);

  // Khi video đổi → load + tua tới mục tiêu
  const lastVideoRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!ready || !playerRef.current) return;
    if (room.youtubeId && lastVideoRef.current !== room.youtubeId) {
      lastVideoRef.current = room.youtubeId;
      playerRef.current.loadVideoById(room.youtubeId);
      playerRef.current.seekTo(targetSec(), true);
      if (room.isPlaying) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    }
  }, [ready, room.youtubeId, room.isPlaying, targetSec]);

  // Đồng bộ play/pause + sửa trôi > 2s mỗi 3s
  useEffect(() => {
    if (!ready || !playerRef.current || !room.youtubeId) return;
    const p = playerRef.current;
    const enforce = () => {
      const t = targetSec();
      let cur = 0;
      try {
        cur = p.getCurrentTime();
      } catch {
        return;
      }
      if (Math.abs(cur - t) > 2) p.seekTo(t, true);
      if (room.isPlaying) p.playVideo();
      else p.pauseVideo();
    };
    enforce();
    const iv = window.setInterval(enforce, 3000);
    return () => window.clearInterval(iv);
  }, [ready, room.isPlaying, room.youtubeId, targetSec]);

  // Vòng 500ms: cập nhật hiển thị thời gian
  useEffect(() => {
    if (!room.youtubeId) return;
    const iv = window.setInterval(() => {
      try {
        const p = playerRef.current;
        if (!p) return;
        setCurPos(p.getCurrentTime());
        const d = p.getDuration();
        if (d > 0) setCurDur(d);
      } catch {
        /* noop */
      }
    }, 500);
    return () => window.clearInterval(iv);
  }, [room.youtubeId]);

  // Host báo vị trí mỗi 10s khi đang phát
  useEffect(() => {
    if (!room.isHost || !room.isPlaying || !room.youtubeId) return;
    const iv = window.setInterval(() => {
      try {
        const cur = playerRef.current?.getCurrentTime() ?? 0;
        void setState({
          code: room.code,
          isPlaying: true,
          positionSec: cur,
        });
      } catch {
        /* noop */
      }
    }, 10_000);
    return () => window.clearInterval(iv);
  }, [room.isHost, room.isPlaying, room.youtubeId, room.code, setState]);

  /* ---------- WebRTC mesh: mic/cam ---------- */
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    { userId: string; name: string; stream: MediaStream }[]
  >([]);
  const membersKey = room.members.map((m) => m.userId).join(",");

  const getLocalStream = useCallback(async (video: boolean) => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video,
    });
    localStreamRef.current = stream;
    return stream;
  }, []);

  const ensurePeer = useCallback(
    async (peerId: string, initiator: boolean) => {
      let pc = peersRef.current.get(peerId);
      if (pc) return pc;
      pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peersRef.current.set(peerId, pc);

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          void sendSignal({
            code: room.code,
            toId: peerId as Id<"users">,
            payload: JSON.stringify({ kind: "ice", data: e.candidate.toJSON() }),
          });
        }
      };
      pc.ontrack = (e) => {
        const [stream] = e.streams;
        setRemoteStreams((rs) => {
          const others = rs.filter((r) => r.userId !== peerId);
          return [...others, { userId: peerId, name: memberName(peerId), stream }];
        });
      };

      // Thêm track local đang có
      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) {
          pc.addTrack(track, localStreamRef.current);
        }
      }

      if (initiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        void sendSignal({
          code: room.code,
          toId: peerId as Id<"users">,
          payload: JSON.stringify({ kind: "offer", data: offer }),
        });
      }
      return pc;
    },
    [room.code, sendSignal],
  );

  const memberName = useCallback(
    (id: string) => room.members.find((m) => m.userId === id)?.name ?? "Bạn cùng phòng",
    [room.members],
  );

  // Thiết lập mesh: userId nhỏ hơn làm initiator
  useEffect(() => {
    if (!myId) return;
    if (!room.youtubeId && !micOn && !camOn) return;
    for (const m of room.members) {
      if (m.userId === myId) continue;
      const initiator = String(m.userId) < String(myId);
      void ensurePeer(m.userId, initiator);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membersKey, myId]);

  // Nhận + xử lý tín hiệu mỗi 1s
  useEffect(() => {
    if (!room.youtubeId && !micOn && !camOn) return;
    const iv = window.setInterval(async () => {
      try {
        const signals = await drainSignals({ code: room.code });
        for (const sig of signals) {
          const msg = JSON.parse(sig.payload) as {
            kind: "offer" | "answer" | "ice";
            data: unknown;
          };
          const pc = await ensurePeer(sig.fromId, false);
          if (msg.kind === "offer") {
            await pc.setRemoteDescription(
              new RTCSessionDescription(msg.data as RTCSessionDescriptionInit),
            );
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            void sendSignal({
              code: room.code,
              toId: sig.fromId,
              payload: JSON.stringify({ kind: "answer", data: answer }),
            });
          } else if (msg.kind === "answer") {
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(
                new RTCSessionDescription(msg.data as RTCSessionDescriptionInit),
              );
            }
          } else if (msg.kind === "ice") {
            try {
              await pc.addIceCandidate(msg.data as RTCIceCandidateInit);
            } catch {
              /* candidate đến trễ */
            }
          }
        }
      } catch {
        /* poll lỗi nhẹ — bỏ qua */
      }
    }, 1000);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.code, micOn, camOn]);

  // Bật/tắt mic
  const toggleMic = async () => {
    try {
      const next = !micOn;
      if (next) {
        const stream = await getLocalStream(camOn);
        stream.getAudioTracks().forEach((t) => (t.enabled = true));
        for (const [, pc] of peersRef.current) {
          for (const t of stream.getAudioTracks()) {
            const exists = pc.getSenders().some((s) => s.track === t);
            if (!exists) pc.addTrack(t, stream);
          }
        }
      } else if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = false;
          t.stop();
          localStreamRef.current?.removeTrack(t);
        });
      }
      setMicOn(next);
      await setMediaState({ code: room.code, micOn: next, camOn });
    } catch {
      toast.error("Không truy cập được micro.");
    }
  };

  // Bật/tắt cam
  const toggleCam = async () => {
    try {
      const next = !camOn;
      if (next) {
        const stream = await getLocalStream(true);
        stream.getVideoTracks().forEach((t) => (t.enabled = true));
        for (const [, pc] of peersRef.current) {
          for (const t of stream.getVideoTracks()) {
            const exists = pc.getSenders().some((s) => s.track === t);
            if (!exists) pc.addTrack(t, stream);
          }
        }
        if (!micOn) setMicOn(true);
      } else if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => {
          t.stop();
          localStreamRef.current?.removeTrack(t);
        });
      }
      setCamOn(next);
      await setMediaState({ code: room.code, micOn: next ? true : micOn, camOn: next });
    } catch {
      toast.error("Không truy cập được camera.");
    }
  };

  /* ---------- Chat ---------- */
  const chat = useQuery(api.watchRooms.listChat, {
    code: room.code,
  }) as Doc<"roomChat">[] | undefined;
  const [chatText, setChatText] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight });
  }, [chat?.length]);

  /* ---------- Layout w2g.tv: video trên, chat phải, chân điều khiển ---------- */
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      {/* ===== Hàng trên: video + sidebar ===== */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* ----- Cột trái: màn hình điện ảnh ----- */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Player */}
          <div className="relative w-full bg-black">
            <div className="mx-auto aspect-video w-full max-h-[70vh] lg:max-h-[78vh]">
              <div ref={ytHostRef} className="h-full w-full" />
              {!room.youtubeId && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-zinc-900 to-black text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 ring-1 ring-gold/30">
                    <MonitorPlay className="h-7 w-7 text-gold" />
                  </span>
                  <p className="text-sm text-zinc-400">
                    {room.isHost
                      ? "Chọn một pháp thoại để cả phòng cùng xem"
                      : "Chủ phòng chưa chọn video"}
                  </p>
                  {room.isHost && (
                    <Button
                      size="sm"
                      onClick={() => setShowPicker(true)}
                      className="mt-1 rounded-full bg-gold font-medium text-black hover:bg-gold/90"
                    >
                      Chọn video
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Thanh điều khiển dưới video (w2g style) */}
          <div className="border-b border-white/5 bg-zinc-900/60 px-3 py-2.5 backdrop-blur">
            <div className="flex items-center gap-3">
              {/* Nút phát chính */}
              {room.isHost && room.youtubeId && (
                <button
                  type="button"
                  onClick={() =>
                    void setState({
                      code: room.code,
                      isPlaying: !room.isPlaying,
                      positionSec: (() => {
                        try {
                          return playerRef.current?.getCurrentTime() ?? room.positionSec;
                        } catch {
                          return room.positionSec;
                        }
                      })(),
                    })
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-black shadow transition hover:scale-105 hover:bg-gold/90"
                  aria-label={room.isPlaying ? "Tạm dừng cho cả phòng" : "Phát cho cả phòng"}
                >
                  {room.isPlaying ? (
                    <Pause className="h-5 w-5 fill-current" />
                  ) : (
                    <Play className="ml-0.5 h-5 w-5 fill-current" />
                  )}
                </button>
              )}
              {!room.isHost && room.youtubeId && (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-zinc-400">
                  <Radio className="h-4.5 w-4.5 animate-pulse text-gold" />
                </span>
              )}

              {/* Thời gian + thanh tua */}
              {room.youtubeId && (
                <>
                  <span className="hidden w-12 shrink-0 text-right font-mono text-xs tabular-nums text-zinc-400 sm:block">
                    {formatTime(curPos)}
                  </span>
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gold transition-[width] duration-500"
                      style={{
                        width: `${
                          curDur > 0 ? Math.min(100, (curPos / curDur) * 100) : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span className="hidden w-12 shrink-0 font-mono text-xs tabular-nums text-zinc-400 sm:block">
                    {formatTime(curDur)}
                  </span>
                </>
              )}

              {/* Mã phòng + hành động */}
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(room.code);
                    toast.success(`Đã sao chép mã phòng: ${room.code}`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 font-mono text-xs font-bold tracking-widest text-gold transition hover:bg-gold/20"
                  title="Bấm để sao chép mã"
                >
                  <Copy className="h-3 w-3" />
                  {room.code}
                </button>

                {room.isHost && room.youtubeId && (
                  <button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    title="Đổi video"
                    className="hidden h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100 sm:flex"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onLeave}
                  title="Rời phòng"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
                >
                  <DoorOpen className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Dải mic/cam của tôi */}
          <div className="flex items-center gap-2 px-4 py-2.5">
            <span className="mr-1 text-xs font-medium text-zinc-500">Của bạn:</span>
            <button
              type="button"
              onClick={() => void toggleMic()}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition",
                micOn
                  ? "bg-gold/20 text-gold ring-1 ring-gold/40"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10",
              )}
            >
              {micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
              {micOn ? "Mic bật" : "Mic tắt"}
            </button>
            <button
              type="button"
              onClick={() => void toggleCam()}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition",
                camOn
                  ? "bg-gold/20 text-gold ring-1 ring-gold/40"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10",
              )}
            >
              {camOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
              {camOn ? "Cam bật" : "Cam tắt"}
            </button>

            {/* Tiles video của mọi người (khi bật) */}
            <div className="ml-auto flex items-center gap-1.5">
              {camOn && localStreamRef.current && (
                <LocalVideo stream={localStreamRef.current} />
              )}
              {remoteStreams.map((rs) => (
                <RemoteVideo key={rs.userId} stream={rs.stream} />
              ))}
            </div>
          </div>
        </div>

        {/* ----- Sidebar phải: thành viên + chat ----- */}
        <aside className="flex w-full shrink-0 flex-col border-t border-white/5 bg-zinc-900/40 lg:w-[21rem] lg:border-l lg:border-t-0">
          {/* Thành viên */}
          <div className="border-b border-white/5 px-4 py-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
              <Users className="h-3.5 w-3.5 text-gold" />
              Thành viên · {room.members.length}
            </h3>
            <div className="mt-2.5 space-y-1">
              {room.members.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold/40 to-gold/10 text-[11px] font-bold text-gold ring-1 ring-gold/20">
                    {m.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-sm",
                      m.userId === myId ? "font-semibold text-gold" : "text-zinc-300",
                    )}
                  >
                    {m.name}
                    {m.userId === myId && " (bạn)"}
                  </span>
                  {m.micOn ? (
                    <Mic className="h-3.5 w-3.5 shrink-0 text-gold/80" />
                  ) : (
                    <MicOff className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                  )}
                  {m.camOn ? (
                    <Video className="h-3.5 w-3.5 shrink-0 text-gold/80" />
                  ) : (
                    <VideoOff className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
              <MessageSquare className="h-3.5 w-3.5 text-gold" />
              Nhắn tin trong phòng
            </div>
            <div
              ref={chatScrollRef}
              className="min-h-40 flex-1 space-y-2.5 overflow-y-auto px-4 py-3"
            >
              {(chat ?? []).length === 0 && (
                <p className="py-8 text-center text-xs text-zinc-600">
                  Chưa có tin nhắn. Chào cả phòng nhé!
                </p>
              )}
              {(chat ?? []).map((c) => (
                <div key={c._id} className="text-sm leading-snug">
                  <span
                    className={cn(
                      "font-semibold",
                      c.name === myName ? "text-gold" : "text-zinc-300",
                    )}
                  >
                    {c.name}
                  </span>
                  <span className="text-zinc-500">: </span>
                  <span className="text-zinc-200">{c.text}</span>
                </div>
              ))}
            </div>
            <form
              className="flex gap-2 border-t border-white/5 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const t = chatText.trim();
                if (!t) return;
                setChatText("");
                void sendChat({ code: room.code, text: t });
              }}
            >
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Nhắn tin…"
                className="h-10 flex-1 rounded-full border border-white/10 bg-black/40 px-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!chatText.trim()}
                className="h-10 rounded-full bg-gold px-5 font-semibold text-black hover:bg-gold/90"
              >
                Gửi
              </Button>
            </form>
          </div>
        </aside>
      </div>

      {/* Chọn video (host) */}
      {showPicker && (
        <VideoPicker
          onClose={() => setShowPicker(false)}
          onPick={(talk) => {
            lastVideoRef.current = undefined; // buộc load lại
            void setState({
              code: room.code,
              youtubeId: talk.youtubeId,
              isPlaying: true,
              positionSec: 0,
            });
            setShowPicker(false);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Video elements cho WebRTC                                           */
/* ------------------------------------------------------------------ */

function LocalVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      className="h-16 w-24 rounded-lg border border-gold/30 object-cover shadow-md"
    />
  );
}

function RemoteVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      className="h-16 w-24 rounded-lg border border-white/10 object-cover shadow-md"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Hộp chọn video từ kho pháp thoại (w2g style tối)                    */
/* ------------------------------------------------------------------ */

function VideoPicker({
  onClose,
  onPick,
}: {
  onClose(): void;
  onPick(talk: Talk): void;
}) {
  const talks = useQuery(api.dhamma.list, { limit: 400 }) as Talk[] | undefined;
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!talks) return [];
    const s = q.trim().toLowerCase();
    if (!s) return talks.slice(0, 40);
    return talks
      .filter(
        (t) =>
          t.title.toLowerCase().includes(s) ||
          t.teacher.toLowerCase().includes(s),
      )
      .slice(0, 40);
  }, [talks, q]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      aria-hidden
    >
      <div
        className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-100">
            Chọn pháp thoại cho cả phòng
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-zinc-200"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="border-b border-white/5 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tiêu đề hoặc giảng sư…"
              className="h-10 w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-gold/50"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-500">
              Không tìm thấy bài phù hợp.
            </p>
          )}
          {filtered.map((t) => (
            <button
              key={t._id}
              type="button"
              onClick={() => onPick(t)}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/5"
            >
              <span className="relative block w-28 shrink-0 overflow-hidden rounded-lg bg-black">
                <img
                  src={`https://i.ytimg.com/vi/${t.youtubeId}/mqdefault.jpg`}
                  alt=""
                  className="aspect-video w-full object-cover"
                  loading="lazy"
                />
                <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] tabular-nums text-white">
                  {formatTime(t.durationSec)}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-sm font-medium text-zinc-100">
                  {t.title}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                  {t.teacher}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
