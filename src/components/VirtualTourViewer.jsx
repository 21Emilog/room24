import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

export default function VirtualTourViewer({ photos, initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setStartPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startPos.x;
    const sensitivity = 0.5;
    setRotation(prev => prev + dx * sensitivity);
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - startPos.x;
    const sensitivity = 0.5;
    setRotation(prev => prev + dx * sensitivity);
    setStartPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleReset = () => {
    setRotation(0);
    setZoom(1);
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Fullscreen error:', err);
      }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch(e.key) {
        case 'ArrowLeft':
          setCurrentIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowRight':
          setCurrentIndex(prev => Math.min(photos.length - 1, prev + 1));
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case '0':
          handleReset();
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen();
          } else {
            onClose();
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photos.length, isFullscreen, onClose]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex flex-col"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header Controls */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="text-white">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-xl">🏠</span>
              Virtual Tour
            </h3>
            <p className="text-sm text-gray-300 flex items-center gap-1">
              <span className="w-2 h-2 bg-[#E63946] rounded-full animate-pulse" />
              {currentIndex + 1} of {photos.length} views
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-all duration-200 hover:scale-110 active:scale-95 backdrop-blur-sm"
              title="Fullscreen (F)"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 bg-white/20 hover:bg-red-500/80 rounded-xl text-white transition-all duration-200 hover:scale-110 active:scale-95 backdrop-blur-sm"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewer */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div
          className={`relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <img
            ref={imgRef}
            src={photos[currentIndex]}
            alt={`View ${currentIndex + 1}`}
            className="max-w-[90vw] max-h-[80vh] object-contain select-none"
            draggable={false}
          />
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 z-10 safe-area-bottom">
        <div className="flex flex-col gap-3">
          {/* Thumbnails */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide justify-center">
            {photos.map((photo, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden transition-all duration-200 ${
                  index === currentIndex
                    ? 'ring-2 ring-[#E63946] ring-offset-2 ring-offset-black scale-105 shadow-lg shadow-red-500/30'
                    : 'opacity-60 hover:opacity-100 hover:scale-105 border border-white/20'
                }`}
              >
                <img
                  src={photo}
                  alt={`Room thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          {/* Zoom & Rotation Controls */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-all duration-200 hover:scale-110 active:scale-95 backdrop-blur-sm"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <div className="px-4 py-2 bg-gradient-to-r from-red-500/30 to-red-500/30 backdrop-blur-sm rounded-xl text-white text-sm font-bold min-w-[85px] text-center border border-white/10">
              {Math.round(zoom * 100)}%
            </div>
            <button
              onClick={handleZoomIn}
              className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-all duration-200 hover:scale-110 active:scale-95 backdrop-blur-sm"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-white/20 mx-1" />
            <button
              onClick={handleReset}
              className="p-2.5 bg-white/20 hover:bg-orange-500/60 rounded-xl text-white transition-all duration-200 hover:scale-110 active:scale-95 backdrop-blur-sm"
              title="Reset View (0)"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {/* Instructions */}
          <div className="text-center text-xs">
            <p className="hidden md:block text-gray-300/80 bg-white/5 rounded-full px-4 py-1.5 inline-block backdrop-blur-sm">
              🖱️ Drag to rotate • ⌨️ Arrows navigate • +/- zoom • 0 reset • Esc close
            </p>
            <p className="md:hidden text-gray-300/80 bg-white/5 rounded-full px-4 py-1.5 inline-block backdrop-blur-sm">
              👆 Swipe to rotate • Tap to switch
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
