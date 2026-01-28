# collect images and label using roboflow

from ultralytics import YOLO

def train_custom_model():
    model = YOLO('yolov8n.pt') 

    # train
    results = model.train(
        data='datasets/ingredients/data.yaml', 
        epochs=50, 
        imgsz=640,
        plots=True
    )

    # val
    metrics = model.val()
    print(f"Mean Average Precision: {metrics.box.map}")

    # export
    path = model.export(format="onnx") 
    print(f"Model exported to {path}")

if __name__ == "__main__":
    train_custom_model()