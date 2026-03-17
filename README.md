# Localman 🚀

Localman is a powerful, lightweight, and modern API development platform built with **Rust**, **Tauri**, and **React**. Designed for speed and developer experience, it provides a comprehensive suite of tools for designing, testing, and debugging HTTP requests.

![Localman Official Logo](file:///C:/Users/subha/.gemini/antigravity/brain/1f13863f-f995-4e95-a515-45b51bc92f1e/localman_logo_final_orange_1773579611927.png)

## ✨ Key Features

### 📡 Advanced Networking
- **Multi-protocol Support**: Native support for HTTP/HTTPS (gRPC, GraphQL, and WebSockets coming soon).
- **Complex Body Types**: Easily handle `raw` (JSON, Text), `form-data` (multipart), and `binary` file uploads.
- **Persistent History**: Automatically save and browse your request history with local timezone support.

### 📜 Professional Scripting Engine
- **Pre-request & Test Scripts**: Write JavaScript to automate your workflows.
- **Powerful Sandbox**: Advanced `pm.*` API for environment management, global variables, and automated assertions.
- **Snippet Library**: Built-in library of reusable code snippets to accelerate your testing.
- **Dynamic Variables**: Native support for `{{$guid}}`, `{{$timestamp}}`, `{{$isoTimestamp}}`, and `{{$randomInt}}`.

### 🏃 Collection Runner
- **Batch Execution**: Run entire collections or folders sequentially.
- **Advanced Controls**: Customizable iterations, delays, and real-time status monitoring.
- **Reporting**: Aggregate reports with pass/fail metrics and detailed response audits.
- **Flow Control**: Pause, stop, or resume runs at any time.

### 🎨 Modern UX/UI
- **Optimized for Developers**: Sleek Dark Mode with a layout focused on productivity.
- **Visual Previews**: Pretty-printing for JSON, HTML, and XML, plus a sandboxed preview mode for HTML and images.
- **Global Search**: Find patterns instantly within any response body.
- **Tab Isolation**: Each request tab independently remembers its state, response, and view settings.

## 🛠️ Tech Stack

- **Backend**: [Rust](https://www.rust-lang.org/) & [Tauri](https://tauri.app/) for high-performance network logic and secure desktop integration.
- **Frontend**: [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), and [TailwindCSS](https://tailwindcss.com/).
- **Icons**: [Lucide React](https://lucide.dev/).
- **Bundler**: [Vite](https://vitejs.dev/).

## 🚀 Getting Started

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
- [Node.js](https://nodejs.org/) (v16+)
- [pnpm](https://pnpm.io/) (recommended)

### Installation (Development)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/devcollab.git
   cd devcollab
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Run in development mode**:
   ```bash
   pnpm tauri dev
   ```

4. **Build for production**:
   ```bash
   pnpm tauri build
   ```

## 📚 Scripting API (Brief)

Localman provides a `pm` object in both Pre-request and Test scripts:

- `pm.environment.set(key, value)` / `pm.environment.get(key)`
- `pm.globals.set(key, value)` / `pm.globals.get(key)`
- `pm.test(name, callback)`: Define an automated test.
- `pm.expect(value).to.equal(val)`: Assertions (supports `equal`, `include`, `be.ok`, etc.).
- `pm.response`: Access response `code`, `body`, and `headers`.

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
