import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { nanoid } from "nanoid";
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = import.meta.url ? fileURLToPath(import.meta.url) : path.join(process.cwd(), 'dist', 'server', 'vite.js');
const __dirname = import.meta.url ? path.dirname(fileURLToPath(import.meta.url)) : path.dirname(__filename);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const { createServer, createLogger } = await import("vite");
  const viteConfig = (await import("../vite.config")).default;
  const viteLogger = createLogger();

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        process.cwd(),
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production, the static files are in dist/public
  const distPath = process.env.NODE_ENV === 'production' 
    ? path.resolve(process.cwd(), "dist/public")
    : path.resolve(__dirname, "../dist/public");



  if (!fs.existsSync(distPath)) {
    // Try alternative paths
    const alternativePaths = [
      path.resolve(process.cwd(), "dist/public"),
      path.resolve(process.cwd(), "public"),
      path.resolve(__dirname, "public"),
      path.resolve(__dirname, "../public"),
      path.resolve(__dirname, "../../dist/public")
    ];
    
    let foundPath = null;
    for (const altPath of alternativePaths) {
      if (fs.existsSync(altPath)) {
        foundPath = altPath;
        break;
      }
    }
    
    if (!foundPath) {
      throw new Error(
        `Could not find the build directory. Tried: ${distPath}, ${alternativePaths.join(', ')}. Make sure to build the client first.`,
      );
    }
    
    app.use(express.static(foundPath));

    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(foundPath, "index.html"));
    });
  } else {
    app.use(express.static(distPath));

    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
}
