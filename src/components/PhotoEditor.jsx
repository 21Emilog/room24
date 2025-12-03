import React, { useState, useRef } from 'react';
import { X, Camera, Upload, Crop, Move, Trash2, Check } from 'lucide-react';
import { compressImage } from '../utils/imageCompression';

export default function PhotoEditor({ photos, onPhotosChange, onClose, maxPhotos = 5 }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [cropData, setCropData] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const canvasRef = useRef(null);

  const handleAddPhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photos.length > maxPhotos) {
      alert(`Maximum ${maxPhotos} photos allowed`);
      return;
    }
    
    try {
      // Compress images
      const compressed = await Promise.all(
        files.map(file => compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8, maxSizeKB: 500 }))
      );
      onPhotosChange([...photos, ...compressed]);
    } catch (err) {
      console.error('Compression failed, falling back to direct load:', err);
      // Fallback: load without compression
      const readers = files.map(file => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.readAsDataURL(file);
      }));
      const images = await Promise.all(readers);
      onPhotosChange([...photos, ...images]);
    }
  };

  const handleReorder = (fromIndex, toIndex) => {
    const newPhotos = [...photos];
    const [moved] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, moved);
    onPhotosChange(newPhotos);
  };

  const handleDelete = (index) => {
    if (window.confirm('Delete this photo?')) {
      onPhotosChange(photos.filter((_, i) => i !== index));
      if (editingIndex === index) setEditingIndex(null);
    }
  };

  const startCrop = (index) => {
    setEditingIndex(index);
    setCropData({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
  };

  const applyCrop = () => {
    if (editingIndex === null || !cropData) return;
    
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Calculate crop dimensions (cropData is in percentages)
      const cropX = (cropData.x / 100) * img.width;
      const cropY = (cropData.y / 100) * img.height;
      const cropWidth = (cropData.width / 100) * img.width;
      const cropHeight = (cropData.height / 100) * img.height;
      
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );
      
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const newPhotos = [...photos];
      newPhotos[editingIndex] = croppedDataUrl;
      onPhotosChange(newPhotos);
      setEditingIndex(null);
      setCropData(null);
    };
    img.src = photos[editingIndex];
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
        <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-cyan-600 p-4 flex justify-between items-center z-10 rounded-t-2xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Manage Photos
          </h2>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {/* Add Photo Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={photos.length >= maxPhotos}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl hover:from-teal-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-teal-500/25 active:scale-95 font-medium"
            >
              <Upload className="w-4 h-4" />
              Upload Photos
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={photos.length >= maxPhotos}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 active:scale-95 font-medium"
            >
              <Camera className="w-4 h-4" />
              Take Photo
            </button>
            <div className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-xl">
              <span className="text-sm font-semibold text-gray-700">{photos.length}</span>
              <span className="text-sm text-gray-400">/</span>
              <span className="text-sm text-gray-500">{maxPhotos}</span>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleAddPhotos}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleAddPhotos}
            className="hidden"
          />

          {/* Photo Grid */}
          {photos.length === 0 ? (
            <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-teal-50 rounded-2xl border-2 border-dashed border-gray-200">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-full flex items-center justify-center">
                <Camera className="w-10 h-10 text-teal-500" />
              </div>
              <p className="text-gray-600 font-medium mb-1">No photos yet</p>
              <p className="text-sm text-gray-400">Upload or take photos to showcase your property</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative group rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
                  {index === 0 && (
                    <div className="absolute top-2 left-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs px-2.5 py-1 rounded-full font-bold z-10 shadow-lg flex items-center gap-1">
                      <span>⭐</span> Cover
                    </div>
                  )}
                  <img
                    src={photo}
                    alt={`Property ${index + 1}`}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Action Buttons */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition rounded-lg flex items-center justify-center gap-2">
                    <button
                      onClick={() => startCrop(index)}
                      className="opacity-0 group-hover:opacity-100 transition p-2 bg-white rounded-full hover:bg-gray-100"
                      title="Crop"
                    >
                      <Crop className="w-4 h-4 text-gray-700" />
                    </button>
                    {index > 0 && (
                      <button
                        onClick={() => handleReorder(index, index - 1)}
                        className="opacity-0 group-hover:opacity-100 transition p-2 bg-white rounded-full hover:bg-gray-100"
                        title="Move left"
                      >
                        <Move className="w-4 h-4 text-gray-700 rotate-180" />
                      </button>
                    )}
                    {index < photos.length - 1 && (
                      <button
                        onClick={() => handleReorder(index, index + 1)}
                        className="opacity-0 group-hover:opacity-100 transition p-2 bg-white rounded-full hover:bg-gray-100"
                        title="Move right"
                      >
                        <Move className="w-4 h-4 text-gray-700" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(index)}
                      className="opacity-0 group-hover:opacity-100 transition p-2 bg-red-600 rounded-full hover:bg-red-700"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Crop Modal */}
          {editingIndex !== null && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-4 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Crop className="w-5 h-5" />
                    Crop Photo
                  </h3>
                  <button
                    onClick={() => {
                      setEditingIndex(null);
                      setCropData(null);
                    }}
                    className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-5">
                  <div className="relative bg-gray-100 rounded-xl overflow-hidden">
                    <img
                      src={photos[editingIndex]}
                      alt="Crop preview"
                      className="w-full max-h-80 object-contain"
                    />
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-2 inline-block">
                      ✨ Drag to adjust crop area
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 p-5 pt-0">
                  <button
                    onClick={() => {
                      setEditingIndex(null);
                      setCropData(null);
                    }}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyCrop}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    <Check className="w-4 h-4" />
                    Apply Crop
                  </button>
                </div>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </div>
  );
}
