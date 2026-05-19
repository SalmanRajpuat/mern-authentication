"""
Fine-tune YOLO11 on bicycle dataset
This will actually train the model to detect your custom bicycle class
"""
from ultralytics import YOLO
import os
import yaml

# Create dataset config for YOLO training
dataset_config = {
    'path': r'C:\Users\salma\Desktop\project\mern-authentication\DetectionModel\custom_objects\training_data\bicycle\bicycle',
    'train': 'images',  # Assuming images are in the bicycle folder
    'val': 'images',    # You should split into train/val
    'names': {
        1: 'bicycle'  # Class ID in your dataset labels
    }
}

# Save dataset config
config_path = r'C:\Users\salma\Desktop\project\mern-authentication\DetectionModel\bicycle_dataset.yaml'
with open(config_path, 'w') as f:
    yaml.dump(dataset_config, f)

print("="*50)
print("YOLO Fine-tuning for Bicycle Detection")
print("="*50)

# Load pretrained YOLO11n model
model = YOLO('yolo11n.pt')

print("\n⚠️ WARNING: Training will take time and requires:")
print("  - GPU recommended (otherwise very slow)")
print("  - At least 30-60 minutes on GPU")
print("  - Several hours on CPU")
print("\nStarting training...")

# Train the model
results = model.train(
    data=config_path,
    epochs=50,              # Adjust based on your needs (more = better but slower)
    imgsz=640,              # Image size
    batch=16,               # Adjust based on your GPU memory
    name='bicycle_custom',  # Experiment name
    patience=10,            # Early stopping patience
    save=True,              # Save checkpoints
    device='cpu',          # Use 'cuda' or 0 for GPU if available
    workers=4,
    cache=False
)

print("\n✅ Training complete!")
print(f"Best model saved at: {results.save_dir}/weights/best.pt")
print("\nTo use this model, replace yolo11n.pt with the trained model:")
print(f"  cp {results.save_dir}/weights/best.pt yolo11n_bicycle.pt")
