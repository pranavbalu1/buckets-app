PaddleOCR browser model assets

These PP-OCRv6 Tiny and Small ONNX inference archives are served by this app so
browser requests do not depend on cross-origin access to Paddle's model host.
The ONNX Runtime WebAssembly files are served from `public/ocr-runtime` for the
same reason; the app does not need a CDN connection to run PaddleOCR.

Upstream PaddleOCR model source:
https://paddle-model-ecology.bj.bcebos.com/paddlex/official_inference_model/paddle3.0.0/

Models:
- PP-OCRv6_tiny_det_onnx_infer.tar
- PP-OCRv6_tiny_rec_onnx_infer.tar
- PP-OCRv6_small_det_onnx_infer.tar
- PP-OCRv6_small_rec_onnx_infer.tar

Project and model attribution: PaddlePaddle / PaddleOCR
https://github.com/PaddlePaddle/PaddleOCR
