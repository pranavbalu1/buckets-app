ONNX Runtime WebAssembly assets

These runtime files are copied from onnxruntime-web 1.24.3, which matches the
version bundled into @paddleocr/paddleocr-js 0.4.2's prebuilt worker. Serving
them from the app origin keeps PaddleOCR independent of third-party CDN access.

Files live under `1.24.3/` so browser caches cannot mix this runtime with a
different version. The worker can request the JSEP loader even when OCR uses
the WASM execution provider, so both its loader and companion WASM file must
be available at the configured path.
- 1.24.3/ort-wasm-simd-threaded.mjs
- 1.24.3/ort-wasm-simd-threaded.wasm
- 1.24.3/ort-wasm-simd-threaded.jsep.mjs
- 1.24.3/ort-wasm-simd-threaded.jsep.wasm

The required WASM runtime files total about 37 MB. onnxruntime-web is
distributed under the MIT License.
https://github.com/microsoft/onnxruntime
