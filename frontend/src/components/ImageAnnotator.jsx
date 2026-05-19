import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Save, Trash2, ZoomIn, ZoomOut, Check } from 'lucide-react';

const ImageAnnotator = ({ images, objectName, onComplete, onCancel }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [annotations, setAnnotations] = useState({}); // { imageIndex: [{x, y, width, height}] }
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState(null);
    const [currentBox, setCurrentBox] = useState(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (images && images[currentImageIndex]) {
            loadImage(currentImageIndex);
        }
    }, [currentImageIndex, images]);

    const loadImage = (index) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // Set canvas size to match container
            const container = containerRef.current;
            const maxWidth = container.clientWidth - 40;
            const maxHeight = window.innerHeight - 300;
            
            let drawWidth = img.width;
            let drawHeight = img.height;
            
            // Scale image to fit container
            if (img.width > maxWidth || img.height > maxHeight) {
                const scaleX = maxWidth / img.width;
                const scaleY = maxHeight / img.height;
                const scale = Math.min(scaleX, scaleY);
                drawWidth = img.width * scale;
                drawHeight = img.height * scale;
            }
            
            canvas.width = drawWidth;
            canvas.height = drawHeight;
            
            // Draw image
            ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
            
            // Draw existing annotations
            drawAnnotations(ctx, index, drawWidth / img.width, drawHeight / img.height);
            
            setImageLoaded(true);
            setScale(drawWidth / img.width);
        };
        
        // Handle different image sources
        if (typeof images[index] === 'string') {
            img.src = images[index];
        } else if (images[index] instanceof File) {
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.readAsDataURL(images[index]);
        }
    };

    const drawAnnotations = (ctx, imageIndex, scaleX, scaleY) => {
        const boxes = annotations[imageIndex] || [];
        
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        
        boxes.forEach((box, idx) => {
            const x = box.x * scaleX;
            const y = box.y * scaleY;
            const w = box.width * scaleX;
            const h = box.height * scaleY;
            
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
            
            // Draw label
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(x, y - 20, 100, 20);
            ctx.fillStyle = '#000';
            ctx.font = '12px Arial';
            ctx.fillText(`${objectName} ${idx + 1}`, x + 5, y - 5);
            ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        });
    };

    const getMousePos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleMouseDown = (e) => {
        if (!imageLoaded) return;
        const pos = getMousePos(e);
        setIsDrawing(true);
        setStartPos(pos);
        setCurrentBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
    };

    const handleMouseMove = (e) => {
        if (!isDrawing || !startPos) return;
        
        const pos = getMousePos(e);
        const width = pos.x - startPos.x;
        const height = pos.y - startPos.y;
        
        setCurrentBox({
            x: width < 0 ? pos.x : startPos.x,
            y: height < 0 ? pos.y : startPos.y,
            width: Math.abs(width),
            height: Math.abs(height)
        });
        
        // Redraw
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Reload image
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            drawAnnotations(ctx, currentImageIndex, 1, 1);
            
            // Draw current box
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.fillStyle = 'rgba(255, 0, 255, 0.1)';
            const box = currentBox;
            if (box) {
                ctx.fillRect(box.x, box.y, box.width, box.height);
                ctx.strokeRect(box.x, box.y, box.width, box.height);
            }
        };
        img.src = canvas.toDataURL();
    };

    const handleMouseUp = (e) => {
        if (!isDrawing || !currentBox) return;
        
        // Only save if box has reasonable size
        if (currentBox.width > 10 && currentBox.height > 10) {
            const newAnnotations = { ...annotations };
            if (!newAnnotations[currentImageIndex]) {
                newAnnotations[currentImageIndex] = [];
            }
            
            // Store normalized coordinates (0-1) relative to original image
            const canvas = canvasRef.current;
            newAnnotations[currentImageIndex].push({
                x: currentBox.x,
                y: currentBox.y,
                width: currentBox.width,
                height: currentBox.height,
                normalized: {
                    x: currentBox.x / canvas.width,
                    y: currentBox.y / canvas.height,
                    width: currentBox.width / canvas.width,
                    height: currentBox.height / canvas.height
                }
            });
            
            setAnnotations(newAnnotations);
            loadImage(currentImageIndex); // Redraw with new annotation
        }
        
        setIsDrawing(false);
        setStartPos(null);
        setCurrentBox(null);
    };

    const handleNext = () => {
        if (currentImageIndex < images.length - 1) {
            setCurrentImageIndex(currentImageIndex + 1);
        }
    };

    const handlePrevious = () => {
        if (currentImageIndex > 0) {
            setCurrentImageIndex(currentImageIndex - 1);
        }
    };

    const handleClearAnnotations = () => {
        const newAnnotations = { ...annotations };
        delete newAnnotations[currentImageIndex];
        setAnnotations(newAnnotations);
        loadImage(currentImageIndex);
    };

    const handleSave = () => {
        // Convert annotations to YOLO format
        const yoloAnnotations = {};
        
        Object.keys(annotations).forEach(imageIndex => {
            const boxes = annotations[imageIndex];
            yoloAnnotations[imageIndex] = boxes.map(box => {
                const norm = box.normalized;
                // YOLO format: class_id x_center y_center width height (all normalized 0-1)
                return {
                    class_id: 0, // Will be assigned during training
                    x_center: norm.x + (norm.width / 2),
                    y_center: norm.y + (norm.height / 2),
                    width: norm.width,
                    height: norm.height
                };
            });
        });
        
        onComplete(yoloAnnotations);
    };

    const getAnnotatedCount = () => {
        return Object.keys(annotations).length;
    };

    const getCurrentImageAnnotations = () => {
        return annotations[currentImageIndex] || [];
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col"
        >
            {/* Header */}
            <div className="bg-gray-800 border-b border-gray-700 p-4">
                <div className="flex justify-between items-center max-w-7xl mx-auto">
                    <div>
                        <h2 className="text-xl font-bold text-white">Annotate Objects: {objectName}</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            Draw boxes around {objectName} objects. Image {currentImageIndex + 1} of {images.length}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={getAnnotatedCount() === 0}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            Save All ({getAnnotatedCount()} annotated)
                        </button>
                    </div>
                </div>
            </div>

            {/* Canvas Area */}
            <div ref={containerRef} className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={() => {
                        if (isDrawing) handleMouseUp();
                    }}
                    className="border-2 border-gray-700 cursor-crosshair bg-gray-900 shadow-2xl"
                />
            </div>

            {/* Controls */}
            <div className="bg-gray-800 border-t border-gray-700 p-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handlePrevious}
                            disabled={currentImageIndex === 0}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <span className="text-white font-medium">
                            {currentImageIndex + 1} / {images.length}
                        </span>
                        <button
                            onClick={handleNext}
                            disabled={currentImageIndex === images.length - 1}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-300">
                            <span className="font-medium">{getCurrentImageAnnotations().length}</span> objects marked in this image
                        </div>
                        <button
                            onClick={handleClearAnnotations}
                            disabled={getCurrentImageAnnotations().length === 0}
                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                            title="Clear annotations on current image"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="text-sm text-gray-400">
                        <div className="bg-gray-700 px-3 py-2 rounded-lg">
                            <p className="font-medium mb-1">Instructions:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Click and drag to draw bounding boxes</li>
                                <li>Draw box around each {objectName} instance</li>
                                <li>Use navigation buttons to move between images</li>
                                <li>Clear removes boxes from current image only</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ImageAnnotator;
