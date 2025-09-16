from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
import os
import time

app = Flask(__name__)
CORS(app)

# Initialize model as None first
model = None
model_path = os.path.join(os.path.dirname(__file__), 'yolo11n.pt')

def load_model():
    """Load YOLO model with error handling"""
    global model
    try:
        from ultralytics import YOLO
        print(f"Loading YOLO model from: {model_path}")
        model = YOLO(model_path)
        print("✅ YOLO model loaded successfully!")
        return True
    except Exception as e:
        print(f"❌ Error loading YOLO model: {e}")
        return False

# Classes to detect (person, bicycle, car, motorcycle, bus, truck)
TARGET_CLASSES = {
    0: 'person',
    1: 'bicycle',
    2: 'car',
    3: 'motorcycle',
    5: 'bus',
    7: 'truck'
}

@app.route('/', methods=['GET'])
def root():
    return jsonify({'status': 'ok', 'message': 'YOLO Detection API is running.', 'model_loaded': model is not None})

@app.route('/detect/image', methods=['POST'])
def detect_image():
    try:
        print("=== Image Detection Request Started ===")
        
        # Check if model is loaded
        if model is None:
            print("Error: YOLO model not loaded")
            return jsonify({'error': 'YOLO model not loaded. Please restart the server.'}), 500
        
        if 'image' not in request.files:
            print("Error: No image in request files")
            return jsonify({'error': 'No image provided'}), 400
            
        file = request.files['image']
        print(f"Image file received: {file.filename if file.filename else 'unnamed'}")
        
        # Read and validate image
        image_bytes = file.read()
        if len(image_bytes) == 0:
            print("Error: Empty image file")
            return jsonify({'error': 'Empty image file'}), 400
            
        print(f"Image bytes read: {len(image_bytes)} bytes")
        
        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            print("Error: Could not decode image")
            return jsonify({'error': 'Invalid image format. Please use JPG, PNG, or similar.'}), 400
            
        print(f"Image decoded successfully: {image.shape}")
        
        # Run detection with error handling
        print("Running YOLO detection...")
        try:
            results = model(image)
            print("YOLO detection completed")
        except Exception as e:
            print(f"Error during YOLO detection: {e}")
            return jsonify({'error': f'Detection failed: {str(e)}'}), 500
        
        # Filter out airplanes from results
        print("Filtering out airplanes...")
        try:
            filter_airplane_detections(results)
            print("Airplane filtering completed")
        except Exception as e:
            print(f"Error filtering airplanes: {e}")
        
        # Process detections
        print("Processing detections...")
        detections = process_detections(results)
        print(f"Detections processed: {detections}")
        
        # Create annotated frame with error handling
        print("Creating annotated frame...")
        try:
            if len(results) > 0 and results[0] is not None:
                annotated_frame = results[0].plot()
                print("Annotated frame created")
            else:
                # No detections, use original image
                annotated_frame = image
                print("No detections, using original image")
        except Exception as e:
            print(f"Error creating annotated frame: {e}")
            annotated_frame = image
        
        # Save annotated image
        try:
            images_dir = os.path.join(os.path.dirname(__file__), 'results', 'images')
            os.makedirs(images_dir, exist_ok=True)
            existing = [int(f.split('.')[0]) for f in os.listdir(images_dir) if f.endswith('.jpg') and f.split('.')[0].isdigit()]
            next_idx = max(existing) + 1 if existing else 1
            save_path = os.path.join(images_dir, f'{next_idx}.jpg')
            cv2.imwrite(save_path, annotated_frame)
            print(f"Image saved to: {save_path}")
        except Exception as e:
            print(f"Error saving image: {e}")
            save_path = "Error saving file"
        
        # Encode to base64
        try:
            _, buffer = cv2.imencode('.jpg', annotated_frame)
            annotated_base64 = base64.b64encode(buffer).decode('utf-8')
        except Exception as e:
            print(f"Error encoding image: {e}")
            return jsonify({'error': f'Image encoding failed: {str(e)}'}), 500
        
        print("=== Image Detection Request Completed Successfully ===")
        return jsonify({
            'success': True,
            'detected_objects': detections,
            'annotated_image': f"data:image/jpeg;base64,{annotated_base64}",
            'saved_path': save_path
        })
        
    except Exception as e:
        print(f"=== UNEXPECTED ERROR in detect_image: {e} ===")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/detect/video', methods=['POST'])
def detect_video():
    try:
        if 'video' not in request.files:
            return jsonify({'error': 'No video provided'}), 400
        file = request.files['video']
        temp_video_path = 'temp_video.mp4'
        file.save(temp_video_path)
        cap = cv2.VideoCapture(temp_video_path)
        all_detections = {}
        frame_count = 0
        videos_dir = os.path.join(os.path.dirname(__file__), 'results', 'videos')
        os.makedirs(videos_dir, exist_ok=True)
        existing = [int(f.split('.')[0]) for f in os.listdir(videos_dir) if f.endswith('.mp4') and f.split('.')[0].isdigit()]
        next_idx = max(existing) + 1 if existing else 1
        video_save_path = os.path.join(videos_dir, f'{next_idx}.mp4')
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        fps = cap.get(cv2.CAP_PROP_FPS)
        if not fps or fps <= 0:
            fps = 20.0  # fallback if FPS is not available
        out = None
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_count += 1
            results = model(frame)
            
            # Filter out airplanes from results
            filter_airplane_detections(results)
            
            # Process detections (filtering happens inside process_detections)
            detections = process_detections(results)
            for detection in detections:
                class_name = detection['class']
                if class_name not in all_detections:
                    all_detections[class_name] = 0
                all_detections[class_name] += detection['count']
            # Save annotated frame to video
            annotated_frame = results[0].plot()
            if out is None:
                height, width = annotated_frame.shape[:2]
                out = cv2.VideoWriter(video_save_path, fourcc, fps, (width, height))
            out.write(annotated_frame)
        cap.release()
        if out is not None:
            out.release()
        os.remove(temp_video_path)
        detection_list = [{'class': k, 'count': v} for k, v in all_detections.items()]
        return jsonify({'success': True, 'detected_objects': detection_list, 'saved_video': video_save_path})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/detect/webcam/start', methods=['POST'])
def detect_webcam():
    try:
        cap = cv2.VideoCapture(0)
        images_dir = os.path.join(os.path.dirname(__file__), 'results', 'images')
        os.makedirs(images_dir, exist_ok=True)
        existing = [int(f.split('.')[0]) for f in os.listdir(images_dir) if f.endswith('.jpg') and f.split('.')[0].isdigit()]
        next_idx = max(existing) + 1 if existing else 1
        saved_frames = []
        all_detections = {}
        frame_count = 0
        # Capture 10 frames for demo
        while frame_count < 10:
            ret, frame = cap.read()
            if not ret:
                break
            results = model(frame)
            
            # Filter out airplanes from results
            filter_airplane_detections(results)
            
            # Process detections (filtering happens inside process_detections)
            detections = process_detections(results)
            for detection in detections:
                class_name = detection['class']
                if class_name not in all_detections:
                    all_detections[class_name] = 0
                all_detections[class_name] += detection['count']
            annotated_frame = results[0].plot()
            save_path = os.path.join(images_dir, f'{next_idx}.jpg')
            cv2.imwrite(save_path, annotated_frame)
            saved_frames.append(save_path)
            next_idx += 1
            frame_count += 1
        cap.release()
        detection_list = [{'class': k, 'count': v} for k, v in all_detections.items()]
        return jsonify({'success': True, 'detected_objects': detection_list, 'saved_frames': saved_frames})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def filter_airplane_detections(results):
    """Remove airplane detections from YOLO results completely"""
    for result in results:
        if result.boxes is not None:
            # Get all detections
            boxes = result.boxes
            
            # Filter out airplane class (4) and any airplane-related detections
            keep_indices = []
            for i, cls_id in enumerate(boxes.cls):
                class_id = int(cls_id)
                
                # Skip airplane class (4) and any other airplane-related classes
                if class_id == 4:  # Standard airplane class
                    continue
                    
                # Check class name if available
                class_name = model.names.get(class_id, '').lower()
                if 'airplane' in class_name or 'plane' in class_name or 'aircraft' in class_name:
                    continue
                    
                keep_indices.append(i)
            
            # Update result with filtered detections
            if keep_indices:
                result.boxes = result.boxes[keep_indices]
            else:
                # No detections left after filtering
                result.boxes = None
    
    return results

def process_detections(results):
    detections = []
    class_counts = {}
    for result in results:
        boxes = result.boxes
        if boxes is not None:
            for box in boxes:
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                
                # Skip airplane class (4) explicitly
                if class_id == 4:
                    continue
                
                # Only keep our target classes with high confidence
                if class_id in TARGET_CLASSES and confidence > 0.5:
                    class_name = TARGET_CLASSES[class_id]
                    if class_name not in class_counts:
                        class_counts[class_name] = 0
                    class_counts[class_name] += 1
    for class_name, count in class_counts.items():
        detections.append({'class': class_name, 'count': count})
    return detections

if __name__ == '__main__':
    print("Starting YOLO Detection API...")
    print(f"Model path: {model_path}")
    
    # Load model before starting server
    if load_model():
        print("Server running on http://localhost:5001")
        app.run(host='0.0.0.0', port=5001, debug=False)  
    else:
        print("❌ Failed to load YOLO model. Server not started.")
        print("Make sure yolo11n.pt exists in the DetectionModel folder.")
