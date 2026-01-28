import sys
import json
from ultralytics import YOLO

# model
model = YOLO('yolov8n.pt') 

def detect(image_path):
    # Run inference with a confidence threshold of 50%
    results = model.predict(source=image_path, conf=0.5, save=False, verbose=False)
    
    found_items = set()
    
    for r in results:
        for box in r.boxes:
            # box.cls is the class ID (e.g., 47 for 'apple')
            class_id = int(box.cls[0])
            name = model.names[class_id]
            found_items.add(name)
            
    return list(found_items)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Node.js sends the image path as an argument
        image_path = sys.argv[1]
        ingredients = detect(image_path)
        print(json.dumps(ingredients))