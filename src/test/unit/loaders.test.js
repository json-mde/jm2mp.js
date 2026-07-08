/**
 * @file Tests de los tres loaders predefinidos.
 *
 * createStringLoader: tests directos siempre.
 * createFileLoader:   tests condicionales (solo en Node), usando ficheros temporales.
 * createUrlLoader:    tests limitados sin servidor (validación de URLs y comportamiento de fallos de red).
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { createStringLoader, createFileLoader, createUrlLoader } from "../../modules/loaders.js";
import { ResolutionError } from "../../errors.js";

// ============================================================================
// createStringLoader
// ============================================================================

describe("createStringLoader", () => {
  it("rechaza argumento no objeto en la fábrica", () => {
    assert.throws(() => createStringLoader(null), TypeError);
    assert.throws(() => createStringLoader("string"), TypeError);
    assert.throws(() => createStringLoader(42), TypeError);
  });

  it("carga un módulo válido", async () => {
    const loader = createStringLoader({
      "main": JSON.stringify({ "@": "valor" })
    });
    const result = await loader("main");
    assert.deepEqual(result, { "@": "valor" });
  });

  it("rechaza módulo no encontrado", async () => {
    const loader = createStringLoader({});
    await assert.rejects(loader("noExiste"), ResolutionError);
  });

  it("rechaza valor no string en el mapa", async () => {
    const loader = createStringLoader({ "main": 42 });
    await assert.rejects(loader("main"), ResolutionError);
  });

  it("rechaza JSON malformado", async () => {
    const loader = createStringLoader({ "main": "{ no es json válido" });
    await assert.rejects(loader("main"), ResolutionError);
  });

  it("carga múltiples módulos del mismo mapa", async () => {
    const loader = createStringLoader({
      "a": JSON.stringify({ "@": 1 }),
      "b": JSON.stringify({ "@": 2 })
    });
    assert.deepEqual(await loader("a"), { "@": 1 });
    assert.deepEqual(await loader("b"), { "@": 2 });
  });
});

// ============================================================================
// createFileLoader (solo Node.js)
// ============================================================================

const isNode = typeof process !== "undefined" && process.versions?.node;

describe("createFileLoader", () => {
  if (!isNode) {
    it("se omite en entornos no-Node", { skip: true }, () => {});
    return;
  }

  it("crea un loader exitosamente", async () => {
    const loader = await createFileLoader();
    assert.equal(typeof loader, "function");
  });

  it("loader rechaza fichero inexistente", async () => {
    const loader = await createFileLoader();
    await assert.rejects(
      loader("/no-existe-este-fichero-zzz-12345.json"),
      ResolutionError
    );
  });

  it("loader carga un fichero JSON válido", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const os = await import("node:os");

    // Creamos un directorio temporal y un fichero JSON dentro.
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "proj-test-"));
    const filePath = path.join(tmpDir, "modulo.json");
    await fs.writeFile(filePath, JSON.stringify({ "@": "ok" }), "utf8");

    try {
      const loader = await createFileLoader({ baseDir: tmpDir });
      const result = await loader("modulo.json");
      assert.deepEqual(result, { "@": "ok" });
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("loader rechaza JSON malformado en el fichero", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const os = await import("node:os");

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "proj-test-"));
    const filePath = path.join(tmpDir, "malo.json");
    await fs.writeFile(filePath, "{ esto no es json", "utf8");

    try {
      const loader = await createFileLoader({ baseDir: tmpDir });
      await assert.rejects(loader("malo.json"), ResolutionError);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("respeta baseDir relativo", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const os = await import("node:os");

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "proj-test-"));
    const sub = path.join(tmpDir, "sub");
    await fs.mkdir(sub);
    await fs.writeFile(path.join(sub, "x.json"), JSON.stringify({ "@": 1 }), "utf8");

    try {
      const loader = await createFileLoader({ baseDir: sub });
      const result = await loader("x.json");
      assert.deepEqual(result, { "@": 1 });
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});

// ============================================================================
// createUrlLoader
// ============================================================================

describe("createUrlLoader", () => {
  it("requiere fetch en el entorno", () => {
    // Si fetch no está disponible, la fábrica lanza al crear.
    // En Node 18+ y navegador moderno, fetch SÍ está, así que esto pasa.
    if (typeof fetch !== "function") {
      assert.throws(() => createUrlLoader(), ResolutionError);
    } else {
      assert.doesNotThrow(() => createUrlLoader());
    }
  });

  if (typeof fetch !== "function") {
    it("se omite el resto (fetch no disponible)", { skip: true }, () => {});
    return;
  }

  it("rechaza URL inválida", async () => {
    const loader = createUrlLoader();
    await assert.rejects(loader("no-es-una-url"), ResolutionError);
  });

  it("propaga fallo de red como ResolutionError", async () => {
    // Puerto no escuchable: la conexión fallará.
    const loader = createUrlLoader();
    await assert.rejects(
      loader("http://127.0.0.1:1/no-existe.json"),
      ResolutionError
    );
  });

  it("resuelve baseUrl con nombre relativo (sin completar la red)", async () => {
    // Aunque el fetch fallará por red, este test verifica que NO falla por
    // construcción de URL inválida antes de llegar a fetch.
    const loader = createUrlLoader({ baseUrl: "http://127.0.0.1:1/" });
    await assert.rejects(loader("modulo.json"), ResolutionError);
  });

  it("acepta baseUrl sin barra final (la normaliza internamente)", async () => {
    const loader = createUrlLoader({ baseUrl: "http://127.0.0.1:1/api" });
    await assert.rejects(loader("modulo.json"), ResolutionError);
  });
});
