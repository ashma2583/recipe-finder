# collect images and label using roboflow

from ultralytics import YOLO

def train_custom_model():
    # 1. Load the pre-trained model (Transfer Learning)
    model = YOLO('yolov8n.pt') 

    # 2. Train it on your custom data
    # 'data.yaml' comes from your dataset export (Roboflow/LabelImg)
    # epochs=100: How many times it studies the data
    # imgsz=640: Standard image size
    results = model.train(
        data='datasets/ingredients/data.yaml', 
        epochs=50, 
        imgsz=640,
        plots=True
    )

    # 3. Validation
    metrics = model.val()
    print(f"Mean Average Precision: {metrics.box.map}")

    # 4. Export the new brain for your app
    # It will save to runs/detect/train/weights/best.pt
    path = model.export(format="onnx") 
    print(f"Model exported to {path}")

if __name__ == "__main__":
    train_custom_model()