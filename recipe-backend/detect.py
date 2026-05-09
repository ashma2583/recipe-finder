import sys
import json
from ultralytics import YOLO

# COCO class IDs that correspond to food / kitchen items.
# YOLOv8n stock model only knows these — for fridge contents you'd train a custom model.
FOOD_CLASS_IDS = {
    46,  # banana
    47,  # apple
    48,  # sandwich
    49,  # orange
    50,  # broccoli
    51,  # carrot
    52,  # hot dog
    53,  # pizza
    54,  # donut
    55,  # cake
}

model = YOLO('yolov8n.pt')

def detect(image_path):
    results = model.predict(source=image_path, conf=0.4, save=False, verbose=False)
    found = set()
    for r in results:
        for box in r.boxes:
            class_id = int(box.cls[0])
            if class_id in FOOD_CLASS_IDS:
                found.add(model.names[class_id])
    return sorted(found)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        ingredients = detect(sys.argv[1])
        print(json.dumps(ingredients))
