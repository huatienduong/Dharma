import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { formatTime } from "@/lib/player";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Copy,
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  MonitorPlay,
  Pause,
  Play,
  Radio,
  Search,
  Users,
  Video,
  VideoOff,
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
  positionSec: number;
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
    return (
      <AppShell title="Phòng">
        <p className="animate-pulse text-sm text-muted-foreground">Đang tải…</p>
      </AppShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppShell title="Phòng">
        <div className="mx-auto max-w-md rounded-2xl border border-gold/30 bg-gradient-to-b from-gold/10 to-transparent p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/15">
            <MonitorPlay className="h-7 w-7 text-gold" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">
            Xem video cùng nhau, trực tiếp
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Tạo phòng riêng, mời bạn bè cùng xem pháp thoại đúng một nhịp và
            nói chuyện qua mic/cam. Đăng nhập để nhận diện thành viên trong phòng.
          </p>
          <Button className="mt-5" onClick={() => (window.location.href = "/auth?returnTo=%2Fwatch")}>
            Đăng nhập để bắt đầu
          </Button>
        </div>
      </AppShell>
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

  /* ---------- Màn hình tạo / tham gia phòng ---------- */
  return (
    <AppShell
      title="Phòng — Xem Phật pháp cùng nhau"
      subtitle="Phòng riêng — xem đồng bộ một nhịp, trò chuyện qua mic & cam"
    >
      <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-gold/25 bg-gradient-to-b from-gold/10 to-card/50 p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15">
            <MonitorPlay className="h-5.5 w-5.5 text-gold" />
          </span>
          <h2 className="mt-3 font-semibold">Tạo phòng mới</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Bạn là chủ phòng: chọn video, điều khiển phát/tạm dừng/tua cho cả
            phòng.
          </p>
          <Button
            className="mt-4 w-full"
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
          >
            Tạo phòng riêng
          </Button>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/60 p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5.5 w-5.5 text-primary" />
          </span>
          <h2 className="mt-3 font-semibold">Tham gia bằng mã</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Nhập mã phòng 6 ký tự bạn bè gửi cho bạn.
          </p>
          <form
            className="mt-4 flex gap-2"
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
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="VD: K7M2XQ"
              maxLength={6}
              className="h-10 flex-1 rounded-xl border border-border/70 bg-background/80 px-3 text-center font-mono text-lg tracking-widest uppercase outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
            <Button type="submit" disabled={joining}>
              Vào phòng
            </Button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/* Phòng đang hoạt động                                                */
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
  const lastEnforceRef = useRef(0);
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

  // Thiết lập mesh: userId nhỏ hơn làm initiator (tránh cả hai cùng offer)
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
        if (!micOn) setMicOn(true); // cam đi kèm mic
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

  /* ---------- Render ---------- */
  return (
    <AppShell
      title="Phòng"
      subtitle={`Chủ phòng: ${room.hostName}`}
      actions={
        <Button variant="outline" size="sm" onClick={onLeave} className="gap-1.5">
          <LogOut className="h-3.5 w-3.5" /> Rời phòng
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        {/* Cột trái: video + điều khiển */}
        <div className="min-w-0 space-y-3">
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-black shadow-md">
            <div className="aspect-video w-full">
              <div ref={ytHostRef} className="h-full w-full" />
              {!room.youtubeId && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-muted/80 to-black/90 text-center text-sm text-white/70">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/20">
                    <MonitorPlay className="h-6 w-6 text-gold" />
                  </span>
                  {room.isHost
                    ? "Chọn một pháp thoại để cả phòng cùng xem"
                    : "Chủ phòng chưa chọn video"}
                </div>
              )}
            </div>
          </div>

          {/* Mã phòng + điều khiển host */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(room.code);
                toast.success(`Đã sao chép mã phòng: ${room.code}`);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-gold/50 bg-gold/10 px-3 py-1.5 font-mono text-sm font-bold tracking-widest text-gold transition hover:bg-gold/20"
              title="Bấm để sao chép mã"
            >
              <Copy className="h-3.5 w-3.5" />
              {room.code}
            </button>

            {room.isHost && (
              <>
                <Button size="sm" variant="secondary" onClick={() => setShowPicker(true)}>
                  Chọn video
                </Button>
                {room.youtubeId && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    aria-label={room.isPlaying ? "Tạm dừng cho cả phòng" : "Phát cho cả phòng"}
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
                  >
                    {room.isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </>
            )}
            {!room.isHost && room.youtubeId && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Radio className="h-3.5 w-3.5 animate-pulse text-gold" />
                {room.isPlaying ? "Đang phát đồng bộ" : "Đã tạm dừng"} · chỉ chủ
                phòng điều khiển
              </span>
            )}
          </div>

          {/* Dải mic/cam của tôi + tiles của mọi người */}
          <section className="rounded-2xl border border-border/60 bg-card/60 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-gold" />
              Thành viên ({room.members.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {(myName || "B").slice(0, 1).toUpperCase()}
                </div>
                <span className="max-w-28 truncate text-xs font-medium">{myName} (bạn)</span>
                <button
                  type="button"
                  onClick={() => void toggleMic()}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition",
                    micOn ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                  title={micOn ? "Tắt mic" : "Bật mic"}
                >
                  {micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleCam()}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition",
                    camOn ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                  title={camOn ? "Tắt cam" : "Bật cam"}
                >
                  {camOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
                </button>
                {camOn && localStreamRef.current && <LocalVideo stream={localStreamRef.current} />}
              </div>

              {room.members
                .filter((m) => m.userId !== myId)
                .map((m) => {
                  const rs = remoteStreams.find((r) => r.userId === m.userId);
                  return (
                    <div
                      key={m.userId}
                      className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold">
                        {m.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="max-w-28 truncate text-xs font-medium">{m.name}</span>
                      {m.micOn ? (
                        <Mic className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <MicOff className="h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                      {m.camOn ? (
                        <Video className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <VideoOff className="h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                      {rs && <RemoteVideo stream={rs.stream} />}
                    </div>
                  );
                })}
            </div>
          </section>
        </div>

        {/* Cột phải: chat */}
        <aside className="flex max-h-[32rem] min-h-80 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 lg:max-h-none">
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5 text-sm font-medium">
            <MessageSquare className="h-4 w-4 text-gold" />
            Nhắn tin trong phòng
          </div>
          <div ref={chatScrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
            {(chat ?? []).length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Chưa có tin nhắn. Chào cả phòng nhé!
              </p>
            )}
            {(chat ?? []).map((c) => (
              <div key={c._id} className="text-sm leading-snug">
                <span className="font-medium text-gold">{c.name}: </span>
                <span className="text-foreground/90">{c.text}</span>
              </div>
            ))}
          </div>
          <form
            className="flex gap-2 border-t border-border/60 p-3"
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
              className="h-9 flex-1 rounded-lg border border-border/70 bg-background/80 px-3 text-sm outline-none focus:border-primary/50"
            />
            <Button type="submit" size="sm" disabled={!chatText.trim()}>
              Gửi
            </Button>
          </form>
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
    </AppShell>
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
      className="h-14 w-20 rounded-lg border border-border/60 object-cover"
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
      className="h-14 w-20 rounded-lg border border-border/60 object-cover"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Hộp chọn video từ kho pháp thoại                                    */
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
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      aria-hidden
    >
      <div
        className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h3 className="text-sm font-semibold">Chọn pháp thoại cho cả phòng</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="border-b border-border/60 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tiêu đề hoặc giảng sư…"
              className="h-10 w-full rounded-xl border border-border/70 bg-background/80 pl-9 pr-3 text-sm outline-none focus:border-primary/50"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Không tìm thấy bài phù hợp.
            </p>
          )}
          {filtered.map((t) => (
            <button
              key={t._id}
              type="button"
              onClick={() => onPick(t)}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-accent/60"
            >
              <span className="relative block w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
                <img
                  src={`https://i.ytimg.com/vi/${t.youtubeId}/mqdefault.jpg`}
                  alt=""
                  className="aspect-video w-full object-cover"
                  loading="lazy"
                />
                <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] text-white">
                  {formatTime(t.durationSec)}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-sm font-medium">
                  {t.title}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
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
