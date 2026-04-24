import { useState, useRef, useEffect } from 'react';

export default function MobileModal({ 
  isOpen, 
  onClose, 
  title, 
  children,
  showCloseButton = true,
  className = ''
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const modalRef = useRef(null);
  const startYRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 100) {
      onClose();
    }
    setDragY(0);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        style={{ opacity: 1 - (dragY / 300) }}
      />
      
      <div
        ref={modalRef}
        className={`relative bg-gray-800 w-full sm:max-w-lg sm:mx-4 max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl transition-transform ${className}`}
        style={{ transform: `translateY(${dragY}px)` }}
      >
        <div 
          className="sm:hidden flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
        </div>

        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)] overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
