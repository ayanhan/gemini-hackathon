---
name: PNG to HTML Converter
description: Recreates a PNG screenshot or picture as a responsive, high-fidelity Vanilla HTML/CSS component. Extracts or regenerates sub-components before composing the final HTML. Supports style transfer.
---

# PNG to HTML Converter Skill

## 🎯 Objective
To convert static images, screenshots, or mockups (PNG) into fully functional, high-fidelity Vanilla HTML and CSS components. This skill ensures that complex images are broken down into their constituent parts (text, layout, and sub-images) and reconstructed perfectly, while also supporting stylistic adaptation.

## 🛠 Usage
This skill is executed by analyzing the visual input and performing a multi-step recreation process.

### Prompting Pattern
When invoking this skill, provide the source image and state your intent.
* **Exact Match:** "Recreate this screenshot as HTML/CSS."
* **Style Transfer:** "Recreate this screenshot as HTML/CSS, but transfer the style to the [Provided Style System]." (The style is dynamically passed as input by the calling agent).

## 📋 Operational Guidelines

### 1. Image Analysis & Component Extraction
* **Deconstruct the Image:** Visually scan the input image to identify all independent components (e.g., product photos, avatars, background textures, UI icons).
* **Isolate Sub-Images:** If there are smaller, independent images within the main screenshot (e.g., 2 or 3 distinct product pictures), these must be identified as separate assets.

### 2. Asset Generation & Cropping
* **Crop or Regenerate:** For each identified sub-component, you must either:
  * Crop them directly from the original image (if clean and reusable).
  * Regenerate them independently (using image generation capabilities) to improve resolution or fit a specific theme.
* **Local Storage:** Save these distinct visual assets locally (e.g., in the `images/` directory) so they can be referenced in the final markup.

### 3. HTML/CSS Composition
* **Vanilla Stack:** Use standard HTML for the structure and Vanilla CSS for styling (interpreting "nano banana" as standard Vanilla HTML/CSS).
* **Fidelity:** Reconstruct the layout utilizing modern CSS (Flexbox/Grid). Aim for structural alignment that is as close or equal to the original screenshot as possible.
* **Integration:** Seamlessly embed the cropped/regenerated sub-images into the HTML layout.

### 4. Style Transfer Directive (Optional)
* **Aesthetic Adaptation:** If a command specifies *not* to copy the exact look but instead apply a "style transfer", maintain the core structural layout and content, but modify the visual aesthetics (colors, typography, borders, shadows) to match the style system passed as input by the calling agent (e.g., BoringClicks or any other provided style).

## 🚀 Execution Workflow
1.  **Analyze Input:** Examine the provided PNG to identify the core layout, text blocks, and standalone sub-images.
2.  **Process Sub-images:** Crop or regenerate the independent small images and save them as discrete files.
3.  **Draft Structure:** Write the HTML skeleton, inserting `<img>` tags pointing to the processed sub-images.
4.  **Apply Styles:** Write the Vanilla CSS to match the original layout exactly, or apply the requested style transfer if specified.
5.  **Review:** Visually verify the final HTML output against the original PNG (and any style transfer instructions) to ensure high fidelity and correctness.
