---
name: HTML to PDF Converter
description: Converts HTML presentations (including Reveal.js) into professional, high-fidelity PDF documents while maintaining all styling and layouts.
---

# HTML to PDF Converter Skill

## 🎯 Objective
To provide a reliable method for exporting browser-based presentations and HTML documents to PDF. This skill ensures that complex CSS layouts, custom fonts, and framework-specific print modes (like Reveal.js) are handled correctly.

## 🛠 Usage
This skill is executed via a Python script that uses Playwright's PDF generation capabilities.

### Command
```bash
python3 .agents/skills/html-to-pdf/scripts/html_to_pdf.py <input_html_path> <output_pdf_path>
```

## 📋 Operational Guidelines
1.  **Reveal.js Detection**: The script automatically appends `?print-pdf` to the URL if it detects Reveal.js content, which triggers the framework's optimized print layout.
2.  **Wait State**: Uses `networkidle` and a short buffer delay to ensure all external assets (images, fonts, CDN scripts) are fully loaded and rendered.
3.  **Layout**: Defaults to **Landscape A4** with no margins, which is ideal for presentations.
4.  **Backgrounds**: Always includes background graphics and colors (`print_background=True`).

## 🚀 Execution Workflow
1.  **Finalize HTML**: Ensure the presentation is complete and all assets are accessible.
2.  **Run Skill**: Execute the `html_to_pdf.py` script with the target file paths.
3.  **Verify**: Open the resulting PDF to check for page breaks, font rendering, and image clarity.

## ⚠️ Requirements
- `playwright` (Python package)
- Chromium browser (installed via `playwright install chromium`)
