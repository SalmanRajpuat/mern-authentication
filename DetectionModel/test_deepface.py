"""Test if DeepFace can be loaded"""
import sys
import time

print("Testing DeepFace import...")
print(f"Python: {sys.version}")

try:
    print("\n1. Importing TensorFlow...")
    import os
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
    import tensorflow as tf
    print(f"   ✅ TensorFlow {tf.__version__} loaded")
    
    # Give TensorFlow time to initialize
    time.sleep(2)
    
    print("\n2. Importing DeepFace...")
    from deepface import DeepFace
    print("   ✅ DeepFace loaded successfully!")
    
    print("\n3. Testing face extraction...")
    # Test with a simple operation
    import cv2
    import numpy as np
    
    # Create a dummy image
    dummy_img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    cv2.imwrite('test_dummy.jpg', dummy_img)
    
    print("   Testing DeepFace.extract_faces()...")
    faces = DeepFace.extract_faces(
        'test_dummy.jpg',
        detector_backend='opencv',
        enforce_detection=False
    )
    print(f"   ✅ DeepFace.extract_faces() works! Found {len(faces)} face(s)")
    
    # Clean up
    os.remove('test_dummy.jpg')
    
    print("\n✅ All tests passed! DeepFace is working correctly.")
    print("\nYou can now use face recognition in your detection API.")
    
except ImportError as e:
    print(f"\n❌ Import Error: {e}")
    print("\nTry installing: pip install deepface tf-keras")
    
except Exception as e:
    print(f"\n❌ Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    print("\nThere may be a compatibility issue with your Python environment.")
