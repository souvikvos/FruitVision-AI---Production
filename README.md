# 🍎 FruitVision AI

> An advanced, multi-modal agricultural technology platform for real-time fruit classification, object detection, and edge AI inference.

FruitVision AI is designed to automate and enhance agricultural grading. By fusing together state-of-the-art computer vision models, local edge computing, and rule-based expert systems, the platform can instantly identify fruit species, grade health, and evaluate specimens with high confidence.

## ✨ Core Capabilities

### 1. ⚡ Edge AI & Local Inference (ONNX Runtime)
For zero-latency and privacy-first analysis, the platform integrates **ONNX Runtime Web**. This allows our deep learning models to execute directly inside the user's browser via WebAssembly (WASM) and WebGL. By running inference locally at the edge, it guarantees privacy, bypasses network latency, and operates without requiring heavy backend servers for real-time camera scanning.

### 2. 📸 Image Classification Engine
A robust deep-learning image classifier capable of identifying over 40+ fruit species from a single photograph. Powered by a custom Hugging Face model, it delivers real-time confidence scores directly from the neural network inference.

### 3. 🎯 YOLOv8 Object Detection
Built for scalability, the real-time detection module leverages YOLOv8 to process complex images, drawing precise bounding boxes around multiple fruits simultaneously. This allows for bulk specimen analysis in a single frame.

### 4. 🧠 Symbolic Logic AI System
A rule-based inference engine that performs classification without images. By analyzing descriptive text traits (e.g., color, texture, shape, origin), the expert system logically deduces the fruit species, serving as a robust fallback and agronomy research tool.

## 🚀 Technical Architecture

The platform is engineered with a modern architecture focusing on edge-performance and seamless ML integration:

- **Frontend & Framework**: Next.js 14 (App Router) with React, providing a heavily optimized, SSR-capable web interface.
- **Styling & Animation**: Fully responsive, dark-mode integrated UI built with Tailwind CSS and Framer Motion for fluid micro-interactions.
- **Machine Learning Integrations**: 
  - **Client-Side ONNX**: Employs `onnxruntime-web` to load `.onnx` models, executing neural network matrix math directly on the client's local hardware.
  - **Serverless Hugging Face API**: Integrates `@gradio/client` to seamlessly bridge the frontend with remote Hugging Face Spaces for heavy-duty GPU inference tasks.
- **Local Persistence**: Client-side storage implementation for a "Saved Specimens" dashboard, keeping track of historical analysis without requiring a complex backend database.

## 🎨 UI/UX Philosophy
The interface was crafted to provide an immersive, "Command Center" feel. It features dynamic gradients, glassmorphism components, and responsive grid layouts to make complex AI data easily readable and visually stunning for users and agronomists.

---
## 👨‍💻 Creators
Engineered and designed with passion by **Souvik Ghosh** and **Soyam Bhalotia**.
