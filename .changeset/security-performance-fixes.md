---
"@sylphx/pdf-reader-mcp": patch
---

Security and performance improvements based on comprehensive code review

**Security Fixes:**
- Fix path traversal vulnerability by validating resolved paths stay within allowed directories (PROJECT_ROOT and home directory)
- Add file size limit (100MB) to prevent memory exhaustion from extremely large PDFs
- Improve input validation and error message sanitization

**Performance Improvements:**
- Add concurrency limiting for PDF source processing (max 3 concurrent sources) to prevent memory exhaustion
- Batch processing prevents loading many large PDFs simultaneously

**Breaking Changes:** None - all changes are backward compatible

**Migration Guide:** No migration needed. The path validation now restricts file access to PROJECT_ROOT and user's home directory for security.
