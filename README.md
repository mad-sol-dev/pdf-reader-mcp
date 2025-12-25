# 📄 PDF Reader MCP (Vision & OCR Edition)

<div align="center">

> **Give your AI eyes.** The ultimate PDF tool for Claude Desktop.
> Reads text, sees diagrams, and digitizes scans using Mistral AI.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Local Build](https://img.shields.io/badge/Install-Local%20Build-green)](https://github.com/BadlyDrawnBoy/pdf-reader-mcp)

</div>

---

## ⚡ Why this one?

Most PDF tools just dump raw text. This one is different:

1.  **It sees Diagrams:** Uses **Computer Vision** (Mistral) to understand charts, timing diagrams, and technical drawings.
2.  **It reads Scans:** Built-in OCR detects scanned pages and converts them to text automatically.
3.  **It's Fast & Cheap:** Parallel processing (5-10x faster) and creates a local cache so you don't pay for API calls twice.
4.  **Smart Fallback:** If you don't have an API key, it intelligently degrades to standard text extraction or passes images to Claude.

> ✅ **Battle-tested** on 897-page chip datasheets for reverse engineering. [See real-world test results](./TESTING_NOTES.md)

---

## 🚀 Quick Start (2 Minutes)

Since this is a power tool, we build it locally to give you full control.

### 1. Install Prerequisites
You need **Git**, **Node.js** (v22+), and **Bun** (a fast Node alternative).

*Don't have Bun?*
```bash
# Mac/Linux/WSL
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

### 2. Download & Build
Open your terminal/PowerShell and run:

```bash
# Clone the repo
git clone https://github.com/BadlyDrawnBoy/pdf-reader-mcp.git
cd pdf-reader-mcp

# Install & Build
bun install
bun run build

# ⚠️ COPY THE PATH BELOW - You need it for the config!
echo "Your absolute path is:"
pwd
# (On Windows, use 'cd' to see the path)
```

### 3. Configure Claude Desktop

Open your config file:
*   **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
*   **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add this (replace `/YOUR/PATH/...` with the path from Step 2):

```json
{
  "mcpServers": {
    "pdf-reader": {
      "command": "node",
      "args": ["/YOUR/PATH/TO/pdf-reader-mcp/dist/index.js"],
      "env": {
        "MISTRAL_API_KEY": "your_mistral_key_here",
        "PDF_ALLOWED_PATHS": "/Users/Me/Documents:/Users/Me/Downloads"
      }
    }
  }
}
```

> **Note on API Keys:** `MISTRAL_API_KEY` is optional but highly recommended for OCR and Diagram analysis. Without it, the tool falls back to basic text extraction.

---

## 🗣️ How to use it (Prompts)

Once installed, restart Claude Desktop. You don't need to use technical commands. Just talk:

**📄 Standard Reading**
> "Read the file `specification.pdf` and summarize the introduction."

**📊 Analyzing Diagrams (The Superpower)**
> "Look at the timing diagram on page 5 of `datasheet.pdf`. Explain the signal sequence."
> *(The tool will auto-select `pdf_vision` for this)*

**🧾 Reading Scans (OCR)**
> "This `invoice_scan.pdf` is an image. Extract the total amount and date."

---

## ⚙️ Configuration & Security

To keep your files safe, this tool uses a security allowlist.

| Variable | Function | Example |
|----------|----------|---------|
| `PDF_ALLOWED_PATHS` | **Required.** Colon-separated list of folders the AI can access. | `/Users/Me/Docs:/tmp` |
| `MISTRAL_API_KEY` | Enables Vision & OCR. Get one at [console.mistral.ai](https://console.mistral.ai). | `xYz123...` |
| `PDF_BASE_DIR` | (Optional) Base folder for relative paths. | `/Users/Me/Projects` |

**Troubleshooting: "Resolved path is outside allowed directories"**
If you see this error, it means you are trying to read a PDF that isn't in one of the folders listed in `PDF_ALLOWED_PATHS`. Add the folder to your config and restart Claude.

---

## 🛠️ For Developers: The Toolkit

Under the hood, this server exposes these tools to Claude:

*   `pdf_read`: Fast, parallel text extraction. Supports `[IMAGE]` markers.
*   `pdf_vision`: Uses Mistral Vision for complex visual elements.
*   `pdf_ocr`: High-fidelity OCR for scanned docs and tables.
*   `pdf_search`: Regex-enabled search across documents.
*   `pdf_extract_image`: Pulls raw images for manual inspection.

**Caching:**
Results are cached in `{filename}_ocr.json` next to your PDF.
*   First run: Takes a few seconds (API call).
*   Second run: Instant (Local cache).

---

## 📚 Documentation

- **[TESTING_NOTES.md](./TESTING_NOTES.md)** - Real-world testing with 897-page technical PDFs
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and features
- **[CLAUDE.md](./CLAUDE.md)** - Development guidelines (for contributors)

---

## 🙏 Credits

This project is built on the excellent foundation from **[SylphxAI/pdf-reader-mcp](https://github.com/SylphxAI/pdf-reader-mcp)** – thank you for the solid architecture!

**What they built:**
- Fast parallel processing (5-10x speedup)
- Smart content ordering and error handling
- Flexible path resolution
- Rock-solid test coverage

**What we added:**
- Vision API for technical diagrams (Mistral)
- Enhanced OCR with full response structure
- Smart content routing (Vision vs OCR)
- Real-world validation and testing

**Contributors:**
- **Sylphx Team** - Original architecture and core PDF processing
- **Martin & Claude Sonnet 4.5** - Vision/OCR integration, testing, docs

---

<div align="center">

Built with ❤️ using the [Model Context Protocol](https://modelcontextprotocol.io)

**[Report Bug](https://github.com/BadlyDrawnBoy/pdf-reader-mcp/issues)** • **[Request Feature](https://github.com/BadlyDrawnBoy/pdf-reader-mcp/issues)**

</div>
