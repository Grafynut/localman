# Localman 🚀

Localman is a high-performance, lightweight API development platform built with **Rust**, **Tauri**, and **React**. It orients around speed, security, and a premium developer experience, providing a full suite of tools for designing, testing, and debugging HTTP and WebSocket connections.

![Localman Official Logo](./public/logo.png)

## ✨ Key Features

### 📡 Advanced Networking
- **Multi-protocol Support**: Native support for **HTTP/HTTPS** and real-time **WebSockets**.
- **Complex Body Types**: Handle `raw` (JSON, XML, Text), `form-data` (multipart), and `binary` file uploads with ease.
- **WebSocket Workspace**: Dedicated interface for real-time message logging, connection management, and binary/text frames.
- **Persistent History**: Automatically indexed request history with local timezone support and recovery.

### 📜 Professional Scripting Engine
- **Pre-request & Test Scripts**: Automate workflows using a sandboxed JavaScript environment.
- **Environment Management**: Effortlessly switch between local, staging, and production environments.
- **Global Variables**: Share data across your entire workspace.
- **Assertions**: Powerful `pm.*` API for automated status, header, and body validation.
- **Dynamic Variables**: Built-in support for `{{$guid}}`, `{{$timestamp}}`, and `{{$randomInt}}`.

### 🏃 Collection Runner & CLI
- **Batch Execution**: Run entire collections or folders sequentially with customizable iterations and delays.
- **Real-time Monitoring**: Track progress, pass/fail rates, and average response times.
- **CLI Runner**: A dedicated high-performance Rust CLI (`cli_runner`) for executing collections directly from the terminal.

### 🎨 Modern UX/UI
- **Optimized for Productivity**: Sleek, glassmorphic Dark Mode designed to reduce eye strain.
- **Visual Previews**: Pretty-printing for JSON/HTML and a sandboxed preview for images and web content.
- **Tab System**: Advanced tab management that remembers scroll positions, response data, and view settings per request.
- **Search & Filter**: Instant pattern matching within response bodies and collection hierarchies.

## 🛠️ Tech Stack

- **Core**: [Rust](https://www.rust-lang.org/) (Networking & Security) + [Tauri](https://tauri.app/) (Desktop Bridge)
- **Frontend**: [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styling**: Vanilla CSS & [TailwindCSS](https://tailwindcss.com/)
- **Data**: [SQLite](https://www.sqlite.org/) (bundled via `rusqlite`)

## 🚀 Getting Started

### Prerequisites
- [Rust](https://www.rust-lang.org/tools/install) (2021 edition)
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)

### Installation & Development

1. **Clone & Install**:
   ```bash
   git clone https://github.com/Grafynut/localman.git
   cd localman
   pnpm install
   ```

2. **Run Desktop App**:
   ```bash
   pnpm tauri dev
   ```

3. **Run CLI Runner**:
   ```bash
   cd src-tauri
   cargo run --bin cli_runner -- --help
   ```

4. **Build Production Apps**:
   ```bash
   pnpm tauri build
   ```

## 📚 Scripting API

Localman exposes the `pm` object in scripts:

```javascript
// Example Test Script
pm.test("Status is 200", () => {
    pm.expect(pm.response.code).to.equal(200);
});

pm.environment.set("token", pm.response.json().access_token);
```

## 🤝 Contributing & Author

**Author:** [Subhajit](https://github.com/Grafynut)

We welcome contributions! Please refer to [CONTRIBUTING.md](CONTRIBUTING.md).
Licensed under the [MIT License](LICENSE).
