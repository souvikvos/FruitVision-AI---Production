import { InferenceSession, Tensor } from "onnxruntime-web";

// Define Classes
export const DETECTION_CLASSES = ["Apple", "Banana", "Grape", "Orange", "Pineapple", "Watermelon"];
export const CLASSIFICATION_CLASSES = ["Amla", "Apple", "Apricot", "Avocado", "Banana", "Blackberry", "Blueberry", "Breadfruit", "Cherry", "Coconut", "Cranberry", "Custard Apple", "Dates", "Dragon Fruit", "Fig", "Grapes", "Guava", "Jackfruit", "Jamun", "Longan", "Lychee", "Mandarin", "Mango", "Mangosteen", "Mulberry", "Muskmelon", "Orange", "Papaya", "Passion Fruit", "Pear", "Pineapple", "Plum", "Pomegranate", "Pomelo", "Rambutan", "Raspberry", "Sapodilla", "Strawberry", "Tomato", "Watermelon", "Wood Apple", "kiwi"];

// Session Cache
let detectSession: InferenceSession | null = null;
let classifySession: InferenceSession | null = null;

/**
 * Initialize ONNX sessions singleton
 */
export const initOnnxSessions = async () => {
    // Explicitly set WASM paths to fetch from the public folder or CDN if needed
    // Assuming standard Next.js setup, the webassembly files might need to be copied, 
    // but onnxruntime-web usually fetches them automatically from CDN or local if bundled properly.
    
    if (!detectSession) {
        detectSession = await InferenceSession.create('/best.onnx', { executionProviders: ['wasm'] });
    }
    if (!classifySession) {
        classifySession = await InferenceSession.create('/Fruit_Classification.onnx', { executionProviders: ['wasm'] });
    }
};

/**
 * Convert Image Data to Float32 Tensor
 * YOLO requires [1, 3, H, W] tensor format normalized 0-1
 */
function imageDataToTensor(data: Uint8ClampedArray, width: number, height: number): Tensor {
    const float32Data = new Float32Array(3 * width * height);
    
    // Convert from [H, W, C] to [C, H, W]
    for (let c = 0; c < 3; c++) {
        for (let h = 0; h < height; h++) {
            for (let w = 0; w < width; w++) {
                const pixelIndex = (h * width + w) * 4;
                const tensorIndex = c * height * width + h * width + w;
                // Normalize 0-255 to 0.0-1.0
                float32Data[tensorIndex] = data[pixelIndex + c] / 255.0;
            }
        }
    }
    
    return new Tensor('float32', float32Data, [1, 3, height, width]);
}

/**
 * YOLOv8 Non-Maximum Suppression and Output Parsing
 * Output shape is [1, 4 + num_classes, 8400]
 */
function processYoloOutput(output: Tensor, confidenceThreshold = 0.5, iouThreshold = 0.45) {
    const data = output.data as Float32Array;
    const numBoxes = output.dims[2]; // 8400
    const numClasses = output.dims[1] - 4; // 10 - 4 = 6
    
    const boxes = [];
    
    // YOLOv8 output: [xc, yc, w, h, class0, class1, ...]
    for (let i = 0; i < numBoxes; i++) {
        let maxClassScore = 0;
        let classId = -1;
        
        for (let c = 0; c < numClasses; c++) {
            const score = data[(4 + c) * numBoxes + i];
            if (score > maxClassScore) {
                maxClassScore = score;
                classId = c;
            }
        }
        
        if (maxClassScore >= confidenceThreshold) {
            const xc = data[0 * numBoxes + i];
            const yc = data[1 * numBoxes + i];
            const w = data[2 * numBoxes + i];
            const h = data[3 * numBoxes + i];
            
            const x1 = xc - w / 2;
            const y1 = yc - h / 2;
            const x2 = xc + w / 2;
            const y2 = yc + h / 2;
            
            boxes.push({
                x1, y1, x2, y2,
                confidence: maxClassScore,
                classId,
                className: DETECTION_CLASSES[classId]
            });
        }
    }
    
    // Non-Maximum Suppression (NMS)
    boxes.sort((a, b) => b.confidence - a.confidence);
    const finalBoxes = [];
    
    while (boxes.length > 0) {
        const bestBox = boxes.shift()!;
        finalBoxes.push(bestBox);
        
        for (let i = boxes.length - 1; i >= 0; i--) {
            const box = boxes[i];
            if (box.classId !== bestBox.classId) continue;
            
            // Calculate IoU
            const intersectX1 = Math.max(bestBox.x1, box.x1);
            const intersectY1 = Math.max(bestBox.y1, box.y1);
            const intersectX2 = Math.min(bestBox.x2, box.x2);
            const intersectY2 = Math.min(bestBox.y2, box.y2);
            
            const intersectArea = Math.max(0, intersectX2 - intersectX1) * Math.max(0, intersectY2 - intersectY1);
            const bestArea = (bestBox.x2 - bestBox.x1) * (bestBox.y2 - bestBox.y1);
            const boxArea = (box.x2 - box.x1) * (box.y2 - box.y1);
            const unionArea = bestArea + boxArea - intersectArea;
            
            const iou = intersectArea / unionArea;
            
            if (iou > iouThreshold) {
                boxes.splice(i, 1);
            }
        }
    }
    
    return finalBoxes;
}

/**
 * Run Object Detection on a Canvas element
 */
export const runDetection = async (videoElement: HTMLVideoElement, displayCanvas: HTMLCanvasElement) => {
    if (!detectSession) await initOnnxSessions();
    if (!detectSession) return [];

    const inputSize = 640;
    
    // Create an offscreen canvas to resize the video frame
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = inputSize;
    offscreenCanvas.height = inputSize;
    const ctx = offscreenCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [];
    
    // Draw and resize the video frame to 640x640 (squishing is fine for YOLO)
    ctx.drawImage(videoElement, 0, 0, inputSize, inputSize);
    const imgData = ctx.getImageData(0, 0, inputSize, inputSize);
    
    // Run ONNX Session
    const tensor = imageDataToTensor(imgData.data, inputSize, inputSize);
    const results = await detectSession.run({ images: tensor }); // 'images' is usually the input name for YOLO
    
    // Output names vary, usually output0
    const outputName = detectSession.outputNames[0];
    const outputTensor = results[outputName];
    
    const boxes = processYoloOutput(outputTensor, 0.4, 0.45);
    
    // Scale boxes back to display canvas coordinates
    const scaleX = displayCanvas.width / inputSize;
    const scaleY = displayCanvas.height / inputSize;
    
    return boxes.map(b => ({
        ...b,
        x1: b.x1 * scaleX,
        y1: b.y1 * scaleY,
        x2: b.x2 * scaleX,
        y2: b.y2 * scaleY,
    }));
};

/**
 * Run Classification on a Canvas element
 */
export const runClassification = async (videoElement: HTMLVideoElement) => {
    if (!classifySession) await initOnnxSessions();
    if (!classifySession) return null;

    const inputSize = 224; // Standard classification size
    
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = inputSize;
    offscreenCanvas.height = inputSize;
    const ctx = offscreenCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    
    ctx.drawImage(videoElement, 0, 0, inputSize, inputSize);
    const imgData = ctx.getImageData(0, 0, inputSize, inputSize);
    
    const tensor = imageDataToTensor(imgData.data, inputSize, inputSize);
    const results = await classifySession.run({ images: tensor });
    
    const outputName = classifySession.outputNames[0];
    const outputTensor = results[outputName];
    const data = outputTensor.data as Float32Array;
    let maxConfidence = 0;
    let classId = -1;
    
    // The ONNX model already outputs softmax probabilities for YOLOv8-cls
    for(let i = 0; i < data.length; i++) {
        const prob = data[i];
        if (prob > maxConfidence) {
            maxConfidence = prob;
            classId = i;
        }
    }
    
    return {
        className: CLASSIFICATION_CLASSES[classId] || "Unknown",
        confidence: maxConfidence
    };
};
