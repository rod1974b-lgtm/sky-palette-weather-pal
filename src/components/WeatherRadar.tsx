// src/components/WeatherRadar.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Weather } from "@/lib/weather";
import {
  type RainViewerData,
  type RainViewerFrame,
  getRainViewerMetadata,
  lon2tile,
  lat2tile,
  getRadarTileUrl,
  getBaseMapTileUrl,
  formatFrameTime,
  RADAR_I18N,
} from "@/lib/rainViewer";

interface WeatherRadarProps {
  weather?: Weather | null;
}

export const WeatherRadar: React.FC<WeatherRadarProps> = ({ weather }) => {
  const { i18n } = useTranslation();
  const lang = i18n.language || "en";
  const texts = RADAR_I18N[lang] || RADAR_I18N.en;

  // Center coordinates (fallback to Bangkok if missing)
  const cityLat = weather?.place?.lat ?? 13.7563;
  const cityLon = weather?.place?.lon ?? 100.5018;
  const cityName = weather?.place?.name ?? "City";

  // Map viewport state
  const [zoom, setZoom] = useState<number>(7);
  const [centerOffset, setCenterOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState<number>(0.75);

  // Radar data state
  const [metadata, setMetadata] = useState<RainViewerData | null>(null);
  const [frames, setFrames] = useState<RainViewerFrame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  // Dragging / Pan interaction state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Load RainViewer metadata
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getRainViewerMetadata().then((data) => {
      if (!mounted) return;
      if (data && data.radar && data.radar.past) {
        setMetadata(data);
        const allFrames = [...data.radar.past, ...(data.radar.nowcast || [])];
        setFrames(allFrames);
        setCurrentFrameIndex(Math.max(0, allFrames.length - 1));
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Animation Loop for radar playback
  useEffect(() => {
    if (!isPlaying || frames.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % frames.length);
    }, 700);

    return () => clearInterval(interval);
  }, [isPlaying, frames.length]);

  // Recenter map on active city
  const handleRecenter = () => {
    setCenterOffset({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(z + 1, 10));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(z - 1, 4));
  };

  // Drag & Touch Event Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    startOffsetRef.current = { ...centerOffset };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setCenterOffset({
      x: startOffsetRef.current.x + dx,
      y: startOffsetRef.current.y + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Slippy Map Math: compute which 256x256 tiles cover the 420x280 container
  const containerW = 460;
  const containerH = 300;
  const tileSize = 256;

  // Center tile coordinates for the city
  const centerTileX = lon2tile(cityLon, zoom);
  const centerTileY = lat2tile(cityLat, zoom);

  // Pixel coordinate of city center in world space
  const worldCenterX = centerTileX * tileSize - centerOffset.x;
  const worldCenterY = centerTileY * tileSize - centerOffset.y;

  // Top-left pixel coordinate of visible viewport
  const viewLeft = worldCenterX - containerW / 2;
  const viewTop = worldCenterY - containerH / 2;

  // Calculate visible tile range
  const minTileX = Math.floor(viewLeft / tileSize);
  const maxTileX = Math.floor((viewLeft + containerW) / tileSize);
  const minTileY = Math.floor(viewTop / tileSize);
  const maxTileY = Math.floor((viewTop + containerH) / tileSize);

  const numTiles = Math.pow(2, zoom);

  // Generate list of tiles to render
  const visibleTiles = useMemo(() => {
    const list: { x: number; y: number; posX: number; posY: number; key: string }[] = [];
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        // Tile wraps around horizontally
        const wrappedX = ((tx % numTiles) + numTiles) % numTiles;
        if (ty >= 0 && ty < numTiles) {
          const posX = tx * tileSize - viewLeft;
          const posY = ty * tileSize - viewTop;
          list.push({
            x: wrappedX,
            y: ty,
            posX,
            posY,
            key: `${zoom}-${wrappedX}-${ty}`,
          });
        }
      }
    }
    return list;
  }, [minTileX, maxTileX, minTileY, maxTileY, numTiles, viewLeft, viewTop, zoom]);

  // Current radar frame path
  const activeFrame = frames[currentFrameIndex];
  const activeTimeLabel = activeFrame ? formatFrameTime(activeFrame.time, lang) : "";

  // Marker screen position for current city
  const markerX = centerTileX * tileSize - viewLeft;
  const markerY = centerTileY * tileSize - viewTop;

  return (
    <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-3">
      {/* Header with Title & Live Pulse */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-base">📡</span>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <span>{texts.title}</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>LIVE</span>
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground font-normal">
              {cityName} • {texts.subtitle}
            </p>
          </div>
        </div>

        {/* Recenter Button */}
        <button
          type="button"
          onClick={handleRecenter}
          className="text-xs font-medium px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-foreground border border-border/50 transition cursor-pointer active:scale-95 flex items-center gap-1"
          title={texts.recenter}
        >
          <span>🎯</span>
          <span className="hidden sm:inline">{texts.recenter}</span>
        </button>
      </div>

      {/* Interactive Map Viewport Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-full h-[280px] sm:h-[320px] rounded-2xl overflow-hidden border border-border/60 bg-muted/20 select-none cursor-grab active:cursor-grabbing touch-none"
        style={{ touchAction: "none" }}
      >
        {/* Render Base Map Tiles */}
        <div className="absolute inset-0 pointer-events-none">
          {visibleTiles.map((t) => (
            <img
              key={`base-${t.key}`}
              src={getBaseMapTileUrl(zoom, t.x, t.y)}
              alt=""
              loading="lazy"
              className="absolute w-[256px] h-[256px] select-none"
              style={{
                left: `${t.posX}px`,
                top: `${t.posY}px`,
                filter: "saturate(0.85) contrast(1.05)",
              }}
            />
          ))}
        </div>

        {/* Render RainViewer Animated Radar Tiles */}
        {metadata && activeFrame && (
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            style={{ opacity }}
          >
            {visibleTiles.map((t) => (
              <img
                key={`radar-${activeFrame.time}-${t.key}`}
                src={getRadarTileUrl(metadata.host, activeFrame.path, zoom, t.x, t.y, 2, 1, 1)}
                alt=""
                className="absolute w-[256px] h-[256px] select-none pointer-events-none"
                style={{
                  left: `${t.posX}px`,
                  top: `${t.posY}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* City Location Pin Marker */}
        {markerX >= 0 && markerX <= containerW && markerY >= 0 && markerY <= containerH && (
          <div
            className="absolute z-20 -translate-x-1/2 -translate-y-full pointer-events-none flex flex-col items-center"
            style={{ left: `${markerX}px`, top: `${markerY}px` }}
          >
            <div className="px-2 py-0.5 rounded-md bg-background/90 text-foreground font-bold text-[10px] shadow-sm border border-border/80 backdrop-blur-xs whitespace-nowrap mb-0.5">
              📍 {cityName}
            </div>
            <div className="w-3 h-3 rounded-full bg-primary border-2 border-background shadow-md animate-pulse" />
          </div>
        )}

        {/* Top-Right Floating Zoom Controls */}
        <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5 shadow-sm">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleZoomIn();
            }}
            className="w-8 h-8 rounded-xl bg-background/90 hover:bg-background text-foreground border border-border/70 flex items-center justify-center font-bold text-sm shadow-xs backdrop-blur-md cursor-pointer active:scale-95"
            title={texts.zoomIn}
          >
            +
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleZoomOut();
            }}
            className="w-8 h-8 rounded-xl bg-background/90 hover:bg-background text-foreground border border-border/70 flex items-center justify-center font-bold text-sm shadow-xs backdrop-blur-md cursor-pointer active:scale-95"
            title={texts.zoomOut}
          >
            −
          </button>
        </div>

        {/* Top-Left Active Frame Timestamp Badge */}
        <div className="absolute top-3 left-3 z-30 pointer-events-none">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-background/90 backdrop-blur-md border border-border/70 shadow-sm text-xs font-bold text-foreground">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>{activeTimeLabel || "Radar Frame"}</span>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex items-center justify-center z-40">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-background/90 px-3 py-2 rounded-xl border border-border/60 shadow-md">
              <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>{texts.loadingRadar}</span>
            </div>
          </div>
        )}
      </div>

      {/* Radar Animation Scrubber & Play/Pause Controls */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 border ${
            isPlaying
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted/70 hover:bg-muted text-foreground border-border/60"
          }`}
        >
          <span>{isPlaying ? "⏸️" : "▶️"}</span>
          <span>{isPlaying ? texts.pause : texts.play}</span>
        </button>

        {/* Scrubber slider across frames */}
        <div className="flex-1 flex flex-col justify-center">
          <input
            type="range"
            min={0}
            max={Math.max(0, frames.length - 1)}
            value={currentFrameIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentFrameIndex(Number(e.target.value));
            }}
            className="w-full accent-primary h-1.5 rounded-lg bg-muted cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-medium mt-1">
            <span>−2h</span>
            <span className="font-bold text-foreground">{activeTimeLabel}</span>
            <span>Now</span>
          </div>
        </div>

        {/* Opacity slider */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="text-[11px]">💧</span>
          <input
            type="range"
            min={0.3}
            max={1.0}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-16 accent-primary h-1.5 rounded-lg bg-muted cursor-pointer"
            title={texts.opacity}
          />
        </div>
      </div>

      {/* Color Intensity Scale Legend */}
      <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <span className="text-muted-foreground font-medium">{texts.subtitle}</span>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-xs bg-[#40e0d0]" />
            <span className="text-muted-foreground">{texts.light}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-xs bg-[#00ff00]" />
            <span className="text-muted-foreground">{texts.moderate}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-xs bg-[#ffff00]" />
            <span className="text-muted-foreground">{texts.heavy}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-xs bg-[#ff0000]" />
            <span className="text-muted-foreground">{texts.severe}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WeatherRadar;
