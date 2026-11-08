
"use client";

import { useEffect, useRef, useState } from "react";

interface IncidentVideoPlayerProps {
  videoUrl?: string;
  incidentId: string;
  autoplayMuted?: boolean;
  loop?: boolean;
  permanentlyMuted?: boolean;
  allowedPlaybackSpeeds?: number[];
}

const DEFAULT_SPEEDS = [1, 0.75, 0.5, 0.25];

function isSafeVideoUrl(value: string): boolean {
  if (!value || value.trim() !== value) return false;

  // Permit same-origin paths, but reject protocol-relative URLs.
  if (value.startsWith("/") && !value.startsWith("//")) {
    return !value.includes("\\");
  }

  try {
    const url = new URL(value);

    // HTTPS only for external video sources.
    if (url.protocol === "https:") {
      return !url.username && !url.password;
    }

    // HTTP is permitted only for local development.
    if (
      url.protocol === "http:" &&
      (url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "[::1]")
    ) {
      return !url.username && !url.password;
    }

    return false;
  } catch {
    return false;
  }
}

export default function IncidentVideoPlayer({
  videoUrl,
  incidentId,
  autoplayMuted = true,
  loop = true,
  permanentlyMuted = false,
  allowedPlaybackSpeeds = DEFAULT_SPEEDS,
}: IncidentVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [videoError, setVideoError] = useState(false);

  const safeUrl =
    videoUrl && isSafeVideoUrl(videoUrl) ? videoUrl : undefined;

  const speeds = DEFAULT_SPEEDS.filter(
    (value) =>
      Array.isArray(allowedPlaybackSpeeds) &&
      allowedPlaybackSpeeds.includes(value)
  );

  const availableSpeeds = speeds.length > 0 ? speeds : [1];

  useEffect(() => {
    const video = videoRef.current;

    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSpeed(1);
    setVideoError(false);
    setMuted(true);

    if (!video || !safeUrl) return;

    video.pause();
    video.currentTime = 0;
    video.playbackRate = 1;
    video.muted = true;

    if (permanentlyMuted) {
      video.muted = true;
    }

    if (autoplayMuted) {
      void video.play().catch(() => {
        // Autoplay may be blocked by the browser.
        setPlaying(false);
      });
    }

    return () => {
      video.pause();
    };
  }, [incidentId, safeUrl, autoplayMuted, permanentlyMuted]);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video || videoError) return;

    if (video.paused) {
      void video.play().catch(() => {
        setPlaying(false);
      });
    } else {
      video.pause();
    }
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video || permanentlyMuted) return;

    video.muted = !video.muted;
    setMuted(video.muted);
  }

  function changeSpeed(value: number) {
    const video = videoRef.current;
    if (!video || !availableSpeeds.includes(value)) return;

    video.playbackRate = value;
    setSpeed(value);
  }

  function seek(value: number) {
    const video = videoRef.current;
    if (!video || !Number.isFinite(value)) return;

    video.currentTime = Math.max(
      0,
      Math.min(value, duration || 0)
    );
  }

  async function toggleFullscreen() {
    const video = videoRef.current;
    if (!video) return;

    const container = video.parentElement;
    if (!container) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch {
      // Fullscreen may be unavailable or denied by the browser.
    }
  }

  function formatTime(value: number): string {
    if (!Number.isFinite(value)) return "0:00";

    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  if (!safeUrl) {
    return (
      <div className="flex w-full aspect-video items-center justify-center bg-neutral-950 p-6 text-center text-sm text-neutral-400">
        {videoUrl
          ? "The video address is invalid or unsupported."
          : "No incident footage supplied."}
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="group relative overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          key={incidentId}
          src={safeUrl}
          autoPlay={autoplayMuted}
          muted
          loop={loop}
          playsInline
          preload="metadata"
          controls={false}
          disablePictureInPicture
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(event) =>
            setCurrentTime(event.currentTarget.currentTime)
          }
          onLoadedMetadata={(event) =>
            setDuration(event.currentTarget.duration)
          }
          onDurationChange={(event) =>
            setDuration(event.currentTarget.duration)
          }
          onError={() => setVideoError(true)}
          className="aspect-video w-full object-contain"
        />

        {videoError && (
          <div
            role="alert"
            className="absolute inset-0 flex items-center justify-center bg-neutral-950 p-6 text-center text-sm text-red-400"
          >
            Unable to load this video. Please try again later.
          </div>
        )}

        {!videoError && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent p-3">
            <input
              aria-label="Seek through video"
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => seek(Number(event.target.value))}
              className="mb-2 w-full cursor-pointer accent-red-500"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlayback}
                  aria-label={playing ? "Pause video" : "Play video"}
                  className="text-sm font-bold text-white hover:text-red-400"
                >
                  {playing ? "PAUSE" : "PLAY"}
                </button>

                <span className="text-xs text-neutral-300">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {!permanentlyMuted && (
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={muted ? "Unmute video" : "Mute video"}
                    className="text-xs font-bold text-white hover:text-red-400"
                  >
                    {muted ? "UNMUTE" : "MUTE"}
                  </button>
                )}

                <label className="flex items-center gap-1 text-xs text-white">
                  SPEED
                  <select
                    aria-label="Playback speed"
                    value={speed}
                    onChange={(event) =>
                      changeSpeed(Number(event.target.value))
                    }
                    className="rounded bg-neutral-800 px-2 py-1 text-white"
                  >
                    {availableSpeeds.map((value) => (
                      <option key={value} value={value}>
                        {value}×
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="text-xs font-bold text-white hover:text-red-400"
                  aria-label="Toggle fullscreen"
                >
                  FULLSCREEN
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {permanentlyMuted && (
        <p className="rounded-md border border-amber-700/50 bg-amber-950/30 p-3 text-xs leading-5 text-amber-200">
          Audio disabled for this incident. Audio has been permanently
          muted because the original footage contains commentary or
          other audio that may reveal the incident's outcome.
        </p>
      )}
    </div>
  );
}
