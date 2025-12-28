# Changelog

## 4.0.0 (2025-12-28)

### ✨ Features

- **workflow:** add next_step hints to guide LLM through 3-stage workflow ([ca175a9](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/ca175a92b467a83aa02ab6ce4b27648936caa6dd))
- **ocr:** merge pdf_ocr_page and pdf_ocr_image into unified pdf_ocr ([a640119](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/a6401191b8346952beffad1b28812c8ca81ea014))
- **extract:** rename pdf_get_image to pdf_extract_image ([9070a2c](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/9070a2cc48eca7349b47f1ca50af3842ee6dc4f9))
- **read:** rename pdf_read_pages to pdf_read ([5cb2c5c](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/5cb2c5c576fb8cc2afb567d858625f382dcadc05))
- **info:** add consolidated pdf_info tool ([ade5d05](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/ade5d05cd3dcd2b62c2cd9ded5a3bda9aa329936))
- **ocr:** add default provider from environment variables ([4f6dc6a](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/4f6dc6a96acec3932530b03ee7b415861f6efc47))
- **ocr:** add full Mistral OCR response support (v2.2.0) ([a26fe8e](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/a26fe8e9f5df7418a9b95ef4a09a4c231490fa02))
- **ocr:** add Smart OCR, Mistral OCR API provider, dynamic table detection ([c2c165e](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/c2c165ed89385b98e15146c05a2da191ffbbd79c))
- **ocr:** add mistral provider ([8d1a9f1](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/8d1a9f1b6ba5a074530258a4d002175819a85d45))
- **images:** surface extraction warnings ([5bbca8c](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/5bbca8c327a4b5f079da8652f76d79ef10854f72))
- **security:** guard paths and stream PDF downloads ([179490f](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/179490fc97979b744840d27705b3e6fe9ba6255b))
- **handlers:** add OCR recommendation to image-related responses ([25bf350](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/25bf350703348241bf67bf73b4646670f00bd575))
- **ocr:** add production-ready Mistral Vision OCR wrapper service ([408080e](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/408080ea9a54be3ad21831bab69c9bf70035130a))
- **ocr:** add persistent disk cache for OCR results ([5b39f59](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/5b39f5938a35cd36b080155845d90e515bbaa744))
- **pdf_read_pages:** add insert_markers for content type detection ([4d57484](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/4d57484e579acba5bbe707060e0344d1df84d794))
- **ocr:** add image tools, rendering, and caching ([da70b08](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/da70b08bc40d7bbe09f8b391f6c3780eb663dabb))
- **docs:** migrate to VitePress with modern sleek design ([595dd0e](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/595dd0ed353727b262c509f9f3ab0c3764b05b9c))
- add CMap support for Japanese/CJK PDF text extraction (#251) ([5b9df6a](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/5b9df6aa7dc9a96ea9204aead561b180bb00a6ba))
- migrate documentation from VitePress to Leaf ([c0f14b6](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/c0f14b69c543ab957e80d98232a11ba4b422a5ff))
- preserve text and image order based on Y-coordinates ([3d0a35d](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/3d0a35d07682f8810aa16b3cf9ab24491e03c7cf))
- preserve text and image order in content parts ([0ccf405](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/0ccf405768927436e9c951885898c9e9efa55311))
- add embedded image extraction from PDFs ([6959dd3](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/6959dd340b6869ff321d58274c2514287e03f95a))
- setup docs and benchmarking framework\n\n- Initialize VitePress structure, config, and placeholder pages.\n- Install VitePress dependencies and add npm scripts.\n- Rewrite README.md according to guidelines.\n- Populate initial content for docs sections (API, Design, etc.).\n- Fix Markdown parsing issues and build docs successfully.\n- Create CONTRIBUTING.md and update CHANGELOG.md.\n- Add initial benchmark tests using Vitest.\n- Fix package.json structure and benchmark script.\n- Run benchmarks successfully after adding sample PDF. ([afd29df](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/afd29df444eb426bc53f71ed0cfa259145459c19))
- Enable type-aware ESLint rules ([cf54cf1](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/cf54cf1ba0c56fe959471100201bec5290be2667))
- Integrate Prettier for code formatting ([7496ee2](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/7496ee20c23ddf1e30cccdea8bae68463d380c92))
- Integrate ESLint for code linting ([7ac8a6b](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/7ac8a6bde6176f55a8e288b4d28848c63c8e0d62))
- integrate vitest for testing ([5284b81](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/5284b8180fc3c3a6bd0b57d7f69deaa65fbfefa2))
- Add CHANGELOG, LICENSE and improve release workflow ([3412a07](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/3412a07ea0b4a4bbad86640537a684adbe09f7e1))
- Add support for processing multiple sources in read_pdf ([e7aa844](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/e7aa8445dac4f3983b553cc55639e12a0777b62c))
- Add URL support to all PDF tools ([86d5f75](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/86d5f751c140ee1992c469d08507178be3221b4c))
- Initial implementation of PDF reader tools and project setup ([f4dc988](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/f4dc988d5e408bef17aeb8684473a1478b153175))
- Ensure batch error handling & update docs for v0.5.1 ([45a75b7](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/45a75b7b2819f11c3827de1338a44a35d3726ad2))
- Implement `edit_file` tool for advanced file editing (v0.5.0) ([1cf3b0a](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/1cf3b0a053f1481400e109a24af49bd29f409ec8))
- Use process.cwd() for project root (v0.5.0) ([3521863](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/352186327d07ecf8bc28677806c68d994c6ff178))
- Add Dockerfile and .dockerignore for containerization ([dbd8f15](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/dbd8f1556a1bea5567ad82bf1391165455d6a987))

### 🐛 Bug Fixes

- **validation:** add P1 high-priority security and robustness fixes ([7f560a6](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/7f560a6bc04867c7c2269da007bc852efbb80e3b))
- **search:** prevent ReDoS attacks with RE2 regex engine ([a1d8d24](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/a1d8d2464a30ace056a1545d1332f453e6436665))
- **cache:** prevent data loss and deadlocks in disk cache operations ([704c479](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/704c4790ef5d71e503b49b2280e2c64c0e496887))
- **text-extraction:** correct rotation handling and improve text quality ([f9681f9](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/f9681f90d49db7d88b8e746c5877a2383e569e60))
- **lefthook:** replace hanging doctor prepush with direct test command ([8889d29](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/8889d296f3e11a7fdfe011804df8b7ddb049985c))
- address critical event loop blocking and security issues ([735be07](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/735be077f96c5d8b19fcd1a4be790cda54b5110e))
- **ocr:** extract table content and fix disk cache parameters ([37544dd](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/37544ddfaf09420e41ada23e24b9d1add2d2e9b7))
- **ocr:** correct renderPageToPng calls in pdf_ocr handler ([9fc069b](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/9fc069bdbc41ab60d87d75ea7e1eb2ea05d44059))
- **stdio:** enhance stdout filtering to catch all warnings ([4831550](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/483155018e786eb31a2aeb6fa73e37fd09c2f945))
- **mcp:** filter DOMMatrix warnings from stdout to stderr ([4fa660e](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/4fa660e625b5401432d6afdf20bb06d9555cdc62))
- **ocr:** parse boolean extras from strings ([1bd052a](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/1bd052a673a972042d930b315e720edfbe07570f))
- **rendering:** fix PDF rendering with embedded images ([51d9eb7](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/51d9eb71abc195875fda9cd303026a6f95f07e05))
- **ocr:** add .env.example template to wrapper ([2ca1efb](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/2ca1efbfe28ad0aefcce564411211322444b2bfc))
- **insert-markers:** extract images when insertMarkers enabled ([7beef52](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/7beef522a230728327d56c799d249eb2c421ee17))
- **tests:** use node instead of bun in integration tests ([3bde948](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/3bde948649c068ea87c4c8e68e21f8d61f6e2483))
- **vercel:** use npx for vitepress build command ([167bc03](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/167bc03ee08e614a5709078f783355286584eb56))
- **docs:** rebuild docs with proper leaf configuration ([fc65705](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/fc657054a7402631a4bda3f2368a303150be7cfd))
- **docs:** commit pre-built docs for Vercel deployment ([8b00e4e](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/8b00e4e8fb18b4a25a04b675ed01a050817781fe))
- **build:** rebuild dist for Vex migration ([5bd9833](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/5bd98335f0cab7d82e6b32afad0e8d523b02f9e8))
- remove types export for CLI tool ([eae88b4](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/eae88b4f608ecf0ac2013847ee1dbaddf5ae1c4f))
- use local doctor in lefthook ([827fa5d](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/827fa5d77b06165b3ea67369f32cf7c5caa83998))
- update mcp-server-sdk to 1.3.0 ([4961ce6](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/4961ce6deafa63cd37b7f024c48dd7d66d8b88f2))
- use bunx for leaf commands in scripts ([954d194](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/954d1941d060e6af822c30ab3949577b4cba6d6a))
- update vercel config for leaf docs ([ab27b6b](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/ab27b6bac1954ea7b43c4ed6430882e5b9925ee1))
- remove unnecessary path access restrictions ([0f02777](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/0f02777eb7e190115f35af132981d92339d823a0))
- upgrade mcp-server-sdk to 1.2.0 ([f30c75a](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/f30c75a46bc3c76f7527a3acb14c57fb803dc631))
- ensure mcp-server-sdk 1.1.2 with correct tools/list response ([944e1d7](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/944e1d7b19757b739be7e9484791cd21c485dace))
- upgrade mcp-server-sdk to 2.0.0 to fix tools/list response ([1072389](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/1072389206eecac812fb94112bc212e22f71a3e0))
- upgrade mcp-server-sdk to 1.1.2 ([e597b24](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/e597b24dc86a3299f6f82cd60a42a781042a8175))
- upgrade SDK to 1.1.1 with Node.js support ([8264db1](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/8264db1b6e8784c6bac4757b41ca4b385a7a11ab))
- 💥 use bun shebang for proper runtime support ([b633e33](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/b633e336b55333d898672857b36030a19f5a1acb))
- **ci:** use explicit path for lefthook in prepare script ([a183408](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/a183408630e60734704b95c7ed0186b738f2350c))
- **security:** override js-yaml to fix vulnerability ([a184a28](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/a184a28b522dbf9caab2593cc7f5782f27560279))
- **ci:** allow bun install without frozen-lockfile for Dependabot PRs ([fb92b7c](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/fb92b7c286ed84e2d8b72a8264d748f2c83475e9))
- upgrade to SDK 1.0.0 and Zod 4 for proper JSON Schema support ([4d1c13a](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/4d1c13a9be4dcc149eaa812f78c6b49480534ec8))
- improve image extraction timeout handling ([fd634b7](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/fd634b7577e5320412c40520be4f57c3d131b7b8))
- critical security and performance improvements ([65a93a6](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/65a93a6ca3210e4c16a81bf5e82d6430635c319c))
- **ci:** adjust coverage thresholds to reflect actual coverage ([dbd6990](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/dbd6990a7fa2d9ee4af41779ae49a9ab40bb99c9))
- **ci:** add required permissions to release workflow ([78a7b75](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/78a7b751d0c134471ca1fbcf2ed5cf071a768b00))
- **mcp:** remove stderr pollution to fix Codex stdio handshake (#221) ([009cf36](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/009cf36b54f065327cf2fd0591e94bad7bcc1090))
- remove dead links to ./api/ directory ([3015abb](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/3015abb4652506c80a17d47022f8accb5d67fdd2))
- escape remaining angle bracket in Array<number> ([ab763ab](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/ab763ab2bfa060d098ca742daa039640ac787efc))
- escape angle brackets in TypeScript types ([035353e](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/035353e39b1e50a168e8722d79fa922320854c74))
- **package:** update organization URLs from sylphlab to SylphxAI ([d69ffc5](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/d69ffc515719386fead272546cbc9e308c2de894))
- properly encode raw pixel data from PDFs as PNG images ([b8eee4a](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/b8eee4a128e9243ba79094f814d5dc6fbe0c728a))
- update PdfSourceResult type for exactOptionalPropertyTypes compatibility ([fb93f02](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/fb93f02295a8db5325582e53b67b09c911597f71))
- enable rootDir and adjust include for correct build structure ([a9985a7](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/a9985a7eed16ed0a189dd1bda7a66feb13aee889))
- correct executable paths due to missing rootDir ([ed5c150](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/ed5c15012b849211422fbb22fb15d8a2c9415b0b))
- **publish:** remove dist from gitignore and fix clean script ([305e259](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/305e259d6492fbc1732607ee8f8344f6e07aa073))
- **config:** align package.json paths with build output (dist/) ([ab1100d](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/ab1100d771e277705ef99cb745f89687c74a7e13))
- Run lint-staged in pre-commit hook ([e96680c](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/e96680c771eb99ba303fdf7ad51da880261e11c1))
- **docker:** Ignore scripts during pnpm prune ([02f3f91](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/02f3f91fb1f9af58f512c6e89d4dbe12b22877d1))
- **docker:** Install pnpm globally in builder stage ([651d7ae](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/651d7ae06660b97af91c348bc8cc786613232c06))
- **docker:** Use pnpm instead of npm in Dockerfile ([c202fd4](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/c202fd436e5cd8eb3c8b9e3c5d76210ead5a1688))
- address remaining eslint warnings ([a91d313](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/a91d313bec2b843724e62ea6a556d99d5389d6cc))
- resolve eslint errors in tests and scripts ([ffc1bdd](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/ffc1bdd18b972f58e90e12ed2394d2968c5639d9))
- add missing @eslint/js dev dependency for flat config ([dcd2681](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/dcd2681abe5c60692db0147a03d5430aa6c14878))
- correct Node version and format lockfile for CI ([a2eb985](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/a2eb9852d0722d6bff5dafe3e60d191fe91a0ace))
- Apply stricter type checking for mock implementation ([8a58123](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/8a58123e8116a0efaa29a4add1eda249ed9d6c47))
- Correct unsafe member access lint error in tests ([66c10c9](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/66c10c92d4794081bbd02c7940fbe23b196a5288))
- Address test failures and lint errors after enabling strict rules ([e6c7a98](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/e6c7a985cd6e7235b63900cb713795a12e572f20))
- **docker:** Remove --ignore-scripts from npm ci in builder stage ([6111d38](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/6111d38983f04bb04f6a08ca516f42c6a0fbf8eb))
- **ci:** Use fixed artifact filename instead of step output ([61d91ac](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/61d91ac4ced1a04ca2096befaa5bc3863d3f2e90))
- **ci:** Move condition to archive step, add if-no-files-found to upload ([32435d5](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/32435d5afb2de1ac7fdfd39cd8499c940da20704))
- **ci:** Correct artifact name usage in build job ([b87ed7e](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/b87ed7e9dd1cafe3d4ba1f9f5f121474d70f89e5))
- Add bin field for npx execution and bump version to 0.2.1 ([55dff08](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/55dff08b194b2a8be7c0ddbd74ba055c7f0f448d))
- Correct handler return format for MCP CallToolResponse ([2321e46](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/2321e46eab7b2f502b3a41d9b20dc5317449b20d))
- Correct pdfjs-dist import path for Node.js ([c671dc5](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/c671dc5f8bb6dd24790e51f7a18601c6a3acad8b))
- Bump version to 0.1.1, remove unused bin field ([abfd5cb](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/abfd5cb34f06e65e77ce90720142d0a213271536))
- **docker:** Ignore scripts during npm ci, run build after copy, bump version ([aded372](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/aded372ead406df550e85c262582a4a5f8a923a9))
- **docker:** Correct build stage order, copy all source before build ([c411927](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/c411927159ecbc9c19aa5ce6675a4f9db9b91efc))
- **docker:** Adjust build stage to install all deps before build, then prune ([f45c3de](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/f45c3dead267d1e248dd96bc23fcf36e0f6e4933))
- Correct .dockerignore to include src and tsconfig for build stage, bump version ([f2783d7](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/f2783d753927291a003efb8e3a64556f8a80d844))

### ⚡️ Performance

- **cache:** add P2 medium-priority performance and robustness improvements ([af31d67](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/af31d6792f544af8be623a5cbda0359a5e84c164))
- parallelize page text extraction for 5-10x speedup ([6d2bb29](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/6d2bb29ea559e10a0fd8a65cdeb4178b1ef686d8))

### ♻️ Refactoring

- split Vision and OCR into separate tools for clarity ([a042564](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/a042564de2408ef7e3977ee4890ed3e361380fee))
- complete v3 cleanup and critical bug fixes ([621146d](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/621146db0423374a08d4e6b9955c2a904f577fb4))
- 💥 **ocr:** simplify provider config, move to server-side env vars ([8a9d13a](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/8a9d13a56319dca841930ba3157fe86b80e7f205))
- **cache:** prefix cache tools with underscore for internal use ([838c6a9](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/838c6a9d7a9832038865fc28d7a93c3d2728ba58))
- **ocr:** remove obsolete mistral-ocr-wrapper ([9bd23c6](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/9bd23c69ed183b57d7644487c439522274c6d402))
- **schema:** migrate from Zod to Vex ([3e7ca9a](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/3e7ca9af0ed731f7b350d4de045ac1286cd6651f))
- migrate from @modelcontextprotocol/sdk to @sylphx/mcp-server-sdk ([0517818](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/051781821269e64b37349986de3ddd2fa6ffc302))
- add structured logging system ([5c31c42](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/5c31c426be749f1f20824867f7263af4f6a8507a))
- deduplicate image extraction logic ([9b0141c](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/9b0141cf8fe6484aae901314b5444f01fb7dfb6c))
- implement proper PDF document resource cleanup ([4ec090b](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/4ec090b79212e937c064af25be441c873e37c32b))
- deep architectural refactoring for maintainability ([e61e6bb](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/e61e6bb7814c818fc4ffe190223c90f256e7fd67))
- rebrand from Sylphlab to Sylphx ([6238432](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/62384326ad5ba1f09a40b135e43419f9a3d4501b))
- migrate from ESLint/Prettier to Biome ([a139d3f](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/a139d3f70b573e72355572245d5f7f994803adcd))
- fully standardize build output to dist/ ([2b44ac5](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/2b44ac5602acb36733137700d3080e6b19862234))
- standardize build output to dist/ ([59b5310](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/59b53103a91e36182a441d97e2d06137731144f9))
- **ci:** Parallelize npm and Docker publish jobs ([a569b62](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/a569b627b0af9d28db9524b9ab6dccb4adfc919e))
- address ESLint issues\n\n- Create tsconfig.eslint.json to include test files for type-aware linting.\n- Update eslint.config.js to use new tsconfig and ignore generated files.\n- Run lint:fix to auto-correct issues (import type, nullish coalescing).\n- Manually fix remaining issues (return types, console.info, template literal types).\n- Refactor readPdf handler functions to reduce complexity/length.\n- Relax complexity/length/depth rules for specific files in eslint.config.js.\n- Downgrade unsafe-call rule to warning for test files. ([8f13657](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/8f13657de9d3aa4e4cabcd90d4da7ead2de9e2f7))
- Apply stricter development standards (TS, ESLint, Vitest, CI) ([4daad15](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/4daad1594b7dda4715be2fd04d60bd7f1df31a42))
- **ci:** Revert workflow to align with successful example ([207fab3](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/207fab3a6d68f148d46761de1ce55a8626c0b5f1))
- Move 'pages' parameter to be per-source in read_pdf ([2172de5](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/2172de599d7ea9a2c419b20075f25d988c8f37f5))
- Replace pdf-parse with pdfjs-dist for PDF processing ([01f23e8](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/01f23e89492280640986d78c8125549259ad8b6d))
- Consolidate PDF tools into single 'read_pdf' tool ([84202a0](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/84202a0c02d3889b9503522370b2c661b9894346))
- Remove unused filesystem handlers ([4b2fbc3](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/4b2fbc383613562b2b003b7cedacb4832f0e4989))

### 📚 Documentation

- massive documentation cleanup and user-friendly README rewrite ([b7ff2b4](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/b7ff2b4b447dbc7e82a5fd00bd4bb69d58d5db32))
- **search:** enhance pdf_search description with workflow guidance ([49f269c](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/49f269cd8f087d37aee292f5db2f257c28588951))
- add v3.0 LLM-friendly refactoring plan ([0dfe56f](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/0dfe56f56083c8fdad7cb87318703278cf1d4917))
- add .env.example for environment configuration ([6aeb7b9](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/6aeb7b9328578ac55fed93c3f5708497064bb7ab))
- update for fork status and local build installation ([9e8ad97](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/9e8ad97ce9107713ef6fd352b3d2dbb7151725ae))
- **changelog:** add comprehensive v2.2.0 release entry ([895a835](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/895a835b419b21909be414418d6ac47238874854))
- **guide:** complete index.md rewrite for v2.2.0 ([1475dca](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/1475dca6433716d4e5376424467dc5287fcef2a4))
- **guide:** update getting-started.md for v2.2.0 ([a474bf9](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/a474bf99579a217c7e7c5d69598736f18ed65be1))
- complete README.md rewrite for v2.2.0 ([81009e8](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/81009e80be6ec2dede474807efa281a5d6861bbd))
- add session log for Vision vs OCR API testing ([1d25c1f](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/1d25c1f5f02e9a775376e73aa247603d35626a5e))
- **ocr:** document Vision vs OCR API usage for diagrams ([9ca1c75](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/9ca1c75986449990496228e8915e6faa03bb1ae4))
- **ocr:** add comprehensive Mistral OCR documentation and backlog ([9702c87](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/9702c872d29986c8cdf455ae89e74b7ff60f96c2))
- **ocr:** add two-tier Vision→OCR workflow to backlog + comparison test ([2e5b369](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/2e5b369a8d24a1b2db5b0f05bea8c7d8c207fbb0))
- **ocr:** add comprehensive OCR provider documentation ([4a78071](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/4a78071743637d03deacf0fd5f7880a320c5cb0b))
- **backlog:** mark insert_markers feature as implemented ([f680a75](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/f680a7526ef3fca738b6fbad09af97a5e83e9017))
- update stack references ([ef00989](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/ef00989584bfd597fc33b8f12bf5def758dce5fc))
- update development instructions for bun ([72f0fa7](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/72f0fa74d30c0998a61c1c7db2d4c2a5fece199a))
- overhaul documentation ([f8c35bc](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/f8c35bc4eab755bac33795c7387d0d40b41dd88c))
- add installation guides for VS Code, Claude Code, Cursor, Windsurf, Cline, Warp ([7abf22e](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/7abf22e5a8161930b2aa2e388d9878039422b837))
- add vercel.json for deployment ([aca32de](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/aca32deb92e82da6eebf83746babfe349d52ab0d))
- update organization URLs from sylphlab to SylphxAI and @sylphx ([7f624e7](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/7f624e765f686160a6525674f3000e1f8e4162e4))
- optimize README with performance highlights and branding ([4fcebce](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/4fcebce8a5852a1facadf8a6662e81da34efdcdb))
- redesign README inspired by Craft's clean style ([c342a6d](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/c342a6d031d82b542158ab4a6bdc8544e3f66b9f))
- complete README redesign to eliminate horizontal scroll ([f526eac](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/f526eacc8d491c4cafaa0fb5a950cc956568a46b))
- remove Glama badge and simplify layout ([2309e6a](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/2309e6afb63365a8615b10e212a972f6ed3f1cd7))
- improve badge layout by separating into two rows ([4c34fc9](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/4c34fc9a15c30d5edcb26fcf75f530d6799a381b))
- redesign README with beautiful visual layout ([935f24a](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/935f24a68af2ac24b13fdb25a0c520dace385f61))
- enhance README with comprehensive feature showcase ([30b6cd5](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/30b6cd57eba616527224ee02dd04bd1f2a937e93))
- update README with v1.2.0 content ordering feature ([5add058](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/5add0581beb0d900e0793e20241b032f522e9222))
- revise README for clarity and modern structure ([ade2309](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/ade230916b17dc85c5c6ed12766ad79d6fcecb26))
- update codecov badge token in README.md ([9f3b5f2](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/9f3b5f288f3e3a49feee23fed0bd95d27f3bca5a))
- replace coveralls badge with codecov badge ([c150022](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/c1500224fec1a713b4c5905783fb7fb236d037d6))
- Setup VitePress and add initial documentation content ([426bb5c](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/426bb5c9a081d7c60151d1d0eee2e481b42c6329))
- Clarify multi-source error handling in README output description ([93a1647](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/93a164703b41cd91e271731fe463cbb0bca63b93))
- Remove final comment from JSON example in README ([108e518](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/108e51870f81f09df1ede641ec8b808bc7352a7b))
- Remove comments from JSON examples, add Docker CWD info ([70a701d](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/70a701d898531f83ae4a41a98b5a85a25cbe9069))
- Clarify Docker volume mount path options ([8068218](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/80682185a1797bfed664dffe743d3c83fec069fb))
- add bunx usage to README (v0.4.13) ([2831129](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/2831129587b7829dfaac425722db9d16fcecd642))
- Remove comments from README JSON examples for standard compliance, update memory bank, bump version ([7bd94dd](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/7bd94dd424777eb60588d28c55d5eb0efbd6f8be))
- Re-add comments to README examples, update memory bank, bump version ([3efa65b](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/3efa65b3f35370a6f20ea2c8953854fd1765f63d))
- Prioritize npx, highlight core features in README, bump version ([517c69e](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/517c69e65382c830b599793ec872a3103f593be0))
- Remove comments from JSON examples in README, bump version ([4994530](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/4994530b932507fc3c92a26a8b94519eccea9256))
- Refactor README for clarity and Docker focus, bump version ([fb024d6](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/fb024d66c93d83112276194f27b55858bb82ace5))
- Add Docker usage instructions to README and bump version ([2bc6b13](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/2bc6b1353a727e6375ea8eaabaa97ddbd7470943))
- Remove 'disabled' field from README examples and bump version ([588a9fa](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/588a9fa1d38e5c40b9f72b24f4053b7eeabbc056))
- Update README.md with badges and improved structure ([cc091ea](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/cc091ea838d114f76fd55cfac2ca91b8ed62e74c))

### 💅 Styles

- Apply Prettier formatting ([fe7eda1](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/fe7eda15ead1b6f389afb46534aaf9c07944397a))
- Apply Prettier formatting ([d639244](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/d639244147234cb3f6b2a7f14c756253a582a253))
- Apply Prettier formatting ([fdd965e](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/fdd965ed4f89ef1ad8ae508f675cea55a95a12a0))
- format activeContext.md again ([d855f8a](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/d855f8aff258816dc1428cf5f8b97e6fa7065f06))
- format activeContext.md ([c62a7e3](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/c62a7e36ead7afa4fbb9d6db5f858b73627fa7a3))
- format test files again after eslint fixes ([523c397](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/523c397843a5066d2dc1e4cafdebaf708741076e))
- format test files after eslint fixes ([97a8335](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/97a833576d532cd987b03cc14cddbc317cf47d9e))
- format code with prettier ([5344783](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/53447834daaca492d65997a5637f68da843488c0))
- format pnpm-lock.yaml ([8713596](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/8713596dc28341b23f0f6705209285b2bf3b440e))
- format test and vitest config files ([4dbbe08](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/4dbbe0841e472388403ea8bd1e964aaa08b22f66))
- format readPdf.test.ts with prettier ([7105653](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/7105653294066bb107965aef341a19d45bc1658f))
- Format documentation and source files with Prettier ([d052105](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/d05210564785877eef52ce54ef4facff2c1b4956))

### ✅ Tests

- comprehensive test coverage for refactored modules ([236b3e2](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/236b3e2cefc358e20ab652975d527336e8f00de6))
- improve coverage for readPdf handler and adjust thresholds ([7bb4ead](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/7bb4ead8a9298079fa9bf3dd32f37ae80b1e83b2))
- add tests for readPdf handler ([fa1177b](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/fa1177b3400722ed692178f8b63b4614abcd8e40))

### 👷 CI

- make Codecov uploads non-blocking ([070ec4d](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/070ec4d9ef033b2c169a387e65892dbc502677d7))
- replace coveralls with codecov ([5ceae9e](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/5ceae9ea81cbed6a9d589569a436930f1bd2e1ae))
- add explicit format step before check ([7c8cb6d](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/7c8cb6dfd7de9f1abf049ee1b113381560ce4b0f))
- fix pnpm setup order in workflow ([7c105dc](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/7c105dc532a596e4c0a04d2ea90f060f4c1c0210))
- update workflow to use pnpm ([b225cd0](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/b225cd0272704d65d1df713e0f0210ef9aa22f2c))
- Add ESLint check to workflow ([a7832d7](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/a7832d75c959732a902403115b0da0ed2e302fc0))
- Trigger publish jobs only on version tags (v*.*.*) ([6ef0769](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/6ef0769e6f9ccdcb177ba957c267d0119d4d51ab))
- Separate build and publish jobs, run publishes in parallel ([cf88013](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/cf8801339876b1ab53774f77f3a04122ef300f64))
- Add steps to build and push Docker image to Docker Hub ([8d43fcb](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/8d43fcb4d382ddd4d403782edcfcb769875e7d55))

### 🔧 Chores

- anonymize author information ([0169be1](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/0169be102ab7359df4e93f8453d5ee110c3a2879))
- update GitHub username from BadlyDrawnBoy to mad-sol-dev ([72ee691](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/72ee691dc1f0cbb80f17b2a397be1916497541ef))
- 💥 bump version to 3.0.0 ([6c3f4af](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/6c3f4afd448e3c5a4114ac81b7c8a64c38945695))
- **repo:** update local artifacts ([330d4bc](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/330d4bcdf3e91190a536e6a56fd2e68b72eb6089))
- update docs URL to pdf-reader-mcp.sylphx.com ([d84d9dc](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/d84d9dc466074052db61be01f52c0d81df9e8131))
- **deps:** upgrade @sylphx/mcp-server-sdk to ^2.1.0 ([7912e47](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/7912e475e23924df982c1f6285c1ff23da744f8c))
- trigger release PR ([0192a57](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/0192a57876ad6d3fc62f79e6ef1cbc1e2abe7d37))
- test bump action fix ([c379201](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/c3792019704b45988f75c13e0f730564370213a7))
- update doctor and lefthook ([34a63b2](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/34a63b298ee349ca2128df190ac624325f4e980e))
- trigger release workflow ([f81afd5](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/f81afd568c9543c290370115ec660b07b77e5e0e))
- update dependencies and fix doctor issues ([6e5a11e](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/6e5a11e0821b6ccfe4997dbd68b3b438bbf1afb2))
- update @sylphx/doctor to 1.26.0 ([13af5a7](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/13af5a7d2c0f156846c463a4d86923ab05a10edf))
- migrate biome config to 2.3.8 ([f6ae632](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/f6ae632cceb7f414381289e39f0ece03efe6c5fc))
- update lockfile for glob 13.0.0 ([6170a7b](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/6170a7b20e03a30d1edc3dc6a0a1958c6239df46))
- **deps:** bump glob from 11.1.0 to 13.0.0 (#225) ([651c5cb](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/651c5cb7317845cdc627fbdba9f1b4801a124b63))
- upgrade @sylphx/bump to v0.12.1 ([6db92cc](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/6db92ccc7bcfc61ac676055a9688fa4a64609d24))
- upgrade @sylphx/doctor to v1.23.3 and @sylphx/bump to v0.10.2 ([1e1196f](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/1e1196fddb35b89c294c0404b7a9671635f00868))
- upgrade @sylphx/doctor to v1.23.2 ([e9ea7a4](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/e9ea7a4b3e1065cfb55ef1389f9e2bc0e0b70a1a))
- migrate tooling to @sylphx ecosystem ([9f7c91b](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/9f7c91b10a38bf68f0dda62e6da5af66a6159fc2))
- upgrade all packages to latest versions ([b71fa28](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/b71fa28c1af2b14f351f2025d54483d8adabde3f))
- cleanup unused files and folders ([5abf0ce](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/5abf0ce15d25a0bc24b1dd9bda804280129e01fc))
- migrate from Vitest to Bun test runner ([3c7c6c3](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/3c7c6c30cf7c3d576e3f006b26bff46c442ef815))
- adjust coverage thresholds after adding defensive code ([7dbd6c9](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/7dbd6c9da08ee4c87e477ec306221e1a68e2d9ce))
- add changeset for CI workflow refactor ([927f251](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/927f25100a1e9b2e086a46e7c88df933d7729fe1))
- **deps:** add bunup as devDependency ([767eac4](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/767eac41904049587b2494d68483b07c3ab35ffb))
- add changeset for patch release ([b4828fb](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/b4828fb5e4aa972f7a197b5c0175e6ffb0749e91))
- **ci:** refactor workflows to use company release standard ([00e93a4](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/00e93a4fef17e405db4796d22a414f23292a616d))
- **ci:** migrate to bun and initialize changesets ([5a2e5a7](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/5a2e5a77c3d38a3760a0001272844f078cdd97ba))
- **ci:** initialize changesets with public access ([f98392e](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/f98392e19583257a580e5591aa3bf73349ddba9a))
- **ci:** migrate to shared workflow ([60e9548](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/60e954875a50177ca038761695872070fce7846d))
- update build script to bunup ([c644f59](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/c644f59747da2fc2a9a6e281f5d684e5e403b589))
- add packageManager field (bun@1.3.1) ([db72654](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/db72654f59d590ce9d4826475d108df74b5e6fce))
- add test coverage badge (94.17%) ([94c57c6](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/94c57c6c3ed9d45c89791302991002e057590bc2))
- update organization name from sylphxltd to SylphxAI ([efb3e45](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/efb3e452d7caa758e6841c6d81e5476595a69bc5))
- release v1.3.0 - add absolute path support ([9ddf0d9](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/9ddf0d98bc0fa78f6c47f6168fc10e0b91af7469))
- remove PLAN.md and eslint config files ([61b22b8](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/61b22b872ff41b03b90ce8c305f7f0fcf7865fef))
- remove memory-bank documentation folder ([7573fb3](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/7573fb38089a945bd79ca3bf0d67e9d16d7e2a83))
- remove Docker support ([c280aef](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/c280aef1499ad145fbff5dea4eb850db1df26c78))
- adjust coverage thresholds to match current coverage ([3e8aaf0](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/3e8aaf06c1ddd5c3cd0aabde65a770da2354c773))
- remove .roo folder ([fb64f83](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/fb64f83fe874579af2082d3ff69657eec77aa90f))
- upgrade all dependencies to latest versions ([d835170](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/d83517076b2fd6d22e369d116ff63e5f3ab7cf78))
- format all files with prettier ([73a5bbd](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/73a5bbda98e1a98e6611290432457cf252ffd3ca))
- add Claude Code and MCP server configurations ([ed3c7a4](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/ed3c7a46dc24a971c9c11065db894b0013479437))
- use pnpm in prepublishOnly script ([ecc7890](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/ecc78903344fbfefc3f07bb24ada519004f96def))
- **docker:** Use node:lts-alpine instead of specific version ([50f9bdd](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/50f9bdd362592df946bdd54515d896fa7035be6c))
- Ignore JUnit test report ([1bff7bb](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/1bff7bbe9e2dc8b1c74a5bc702aad067cb5ca51a))
- complete major guideline alignment and documentation updates ([03646d7](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/03646d7347a72e2511b8f50c759cd7fee67798e5))
- update husky configuration\n\n- Changed the prepare script in package.json to use 'husky' instead of 'husky install'.\n- Added a pre-commit hook to run 'pnpm test' before commits. ([63c2fd4](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/63c2fd4ee2f2a5e2c065ce5010533655cc9d4d7d))
- revert CI format step and ensure pre-commit hook exists ([9840c8f](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/9840c8f44b467db5807fbadd880641451e4ba78e))
- lower test coverage thresholds to pass CI\n\nLowered thresholds for lines, statements, and branches in vitest.config.ts\nto match current coverage levels (approx. 92%/92%/80%).\n\nTODO: Increase test coverage for src/handlers/readPdf.ts in a future task. ([e5b8191](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/e5b8191a68d29983d4db6730364816f951357ea3))
- add .gitattributes to enforce LF line endings ([f994f82](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/f994f821070699d7678b2433e7588a27f4fa1efd))
- switch package manager to pnpm\n\n- Delete package-lock.json.\n- Generate pnpm-lock.yaml using 'pnpm install'.\n- Update memory bank to reflect the change. ([2ef07b3](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/2ef07b3773dd8be03af4402f66e7434893e12984))
- align project configuration with guidelines ([48ff4e9](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/48ff4e9ea472c0fc6024aac2d5caa5a57d509787))
- update project identity to sylphlab scope and author name ([b1c3f03](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/b1c3f03fc1fb1f39bf287ec8b0c796774957e2c4))
- Align project with development guidelines ([c395d38](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/c395d38546d801e9f07696e52368b89618b5d8ae))
- Bump version to 0.3.9, update CHANGELOG ([2462d71](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/2462d7137e0900005c569c918f9c29749f1d5621))
- Bump version to 0.3.8, update CHANGELOG ([212b108](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/212b108688ddc1b8528b80cfa2b4ecdf8a3a2d00))
- Bump version to 0.3.7, update CHANGELOG ([411e5d9](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/411e5d94b40fbca37f325141d89eee5580251347))
- Bump version to 0.3.6, update CHANGELOG ([bac42e1](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/bac42e15cdf18953ed3ac194c3462d164c2aafc5))
- Bump version to 0.3.5, update CHANGELOG ([07d242c](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/07d242cfd5d9b9db3df0acebf814c5e75be99844))
- Bump version to 0.3.4, update CHANGELOG ([5d086dd](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/5d086dd11616dc650c8f92fc77e6f92ea145f38f))
- Bump version to 0.3.3, update CHANGELOG ([96edb4d](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/96edb4da8e09db05f3a5a973345abb11fcd94337))
- Bump version to 0.3.2, update CHANGELOG ([9c2dcf7](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/9c2dcf7c4256c400b417e36dad3d87511c3efc57))
- Bump version to 0.3.1 and update CHANGELOG ([bd9111c](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/bd9111c11c7461fc9500f80726147cab5cd9dd86))
- **ci:** Downgrade upload-artifact to v3 for debugging ([4f58464](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/4f58464ea9c903699444004c93fe39a7bb32141d))
- **ci:** Restore if condition for artifact upload ([2b670c4](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/2b670c4a7ea0657710781c924b077d4c7ef67293))
- **ci:** Simplify upload-artifact path for debugging ([1ffb732](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/1ffb7323be0a685499bfbc66d220cb3fc5a158af))
- **ci:** Revert path in upload-artifact, keep quotes on name ([01a1a4d](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/01a1a4da6fc490419b84fac6fb776574ceb32218))
- Bump version to 0.3.0 and update CHANGELOG ([4f58bdb](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/4f58bdbca985061aedf74ffe1403943d4a29c452))
- Bump version to 0.2.2 ([742eed2](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/742eed237aae6a28b046a16a82e9304084e289c8))
- Bump version to 0.2.0 ([5937454](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/59374549345aeccc7555710cb2dfe88e9e25787f))
- Bump version to 0.4.1 for README update on npm ([e3dcdd8](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/e3dcdd8c18e5ed6d01a73cd80e01c80c2097e723))

### ⏪ Reverts

- restore build paths in package.json ([4e3c7be](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/4e3c7be841180859302808ba6bb78825a7998462))

### 💥 Breaking Changes

- bump version to 3.0.0 ([6c3f4af](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/6c3f4afd448e3c5a4114ac81b7c8a64c38945695))
  Version 3.0.0 introduces breaking changes
- **ocr:** simplify provider config, move to server-side env vars ([8a9d13a](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/8a9d13a56319dca841930ba3157fe86b80e7f205))
  Remove provider parameter from pdf_ocr tool
- use bun shebang for proper runtime support ([b633e33](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/b633e336b55333d898672857b36030a19f5a1acb))
  Requires Bun runtime instead of Node.js

## [3.1.0] - 2025-12-25

### 🐛 Fixed

- **Text extraction:** Viewport-Transformationen für korrekte Lesereihenfolge bei rotierten Seiten
  - Text erscheint jetzt in natürlicher top-to-bottom Reihenfolge für alle Rotationen (0°, 90°, 180°, 270°)
  - Koordinaten werden korrekt durch viewport transform berechnet statt rohe PDF-Koordinaten zu nutzen
  - ⚠️ **Breaking Change:** Output-Reihenfolge kann sich für rotierte Seiten ändern (dies ist ein Bugfix - vorher war die Reihenfolge inkorrekt)

- **Word spacing:** Intelligente Leerzeichen-Einfügung verhindert Wort-Zusammenklebung
  - Heuristik: Leerzeichen wird eingefügt wenn `gap > fontSize × 0.35`
  - Berücksichtigt vorhandene Leerzeichen und Interpunktion
  - Verbessert Lesbarkeit für Dokumente mit variablem Textabstand

- **Smart-OCR:** Extrahierten Text zurückgeben statt leerer String bei skip
  - `smart_ocr_skip` Responses enthalten jetzt den Text der als ausreichend bewertet wurde
  - Beide Pfade (cached und non-cached decisions) geben jetzt Text zurück
  - `from_cache` Flag wird korrekt gesetzt

- **MCP compliance:** Alle Logs nach stderr für sauberes JSON-RPC auf stdout
  - Logger-Output (inkl. `info` level) geht jetzt nach stderr statt stdout
  - Verhindert Korruption des MCP JSON-RPC Protokolls durch Log-Ausgaben
  - Behebt intermittierende MCP-Protocol-Fehler durch Dependency-Warnings

### ✨ Added

- `src/pdf/geometry.ts`: Affine Transform-Utilities für Koordinaten-Konversion
  - `multiplyTransform()`: 2D Matrix-Multiplikation
  - `transformXY()`: Viewport-Transform auf Item-Koordinaten anwenden
  - `calculateLineEpsilon()`: Dynamisches Epsilon für Zeilengruppierung

## Unreleased

### ✨ Features

- **pdf_vision:** Split Vision API into dedicated tool (from unified pdf_ocr)
  - New `pdf_vision` tool specifically for analyzing diagrams, charts, and illustrations
  - Uses Mistral Vision API for semantic understanding of technical graphics
  - Supports both full page rendering and specific image extraction
  - Auto-fallback to PNG image when MISTRAL_API_KEY is not configured
  - Persistent disk cache for Vision results
  - Clear separation: pdf_vision for diagrams, pdf_ocr for text/tables

- **pdf_read:** add `insert_markers` parameter to insert content type markers inline with text
  - Inserts `[IMAGE n: WxHpx, format]` markers at image positions when enabled
  - Inserts `[TABLE DETECTED: n cols × m rows]` markers for detected table structures
  - Table detection uses X/Y-coordinate alignment heuristics (requires ≥3 columns and ≥3 rows)
  - Helps identify pages with complex visual content that may need Vision/OCR
  - Enables selective processing (e.g., Vision only 50 of 800 pages with markers)
  - Non-breaking change: defaults to `false` to preserve existing behavior

- **pdf_ocr:** Persistent disk cache for OCR results
  - 3-layer cache architecture: in-memory → disk → API
  - Stores OCR results as `{pdf_basename}_ocr.json` alongside PDFs
  - Survives MCP server restarts and reduces expensive API calls
  - Fingerprint validation automatically invalidates cache on PDF changes
  - Unified tool supports both page OCR and image OCR
  - Only works for file-based PDFs (not URLs)

### 🐛 Bug Fixes

- **pdf_read:** fix image extraction when `insert_markers=true` but `include_image_indexes=false`
  - Images were not being extracted for marker insertion
  - Now extracts images when EITHER parameter is enabled

## 2.2.0 (2025-12-23)

### ✨ Features

- **Vision API Support** — Analyze technical diagrams, charts, and illustrations
  - Mistral Vision API integration (`type: "mistral"`) for semantic understanding
  - Claude Vision API support for highest accuracy analysis
  - Custom prompt support for guided diagram analysis
  - Persistent disk cache for Vision API results
  - 5x cheaper than Claude Vision with comparable accuracy
  - Tested on real technical diagrams (timing diagrams, circuit schematics)

- **Enhanced Mistral OCR** — Full response structure with rich metadata
  - Extended `OcrResult` interface with `pages`, `model`, and `usage_info` fields
  - `pages` array includes images, tables, hyperlinks, dimensions per page
  - `MistralOcrImage` with bbox, width, height, optional base64
  - `MistralOcrTable` with HTML output and bbox
  - `MistralOcrUsageInfo` with token counts (prompt, completion, total)
  - Opt-in via `includeFullResponse: "true"` parameter (backward compatible)
  - All extras preserved through handler chain using spread operator

- **Smart OCR Decision** — Intelligent OCR skipping for cost optimization
  - Automatically skip OCR when native text extraction is sufficient
  - Configurable decision heuristics (text length, non-ASCII ratio, image-to-text ratio)
  - Response includes `skipped: true` and `reason` when OCR is bypassed
  - Saves API costs on large documents with mixed content
  - Enable via `smart_ocr: true` parameter

- **Three-Stage OCR Workflow** — Optimized workflow for technical documents
  - Stage 1: Text extraction with `[IMAGE]` and `[TABLE]` markers
  - Stage 2: Vision API for diagrams and charts (semantic understanding)
  - Stage 3: OCR API for scanned text and tables (structured extraction)
  - Clear API selection strategy documented with real test results
  - Cost-effective routing: Vision for diagrams, OCR for text

### 🐛 Bug Fixes

- **OCR:** parse boolean extras from strings ([75a2cea](https://github.com/mad-sol-dev/pdf-reader-mcp/commit/75a2cea))
  - Added `parseBool()` helper function to handle MCP schema string constraints
  - Supports both boolean and string inputs for `includeFullResponse`, `includeImageBase64`, `extractHeader`, `extractFooter`
  - Fixes validation error "Expected string" when passing boolean values

- **Handlers:** preserve full OCR response structure
  - Fixed `src/handlers/ocrPage.ts` (line 240) to use spread operator `...ocr`
  - Fixed `src/handlers/ocrImage.ts` (line 124) to use spread operator `...ocr`
  - Ensures `pages`, `model`, and `usage_info` are preserved in responses
  - Previously only returned `text` and `provider` fields

### 📚 Documentation

- **Complete documentation overhaul** for v2.2.0
  - Complete README.md rewrite with Vision vs OCR distinction throughout
  - Created TESTING_NOTES.md with real-world testing results (N3290x Design Guide, 897 pages)
  - Documented limitations: Vector graphics vs embedded bitmaps
  - Practical workflow validated on technical chip documentation
  - Added auto-fallback behavior documentation
  - Cache architecture clearly documented
  - Credited @sylphx for solid foundation while highlighting massive expansions

### 🎯 Critical Insights

- **Vision APIs Required for Diagrams** — OCR APIs fail on technical diagrams
  - Test results: Mistral Vision extracted 6/6 signals, Mistral OCR only 1/6
  - OCR API optimized for text documents (invoices, forms, tables)
  - Vision API required for semantic understanding (diagrams, charts, illustrations)
  - Clear decision tree documented in all guides

- **Cost Analysis** — Mistral Vision 5x cheaper than Claude Vision
  - Mistral Vision: ~$0.003 per image (excellent quality)
  - Claude Vision: ~$0.015 per image (excellent quality)
  - Mistral OCR: ~$0.002 per page (excellent for text)
  - 100-page technical manual: $0.25 (right approach) vs $0.85 (Claude Vision only)

## 2.1.0 (2025-12-17)

### ✨ Features

- add CMap support for Japanese/CJK PDF text extraction (#251) ([8ba4453](https://github.com/SylphxAI/pdf-reader-mcp/commit/8ba4453282e1583e9dfc003f731f32dff98da86e))

### 🐛 Bug Fixes

- align server metadata version with package release

## 2.0.8 (2025-12-05)

### 🐛 Bug Fixes

- **build:** rebuild dist for Vex migration ([ab5d501](https://github.com/SylphxAI/pdf-reader-mcp/commit/ab5d501a1dd1a1c6a5281bf06a1e645d1bb6e47e))

### ♻️ Refactoring

- **schema:** migrate from Zod to Vex ([efc2dce](https://github.com/SylphxAI/pdf-reader-mcp/commit/efc2dce4c57512c442d1e4185e7bb4234406ce82))

### 🔧 Chores

- **deps:** upgrade @sylphx/mcp-server-sdk to ^2.1.0 ([64b6381](https://github.com/SylphxAI/pdf-reader-mcp/commit/64b63815adbcbbe80e6bc5a302ab42ff90b0fdc1))

## 2.0.7 (2025-12-03)

### 🐛 Bug Fixes

- remove types export for CLI tool ([e222734](https://github.com/SylphxAI/pdf-reader-mcp/commit/e2227348d80d39ddf94fcf19df5595d20a67446d))
- use local doctor in lefthook ([c59e9cb](https://github.com/SylphxAI/pdf-reader-mcp/commit/c59e9cbf06039fb104719376e487433f0b80c877))
- update mcp-server-sdk to 1.3.0 ([817a7a2](https://github.com/SylphxAI/pdf-reader-mcp/commit/817a7a2f295abffc2d7737a70a2da43dd12a0862))
- use bunx for leaf commands in scripts ([1ef81fd](https://github.com/SylphxAI/pdf-reader-mcp/commit/1ef81fdcf5ec87ef449aa1db9ee5c5a99fc4e75e))
- update vercel config for leaf docs ([5f57838](https://github.com/SylphxAI/pdf-reader-mcp/commit/5f57838075b6712012fad2b2170685bc32a10237))

### 📚 Documentation

- overhaul documentation ([4a89f85](https://github.com/SylphxAI/pdf-reader-mcp/commit/4a89f85e8b843b93bfc538c2964b86133f4ab5d3))

### 🔧 Chores

- trigger release PR ([d0d1a2e](https://github.com/SylphxAI/pdf-reader-mcp/commit/d0d1a2e70cf76327ee6f5329099469d3567ee2b1))
- test bump action fix ([fa4995a](https://github.com/SylphxAI/pdf-reader-mcp/commit/fa4995ae46ae02aa3ce4aee2265de1608eeaf2e8))
- update doctor and lefthook ([07c5f44](https://github.com/SylphxAI/pdf-reader-mcp/commit/07c5f44aef014d05bb9bdfd63a3319c300f7d383))
- trigger release workflow ([f00660f](https://github.com/SylphxAI/pdf-reader-mcp/commit/f00660f1256dab6c0bfac8dc2eb21d71ea5aa36a))
- update dependencies and fix doctor issues ([e3fc487](https://github.com/SylphxAI/pdf-reader-mcp/commit/e3fc4872ff35dd1083c65d37005b5b9224518e74))
- update @sylphx/doctor to 1.26.0 ([8082da0](https://github.com/SylphxAI/pdf-reader-mcp/commit/8082da055bc0bbb862bc9513f45ab9d44aa7ad4a))
- migrate biome config to 2.3.8 ([1318b94](https://github.com/SylphxAI/pdf-reader-mcp/commit/1318b94aa8ab78a90a6bf29b703e458f9fcb60f6))

## 2.0.6 (2025-12-03)

### 🐛 Bug Fixes

- use local doctor in lefthook ([c59e9cb](https://github.com/SylphxAI/pdf-reader-mcp/commit/c59e9cbf06039fb104719376e487433f0b80c877))
- update mcp-server-sdk to 1.3.0 ([817a7a2](https://github.com/SylphxAI/pdf-reader-mcp/commit/817a7a2f295abffc2d7737a70a2da43dd12a0862))
- use bunx for leaf commands in scripts ([1ef81fd](https://github.com/SylphxAI/pdf-reader-mcp/commit/1ef81fdcf5ec87ef449aa1db9ee5c5a99fc4e75e))
- update vercel config for leaf docs ([5f57838](https://github.com/SylphxAI/pdf-reader-mcp/commit/5f57838075b6712012fad2b2170685bc32a10237))

### 📚 Documentation

- overhaul documentation ([4a89f85](https://github.com/SylphxAI/pdf-reader-mcp/commit/4a89f85e8b843b93bfc538c2964b86133f4ab5d3))

### 🔧 Chores

- trigger release PR ([d0d1a2e](https://github.com/SylphxAI/pdf-reader-mcp/commit/d0d1a2e70cf76327ee6f5329099469d3567ee2b1))
- test bump action fix ([fa4995a](https://github.com/SylphxAI/pdf-reader-mcp/commit/fa4995ae46ae02aa3ce4aee2265de1608eeaf2e8))
- update doctor and lefthook ([07c5f44](https://github.com/SylphxAI/pdf-reader-mcp/commit/07c5f44aef014d05bb9bdfd63a3319c300f7d383))
- trigger release workflow ([f00660f](https://github.com/SylphxAI/pdf-reader-mcp/commit/f00660f1256dab6c0bfac8dc2eb21d71ea5aa36a))
- update dependencies and fix doctor issues ([e3fc487](https://github.com/SylphxAI/pdf-reader-mcp/commit/e3fc4872ff35dd1083c65d37005b5b9224518e74))
- update @sylphx/doctor to 1.26.0 ([8082da0](https://github.com/SylphxAI/pdf-reader-mcp/commit/8082da055bc0bbb862bc9513f45ab9d44aa7ad4a))
- migrate biome config to 2.3.8 ([1318b94](https://github.com/SylphxAI/pdf-reader-mcp/commit/1318b94aa8ab78a90a6bf29b703e458f9fcb60f6))

## 2.0.5 (2025-12-03)

### 🐛 Bug Fixes

- use local doctor in lefthook ([c59e9cb](https://github.com/SylphxAI/pdf-reader-mcp/commit/c59e9cbf06039fb104719376e487433f0b80c877))
- update mcp-server-sdk to 1.3.0 ([817a7a2](https://github.com/SylphxAI/pdf-reader-mcp/commit/817a7a2f295abffc2d7737a70a2da43dd12a0862))
- use bunx for leaf commands in scripts ([1ef81fd](https://github.com/SylphxAI/pdf-reader-mcp/commit/1ef81fdcf5ec87ef449aa1db9ee5c5a99fc4e75e))
- update vercel config for leaf docs ([5f57838](https://github.com/SylphxAI/pdf-reader-mcp/commit/5f57838075b6712012fad2b2170685bc32a10237))

### 📚 Documentation

- overhaul documentation ([4a89f85](https://github.com/SylphxAI/pdf-reader-mcp/commit/4a89f85e8b843b93bfc538c2964b86133f4ab5d3))

### 🔧 Chores

- test bump action fix ([fa4995a](https://github.com/SylphxAI/pdf-reader-mcp/commit/fa4995ae46ae02aa3ce4aee2265de1608eeaf2e8))
- update doctor and lefthook ([07c5f44](https://github.com/SylphxAI/pdf-reader-mcp/commit/07c5f44aef014d05bb9bdfd63a3319c300f7d383))
- trigger release workflow ([f00660f](https://github.com/SylphxAI/pdf-reader-mcp/commit/f00660f1256dab6c0bfac8dc2eb21d71ea5aa36a))
- update dependencies and fix doctor issues ([e3fc487](https://github.com/SylphxAI/pdf-reader-mcp/commit/e3fc4872ff35dd1083c65d37005b5b9224518e74))
- update @sylphx/doctor to 1.26.0 ([8082da0](https://github.com/SylphxAI/pdf-reader-mcp/commit/8082da055bc0bbb862bc9513f45ab9d44aa7ad4a))
- migrate biome config to 2.3.8 ([1318b94](https://github.com/SylphxAI/pdf-reader-mcp/commit/1318b94aa8ab78a90a6bf29b703e458f9fcb60f6))

## 2.0.3 (2025-11-30)

### 🐛 Bug Fixes

- remove unnecessary path access restrictions ([9615b2d](https://github.com/SylphxAI/pdf-reader-mcp/commit/9615b2d6f2517b44d64bbeaded6f614e1533a4c7))

### 🔧 Chores

- update lockfile for glob 13.0.0 ([4a26173](https://github.com/SylphxAI/pdf-reader-mcp/commit/4a261738c758dc0048fa421c5491e86f64971c81))
- **deps:** bump glob from 11.1.0 to 13.0.0 (#225) ([a19cfac](https://github.com/SylphxAI/pdf-reader-mcp/commit/a19cface62597b572846bdde8353f04c108869f9))

## 2.0.2 (2025-11-27)

### 🐛 Bug Fixes

- upgrade mcp-server-sdk to 1.2.0 ([32bda52](https://github.com/SylphxAI/pdf-reader-mcp/commit/32bda52228bfbcafdb9bcfee6450ccb3deab9afb))

## 2.0.1 (2025-11-27)

### 🐛 Bug Fixes

- ensure mcp-server-sdk 1.1.2 with correct tools/list response ([db65572](https://github.com/SylphxAI/pdf-reader-mcp/commit/db6557209adb85497223a043814963e59f68b06c))
- upgrade mcp-server-sdk to 2.0.0 to fix tools/list response ([ebd211f](https://github.com/SylphxAI/pdf-reader-mcp/commit/ebd211fe44fd364ddd92d8820103404e57992513))
- upgrade mcp-server-sdk to 1.1.2 ([80cc8c5](https://github.com/SylphxAI/pdf-reader-mcp/commit/80cc8c57d48da40f06e6e02a12718bd23bd1a736))

## 2.0.0 (2025-11-27)

### 🐛 Bug Fixes

- upgrade SDK to 1.1.1 with Node.js support ([26bb70d](https://github.com/SylphxAI/pdf-reader-mcp/commit/26bb70d310df4f82bf69a46fc396f585a4ead621))
- 💥 use bun shebang for proper runtime support ([00a07fd](https://github.com/SylphxAI/pdf-reader-mcp/commit/00a07fdeec4836443b9242ed9f663616ae448b24))

### 💥 Breaking Changes

- use bun shebang for proper runtime support ([00a07fd](https://github.com/SylphxAI/pdf-reader-mcp/commit/00a07fdeec4836443b9242ed9f663616ae448b24))
  Requires Bun runtime instead of Node.js

## 1.4.0 (2025-11-27)

### ✨ Features

- migrate documentation from VitePress to Leaf ([dd1d9ee](https://github.com/SylphxAI/pdf-reader-mcp/commit/dd1d9ee9a3250a3de9f9e297535c3bbe8a8f6527))

### 🐛 Bug Fixes

- **ci:** use explicit path for lefthook in prepare script ([40c3655](https://github.com/SylphxAI/pdf-reader-mcp/commit/40c36554a8958ded046c54fbfaad208b8fbad719))
- **security:** override js-yaml to fix vulnerability ([ce7acc8](https://github.com/SylphxAI/pdf-reader-mcp/commit/ce7acc808b2c174eea03c4ecc3de3699994d8133))
- **ci:** allow bun install without frozen-lockfile for Dependabot PRs ([af10706](https://github.com/SylphxAI/pdf-reader-mcp/commit/af107067d7dcb1851c82d97c6a6896275985e263))
- upgrade to SDK 1.0.0 and Zod 4 for proper JSON Schema support ([e9e21d5](https://github.com/SylphxAI/pdf-reader-mcp/commit/e9e21d57edcc2f3ec7e9c96fd9d6e5c062ab1fd0))
- improve image extraction timeout handling ([c9e6f55](https://github.com/SylphxAI/pdf-reader-mcp/commit/c9e6f55c90230f2eb2ccc8148470b130bf80f9c1))
- critical security and performance improvements ([19c7451](https://github.com/SylphxAI/pdf-reader-mcp/commit/19c74518fd4f39f2115a0aef9d64733bb26f60df))

### ♻️ Refactoring

- migrate from @modelcontextprotocol/sdk to @sylphx/mcp-server-sdk ([98efbbb](https://github.com/SylphxAI/pdf-reader-mcp/commit/98efbbb1a304b6aa9e30dead35f0fa6379939546))
- add structured logging system ([a337d93](https://github.com/SylphxAI/pdf-reader-mcp/commit/a337d93c35abe16b102632a3e9871a6f3a94bdc1))
- deduplicate image extraction logic ([2e6ef33](https://github.com/SylphxAI/pdf-reader-mcp/commit/2e6ef33577b7dbf902f88d4ecd4f33e2d1386b89))
- implement proper PDF document resource cleanup ([7893cf6](https://github.com/SylphxAI/pdf-reader-mcp/commit/7893cf63b07f0013b4f89a7dab91df4e7a1988c3))

### 📚 Documentation

- add installation guides for VS Code, Claude Code, Cursor, Windsurf, Cline, Warp ([28a3bf1](https://github.com/SylphxAI/pdf-reader-mcp/commit/28a3bf1ae0d02abfedbbd9e371952a974c3aae08))

### 🔧 Chores

- upgrade @sylphx/bump to v0.12.1 ([9c597fb](https://github.com/SylphxAI/pdf-reader-mcp/commit/9c597fbd052fe2171760229a46f4e49550a7aecb))
- upgrade @sylphx/doctor to v1.23.3 and @sylphx/bump to v0.10.2 ([ff6849e](https://github.com/SylphxAI/pdf-reader-mcp/commit/ff6849e7a49596da449baa7b5e14f9ecaeedf4af))
- upgrade @sylphx/doctor to v1.23.2 ([9ab92cf](https://github.com/SylphxAI/pdf-reader-mcp/commit/9ab92cf15e43aed336c771140d2675aa1c96ef65))
- migrate tooling to @sylphx ecosystem ([fc2471f](https://github.com/SylphxAI/pdf-reader-mcp/commit/fc2471ff61dcac287ec6d27f7038fdaaa088a727))
- upgrade all packages to latest versions ([8b6730b](https://github.com/SylphxAI/pdf-reader-mcp/commit/8b6730bd86fcb8d992200574bce66946bec00886))
- cleanup unused files and folders ([8834d09](https://github.com/SylphxAI/pdf-reader-mcp/commit/8834d09e1000ff57bae530a5ed069cc3b50a7866))
- migrate from Vitest to Bun test runner ([7382d1b](https://github.com/SylphxAI/pdf-reader-mcp/commit/7382d1b037805d0f47271676d71bd65721f50d8e))
- adjust coverage thresholds after adding defensive code ([3780190](https://github.com/SylphxAI/pdf-reader-mcp/commit/3780190625d2b5a04a3f3d9a42f17998132de672))

## 1.5.0 (2025-11-27)

### ✨ Features

- migrate documentation from VitePress to Leaf ([dd1d9ee](https://github.com/SylphxAI/pdf-reader-mcp/commit/dd1d9ee9a3250a3de9f9e297535c3bbe8a8f6527))

### 🐛 Bug Fixes

- **security:** override js-yaml to fix vulnerability ([ce7acc8](https://github.com/SylphxAI/pdf-reader-mcp/commit/ce7acc808b2c174eea03c4ecc3de3699994d8133))
- **ci:** allow bun install without frozen-lockfile for Dependabot PRs ([af10706](https://github.com/SylphxAI/pdf-reader-mcp/commit/af107067d7dcb1851c82d97c6a6896275985e263))
- upgrade to SDK 1.0.0 and Zod 4 for proper JSON Schema support ([e9e21d5](https://github.com/SylphxAI/pdf-reader-mcp/commit/e9e21d57edcc2f3ec7e9c96fd9d6e5c062ab1fd0))
- improve image extraction timeout handling ([c9e6f55](https://github.com/SylphxAI/pdf-reader-mcp/commit/c9e6f55c90230f2eb2ccc8148470b130bf80f9c1))
- critical security and performance improvements ([19c7451](https://github.com/SylphxAI/pdf-reader-mcp/commit/19c74518fd4f39f2115a0aef9d64733bb26f60df))

### ♻️ Refactoring

- migrate from @modelcontextprotocol/sdk to @sylphx/mcp-server-sdk ([98efbbb](https://github.com/SylphxAI/pdf-reader-mcp/commit/98efbbb1a304b6aa9e30dead35f0fa6379939546))
- add structured logging system ([a337d93](https://github.com/SylphxAI/pdf-reader-mcp/commit/a337d93c35abe16b102632a3e9871a6f3a94bdc1))
- deduplicate image extraction logic ([2e6ef33](https://github.com/SylphxAI/pdf-reader-mcp/commit/2e6ef33577b7dbf902f88d4ecd4f33e2d1386b89))
- implement proper PDF document resource cleanup ([7893cf6](https://github.com/SylphxAI/pdf-reader-mcp/commit/7893cf63b07f0013b4f89a7dab91df4e7a1988c3))

### 📚 Documentation

- add installation guides for VS Code, Claude Code, Cursor, Windsurf, Cline, Warp ([28a3bf1](https://github.com/SylphxAI/pdf-reader-mcp/commit/28a3bf1ae0d02abfedbbd9e371952a974c3aae08))

### 🔧 Chores

- **release:** @sylphx/pdf-reader-mcp@1.4.0 (#227) ([b3c1a58](https://github.com/SylphxAI/pdf-reader-mcp/commit/b3c1a583ca40d4ad1962b822fb36e9d2b842223e))
- upgrade @sylphx/doctor to v1.23.3 and @sylphx/bump to v0.10.2 ([ff6849e](https://github.com/SylphxAI/pdf-reader-mcp/commit/ff6849e7a49596da449baa7b5e14f9ecaeedf4af))
- upgrade @sylphx/doctor to v1.23.2 ([9ab92cf](https://github.com/SylphxAI/pdf-reader-mcp/commit/9ab92cf15e43aed336c771140d2675aa1c96ef65))
- migrate tooling to @sylphx ecosystem ([fc2471f](https://github.com/SylphxAI/pdf-reader-mcp/commit/fc2471ff61dcac287ec6d27f7038fdaaa088a727))
- upgrade all packages to latest versions ([8b6730b](https://github.com/SylphxAI/pdf-reader-mcp/commit/8b6730bd86fcb8d992200574bce66946bec00886))
- cleanup unused files and folders ([8834d09](https://github.com/SylphxAI/pdf-reader-mcp/commit/8834d09e1000ff57bae530a5ed069cc3b50a7866))
- migrate from Vitest to Bun test runner ([7382d1b](https://github.com/SylphxAI/pdf-reader-mcp/commit/7382d1b037805d0f47271676d71bd65721f50d8e))
- adjust coverage thresholds after adding defensive code ([3780190](https://github.com/SylphxAI/pdf-reader-mcp/commit/3780190625d2b5a04a3f3d9a42f17998132de672))

## 1.4.0 (2025-11-27)

### ✨ Features

- migrate documentation from VitePress to Leaf ([dd1d9ee](https://github.com/SylphxAI/pdf-reader-mcp/commit/dd1d9ee9a3250a3de9f9e297535c3bbe8a8f6527))

### 🐛 Bug Fixes

- **ci:** allow bun install without frozen-lockfile for Dependabot PRs ([af10706](https://github.com/SylphxAI/pdf-reader-mcp/commit/af107067d7dcb1851c82d97c6a6896275985e263))
- upgrade to SDK 1.0.0 and Zod 4 for proper JSON Schema support ([e9e21d5](https://github.com/SylphxAI/pdf-reader-mcp/commit/e9e21d57edcc2f3ec7e9c96fd9d6e5c062ab1fd0))
- improve image extraction timeout handling ([c9e6f55](https://github.com/SylphxAI/pdf-reader-mcp/commit/c9e6f55c90230f2eb2ccc8148470b130bf80f9c1))
- critical security and performance improvements ([19c7451](https://github.com/SylphxAI/pdf-reader-mcp/commit/19c74518fd4f39f2115a0aef9d64733bb26f60df))

### ♻️ Refactoring

- migrate from @modelcontextprotocol/sdk to @sylphx/mcp-server-sdk ([98efbbb](https://github.com/SylphxAI/pdf-reader-mcp/commit/98efbbb1a304b6aa9e30dead35f0fa6379939546))
- add structured logging system ([a337d93](https://github.com/SylphxAI/pdf-reader-mcp/commit/a337d93c35abe16b102632a3e9871a6f3a94bdc1))
- deduplicate image extraction logic ([2e6ef33](https://github.com/SylphxAI/pdf-reader-mcp/commit/2e6ef33577b7dbf902f88d4ecd4f33e2d1386b89))
- implement proper PDF document resource cleanup ([7893cf6](https://github.com/SylphxAI/pdf-reader-mcp/commit/7893cf63b07f0013b4f89a7dab91df4e7a1988c3))

### 🔧 Chores

- upgrade @sylphx/doctor to v1.23.3 and @sylphx/bump to v0.10.2 ([ff6849e](https://github.com/SylphxAI/pdf-reader-mcp/commit/ff6849e7a49596da449baa7b5e14f9ecaeedf4af))
- upgrade @sylphx/doctor to v1.23.2 ([9ab92cf](https://github.com/SylphxAI/pdf-reader-mcp/commit/9ab92cf15e43aed336c771140d2675aa1c96ef65))
- migrate tooling to @sylphx ecosystem ([fc2471f](https://github.com/SylphxAI/pdf-reader-mcp/commit/fc2471ff61dcac287ec6d27f7038fdaaa088a727))
- upgrade all packages to latest versions ([8b6730b](https://github.com/SylphxAI/pdf-reader-mcp/commit/8b6730bd86fcb8d992200574bce66946bec00886))
- cleanup unused files and folders ([8834d09](https://github.com/SylphxAI/pdf-reader-mcp/commit/8834d09e1000ff57bae530a5ed069cc3b50a7866))
- migrate from Vitest to Bun test runner ([7382d1b](https://github.com/SylphxAI/pdf-reader-mcp/commit/7382d1b037805d0f47271676d71bd65721f50d8e))
- adjust coverage thresholds after adding defensive code ([3780190](https://github.com/SylphxAI/pdf-reader-mcp/commit/3780190625d2b5a04a3f3d9a42f17998132de672))

## 1.3.2

### Patch Changes

- c97a5c0: Refactor CI workflows to use company release standard. Simplified CI workflow for validation only and enhanced release workflow with full configuration.

## 1.3.1

### Patch Changes

- b19fdaa: Refactor CI workflows to use company standard release flow and improve separation of concerns

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.3.0](https://github.com/SylphxAI/pdf-reader-mcp/compare/v1.2.0...v1.3.0) (2025-11-06)

### Features

- **Path Handling**: Remove absolute path restriction ([#212](https://github.com/SylphxAI/pdf-reader-mcp/pull/212))
  - **BREAKING CHANGE**: Absolute paths are now supported for local PDF files
  - Both absolute and relative paths are accepted in the `path` parameter
  - Relative paths are resolved against the current working directory (process.cwd())
  - Fixes [#136](https://github.com/SylphxAI/pdf-reader-mcp/issues/136) - MCP error -32602: Absolute paths are not allowed
  - Windows paths (e.g., `C:\Users\...`) and Unix paths (e.g., `/home/...`) now work correctly
  - Configure working directory via `cwd` in MCP server settings for relative path resolution

### Bug Fixes

- Fix Zod validation error handling - use `error.issues` instead of `error.errors`
- Update dependencies to latest versions (Zod 3.25.76, @modelcontextprotocol/sdk 1.21.0)

### Code Quality

- All 103 tests passing
- Coverage: 94%+ lines, 98%+ functions, 84%+ branches
- TypeScript strict mode compliance
- Zero linting errors

## [1.2.0](https://github.com/SylphxAI/pdf-reader-mcp/compare/v1.1.0...v1.2.0) (2025-10-31)

### Features

- **Content Ordering**: Preserve exact text and image order based on Y-coordinates
  - Content items within each page are now sorted by their vertical position
  - Enables AI to see content in the same order as it appears in the PDF
  - Text and images are interleaved based on document layout
  - Example: page 1 [text, image, text, image, image, text]
  - Uses PDF.js transform matrices to extract Y-coordinates
  - Automatically groups text items on the same line
  - Returns ordered content parts for optimal AI consumption

### Internal Changes

- New `extractPageContent()` function combines text and image extraction with positioning
- New `PageContentItem` interface tracks content type, position, and data
- Handler updated to generate content parts in document-reading order
- Improved error handling to return descriptive error messages as text content

### Code Quality

- All tests passing (91 tests)
- Coverage maintained at 97.76% statements, 90.95% branches
- TypeScript strict mode compliance
- Zero linting errors

## [1.1.0](https://github.com/SylphxAI/pdf-reader-mcp/compare/v1.0.0...v1.1.0) (2025-10-31)

### Features

- **Image Extraction**: Extract embedded images from PDF pages as base64-encoded data ([bd637f3](https://github.com/SylphxAI/pdf-reader-mcp/commit/bd637f3))
  - Support for RGB, RGBA, and Grayscale formats
  - Works with JPEG, PNG, and other embedded image types
  - Includes image metadata (width, height, format, page number)
  - Optional parameter `include_images` (default: false)
  - Uses PDF.js operator list API for reliable extraction

### Performance Improvements

- **Parallel Page Processing**: Process multiple pages concurrently for 5-10x speedup ([e5f85e1](https://github.com/SylphxAI/pdf-reader-mcp/commit/e5f85e1))
  - Refactored extractPageTexts to use Promise.all
  - 10-page PDF: ~5-8x faster
  - 50-page PDF: ~10x faster
  - Maintains error isolation per page

### Code Quality

- **Deep Architectural Refactoring**: Break down monolithic handler into focused modules ([1519fe0](https://github.com/SylphxAI/pdf-reader-mcp/commit/1519fe0))

  - handlers/readPdf.ts: 454 → 143 lines (-68% reduction)
  - NEW src/types/pdf.ts: Type definitions (44 lines)
  - NEW src/schemas/readPdf.ts: Zod schemas (61 lines)
  - NEW src/pdf/parser.ts: Page range parsing (124 lines)
  - NEW src/pdf/loader.ts: Document loading (74 lines)
  - NEW src/pdf/extractor.ts: Text & metadata extraction (96 lines → 224 lines with images)
  - Single Responsibility Principle applied throughout
  - Functional composition for better testability

- **Comprehensive Test Coverage**: 90 tests with 98.94% coverage ([85cf712](https://github.com/SylphxAI/pdf-reader-mcp/commit/85cf712))
  - NEW test/pdf/extractor.test.ts (22 tests)
  - NEW test/pdf/loader.test.ts (9 tests)
  - NEW test/pdf/parser.test.ts (26 tests)
  - Tests: 31 → 90 (+158% increase)
  - Coverage: 90.26% → 98.94% statements
  - Coverage: 78.64% → 93.33% branches

### Documentation

- Enhanced README with image extraction examples and usage guide
- Added dedicated Image Extraction section with format details
- Updated roadmap to reflect completed features
- Clarified image format support and considerations

## [1.0.0](https://github.com/SylphxAI/pdf-reader-mcp/compare/v0.3.24...v1.0.0) (2025-10-31)

### ⚠ BREAKING CHANGES

- **Package renamed from @sylphlab/pdf-reader-mcp to @sylphx/pdf-reader-mcp**
- Docker images renamed from sylphlab/pdf-reader-mcp to sylphx/pdf-reader-mcp

### Features

- Migrate from ESLint/Prettier to Biome for 50x faster linting ([bde79bf](https://github.com/SylphxAI/pdf-reader-mcp/commit/bde79bf))
- Add Docker and Smithery deployment support ([11dc08f](https://github.com/SylphxAI/pdf-reader-mcp/commit/11dc08f))

### Bug Fixes

- Fix Buffer to Uint8Array conversion for PDF.js v5.x compatibility ([1c7710d](https://github.com/SylphxAI/pdf-reader-mcp/commit/1c7710d))
- Fix schema validation with exclusiveMinimum for Mistral/Windsurf compatibility ([1c7710d](https://github.com/SylphxAI/pdf-reader-mcp/commit/1c7710d))
- Fix metadata extraction with robust .getAll() fallback ([1c7710d](https://github.com/SylphxAI/pdf-reader-mcp/commit/1c7710d))
- Fix nested test case that was not running ([2c8e1a5](https://github.com/SylphxAI/pdf-reader-mcp/commit/2c8e1a5))
- Update PdfSourceResult type for exactOptionalPropertyTypes compatibility ([4e0d81d](https://github.com/SylphxAI/pdf-reader-mcp/commit/4e0d81d))

### Improvements

- Upgrade all dependencies to latest versions ([dab3f13](https://github.com/SylphxAI/pdf-reader-mcp/commit/dab3f13))
  - @modelcontextprotocol/sdk: 1.8.0 → 1.20.2
  - pdfjs-dist: 5.1.91 → 5.4.296
  - All GitHub Actions updated to latest versions
- Rebrand from Sylphlab to Sylphx ([1b6e4d3](https://github.com/SylphxAI/pdf-reader-mcp/commit/1b6e4d3))
- Revise README for better clarity and modern structure ([b770b27](https://github.com/SylphxAI/pdf-reader-mcp/commit/b770b27))

### Migration Guide

To migrate from @sylphlab/pdf-reader-mcp to @sylphx/pdf-reader-mcp:

1. Uninstall old package:

   ```bash
   npm uninstall @sylphlab/pdf-reader-mcp
   ```

2. Install new package:

   ```bash
   npm install @sylphx/pdf-reader-mcp
   ```

3. Update your MCP configuration to use @sylphx/pdf-reader-mcp

4. If using Docker, update image name to sylphx/pdf-reader-mcp

All functionality remains the same. No code changes required.

### [0.3.24](https://github.com/sylphlab/pdf-reader-mcp/compare/v0.3.23...v0.3.24) (2025-04-07)

### Bug Fixes

- enable rootDir and adjust include for correct build structure ([a9985a7](https://github.com/sylphlab/pdf-reader-mcp/commit/a9985a7eed16ed0a189dd1bda7a66feb13aee889))

### [0.3.23](https://github.com/sylphlab/pdf-reader-mcp/compare/v0.3.22...v0.3.23) (2025-04-07)

### Bug Fixes

- correct executable paths due to missing rootDir ([ed5c150](https://github.com/sylphlab/pdf-reader-mcp/commit/ed5c15012b849211422fbb22fb15d8a2c9415b0b))

### [0.3.22](https://github.com/sylphlab/pdf-reader-mcp/compare/v0.3.21...v0.3.22) (2025-04-07)

### [0.3.21](https://github.com/sylphlab/pdf-reader-mcp/compare/v0.3.20...v0.3.21) (2025-04-07)

### [0.3.20](https://github.com/sylphlab/pdf-reader-mcp/compare/v0.3.19...v0.3.20) (2025-04-07)

### [0.3.19](https://github.com/sylphlab/pdf-reader-mcp/compare/v0.3.18...v0.3.19) (2025-04-07)

### [0.3.18](https://github.com/sylphlab/pdf-reader-mcp/compare/v0.3.17...v0.3.18) (2025-04-07)

### Bug Fixes

- **publish:** remove dist from gitignore and fix clean script ([305e259](https://github.com/sylphlab/pdf-reader-mcp/commit/305e259d6492fbc1732607ee8f8344f6e07aa073))

### [0.3.17](https://github.com/sylphlab/pdf-reader-mcp/compare/v0.3.16...v0.3.17) (2025-04-07)

### Bug Fixes

- **config:** align package.json paths with build output (dist/) ([ab1100d](https://github.com/sylphlab/pdf-reader-mcp/commit/ab1100d771e277705ef99cb745f89687c74a7e13))

### [0.3.16](https://github.com/sylphlab/pdf-reader-mcp/compare/v0.3.15...v0.3.16) (2025-04-07)

### [0.3.15](https://github.com/sylphlab/pdf-reader-mcp/compare/v0.3.14...v0.3.15) (2025-04-07)

### Bug Fixes

- Run lint-staged in pre-commit hook ([e96680c](https://github.com/sylphlab/pdf-reader-mcp/commit/e96680c771eb99ba303fdf7ad51da880261e11c1))

### [0.3.14](https://github.com/sylphlab/pdf-reader-mcp/compare/v0.3.13...v0.3.14) (2025-04-07)

### [0.3.13](https://github.com/sylphlab/pdf-reader-mcp/compare/v0.3.12...v0.3.13) (2025-04-07)

### Bug Fixes

- **docker:** Install pnpm globally in builder stage ([651d7ae](https://github.com/sylphlab/pdf-reader-mcp/commit/651d7ae06660b97af91c348bc8cc786613232c06))

### [0.3.11](https://github.com/sylphlab/pdf-reader-mcp/compare/v0.3.10...v0.3.11) (2025-04-07)

### [0.3.10](https://github.com/sylphlab/pdf-reader-mcp/compare/v1.0.0...v0.3.10) (2025-04-07)

### Bug Fixes

- address remaining eslint warnings ([a91d313](https://github.com/sylphlab/pdf-reader-mcp/commit/a91d313bec2b843724e62ea6a556d99d5389d6cc))
- resolve eslint errors in tests and scripts ([ffc1bdd](https://github.com/sylphlab/pdf-reader-mcp/commit/ffc1bdd18b972f58e90e12ed2394d2968c5639d9))

## [1.0.0] - 2025-04-07

### Added

- **Project Alignment:** Aligned project structure, configuration (TypeScript, ESLint, Prettier, Vitest), CI/CD (`.github/workflows/ci.yml`), Git Hooks (Husky, lint-staged, commitlint), and dependency management (Dependabot) with Sylph Lab Playbook guidelines.
- **Testing:** Achieved ~95% test coverage using Vitest.
- **Benchmarking:** Implemented initial performance benchmarks using Vitest `bench`.
- **Documentation:**
  - Set up documentation website using VitePress.
  - Created initial content for Guide, Design, Performance, Comparison sections.
  - Updated `README.md` to follow standard structure.
  - Added `CONTRIBUTING.md`.
  - Updated Performance page with initial benchmark results.
  - Added community links and call-to-action in VitePress config footer.
- **Package Manager:** Switched from npm to pnpm.

### Changed

- **Dependencies:** Updated various dependencies to align with guidelines and ensure compatibility.
- **Configuration:** Refined `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`, `package.json` based on guidelines.
- **Project Identity:** Updated scope to `@sylphlab`.

### Fixed

- Resolved various configuration issues identified during guideline alignment.
- Corrected Markdown parsing errors in initial documentation.
- Addressed peer dependency warnings where possible.
- **Note:** TypeDoc API generation is currently blocked due to unresolved initialization errors with TypeDoc v0.28.1.

### Removed

- Sponsorship related files and badges (`.github/FUNDING.yml`).

## [0.3.9] - 2025-04-05

### Fixed

- Removed artifact download/extract steps from `publish-docker` job in workflow, as Docker build needs the full source context provided by checkout.

## [0.3.8] - 2025-04-05

### Fixed

- Removed duplicate `context: .` entry in `docker/build-push-action` step in `.github/workflows/publish.yml`.

## [0.3.7] - 2025-04-05

### Fixed

- Removed explicit `COPY tsconfig.json ./` from Dockerfile (rely on `COPY . .`).
- Explicitly set `context: .` in docker build-push action.

## [0.3.6] - 2025-04-05

### Fixed

- Explicitly added `COPY tsconfig.json ./` before `COPY . .` in Dockerfile to ensure it exists before build step.

## [0.3.5] - 2025-04-05

### Fixed

- Added `RUN ls -la` before build step in Dockerfile to debug `tsconfig.json` not found error.

## [0.3.4] - 2025-04-05

### Fixed

- Explicitly specify `tsconfig.json` path in Dockerfile build step (`RUN ./node_modules/.bin/tsc -p tsconfig.json`) to debug build failure.

## [0.3.3] - 2025-04-05

### Fixed

- Changed Dockerfile build step from `RUN npm run build` to `RUN ./node_modules/.bin/tsc` to debug build failure.

## [0.3.2] - 2025-04-05

### Fixed

- Simplified `build` script in `package.json` to only run `tsc` (removed `chmod`) to debug Docker build failure.

## [0.3.1] - 2025-04-05

### Fixed

- Attempted various fixes for GitHub Actions workflow artifact upload issue (`Error: Provided artifact name input during validation is empty`). Final attempt uses fixed artifact filename in upload/download steps.

## [0.3.0] - 2025-04-05

### Added

- `CHANGELOG.md` file based on Keep a Changelog format.
- `LICENSE` file (MIT License).
- Improved GitHub Actions workflow (`.github/workflows/publish.yml`):
  - Triggers on push to `main` branch and version tags (`v*.*.*`).
  - Conditionally archives build artifacts only on tag pushes.
  - Conditionally runs `publish-npm` and `publish-docker` jobs only on tag pushes.
  - Added `create-release` job to automatically create GitHub Releases from tags, using `CHANGELOG.md` for the body.
- Added version headers to Memory Bank files (`activeContext.md`, `progress.md`).

### Changed

- Bumped version from 0.2.2 to 0.3.0.

<!-- Note: Removed [0.4.0-dev] entry as changes are now part of 1.0.0 -->
