# OCR 验证说明

当前 Parser 已覆盖 TXT/PDF/DOCX/XLSX 的解析入库。扫描件 OCR 作为 M6 加固项，采用 PaddleOCR 独立验证，不在默认容器中强制安装超大依赖。

## 本地验证命令

```bash
cd services/parser
uv add paddleocr paddlepaddle
uv run python ../../tools/ocr/verify_paddleocr.py /path/to/scanned-sample.png
```

成功标准：脚本能输出中文文本行、置信度，并显示 `OCR_OK`。若环境缺少系统图形库或 CPU wheel 不兼容，先保留为外部 OCR sidecar，不阻塞 BYOD 主链路。

## Docker 示例

见 `infra/ocr/Dockerfile.example`。这是示例 sidecar，不随默认 `infra/docker-compose.yml` 启动，避免显著拉长 MVP 启动时间。
