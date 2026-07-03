import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicialização do Banco de Dados
const db = new Database("pharmastock.db");

// Migração: Garantir que a coluna 'category' existe (caso a tabela já tenha sido criada anteriormente)
try {
  const tableInfo = db.prepare("PRAGMA table_info(inventory)").all() as any[];
  const hasCategory = tableInfo.some(col => col.name === 'category');
  if (!hasCategory) {
    db.exec("ALTER TABLE inventory ADD COLUMN category TEXT DEFAULT 'Medicamento'");
    console.log("Migration: Added 'category' column to inventory table.");
  }
} catch (err) {
  console.error("Migration error (inventory):", err);
}

// Garantir que a tabela 'orders' existe (caso o script tenha falhado anteriormente)
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    status TEXT DEFAULT 'Pendente',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Criar tabelas se não existirem (outras tabelas)
db.exec(`
  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    batch TEXT,
    expiry_date TEXT,
    quantity INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    is_donation BOOLEAN DEFAULT 0,
    category TEXT DEFAULT 'Medicamento'
  );

  CREATE TABLE IF NOT EXISTS ambulances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT NOT NULL
  );
`);

// Seed de dados se estiver vazio
const inventoryCount = db.prepare("SELECT COUNT(*) as count FROM inventory").get() as { count: number };
if (inventoryCount.count === 0) {
  const insertInv = db.prepare("INSERT INTO inventory (name, batch, expiry_date, quantity, min_stock, is_donation, category) VALUES (?, ?, ?, ?, ?, ?, ?)");
  insertInv.run("Amoxicilina 500mg", "A123", "2026-03-25", 150, 20, 0, "Antibiótico");
  insertInv.run("Dipirona Sódica", "B456", "2026-06-10", 8, 15, 0, "Analgésico");
  insertInv.run("Paracetamol 750mg", "C789", "2026-04-15", 200, 30, 1, "Analgésico");
  insertInv.run("Soro Fisiológico 500ml", "S001", "2027-01-01", 50, 10, 0, "Material");
}

const ambulanceCount = db.prepare("SELECT COUNT(*) as count FROM ambulances").get() as { count: number };
if (ambulanceCount.count === 0) {
  const insertAmb = db.prepare("INSERT INTO ambulances (name, status) VALUES (?, ?)");
  insertAmb.run("Ambulância 01 - UTI", "Equipada");
  insertAmb.run("Ambulância 02 - Básica", "Reposição Necessária");
  insertAmb.run("Ambulância 03 - Suporte", "Equipada");
}

const orderCount = db.prepare("SELECT COUNT(*) as count FROM orders").get() as { count: number };
if (orderCount.count === 0) {
  const insertOrder = db.prepare("INSERT INTO orders (type, item_name, quantity, status) VALUES (?, ?, ?, ?)");
  insertOrder.run("Pedido", "Gaze Estéril", 100, "Concluído");
  insertOrder.run("Devolução", "Seringa 5ml", 20, "Pendente");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Endpoints
  app.get("/api/inventory/summary", (req, res) => {
    const totalItems = db.prepare("SELECT SUM(quantity) as total FROM inventory").get() as { total: number };
    const lowStock = db.prepare("SELECT COUNT(*) as count FROM inventory WHERE quantity < min_stock").get() as { count: number };
    const donationsCount = db.prepare("SELECT COUNT(*) as count FROM inventory WHERE is_donation = 1").get() as { count: number };
    const expiringSoon = db.prepare("SELECT COUNT(*) as count FROM inventory WHERE expiry_date <= date('now', '+30 days')").get() as { count: number };

    res.json({
      totalItems: totalItems.total || 0,
      expiringSoon: expiringSoon.count,
      lowStock: lowStock.count,
      donationsCount: donationsCount.count
    });
  });

  app.get("/api/inventory", (req, res) => {
    const items = db.prepare("SELECT * FROM inventory").all();
    res.json(items);
  });

  app.post("/api/inventory", (req, res) => {
    const { name, batch, expiry_date, quantity, min_stock, is_donation, category } = req.body;
    const info = db.prepare("INSERT INTO inventory (name, batch, expiry_date, quantity, min_stock, is_donation, category) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(name, batch, expiry_date, quantity, min_stock, is_donation ? 1 : 0, category);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/inventory/:id", (req, res) => {
    const { id } = req.params;
    const { name, batch, expiry_date, quantity, min_stock, is_donation, category } = req.body;
    db.prepare(`
      UPDATE inventory 
      SET name = ?, batch = ?, expiry_date = ?, quantity = ?, min_stock = ?, is_donation = ?, category = ? 
      WHERE id = ?
    `).run(name, batch, expiry_date, quantity, min_stock, is_donation ? 1 : 0, category, id);
    res.json({ success: true });
  });

  app.delete("/api/inventory/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM inventory WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/inventory/alerts", (req, res) => {
    const alerts = db.prepare("SELECT * FROM inventory WHERE expiry_date <= date('now', '+30 days') OR quantity < min_stock").all();
    res.json(alerts);
  });

  app.get("/api/donations", (req, res) => {
    const donations = db.prepare("SELECT * FROM inventory WHERE is_donation = 1").all();
    res.json(donations);
  });

  app.get("/api/ambulances", (req, res) => {
    const rows = db.prepare("SELECT * FROM ambulances").all();
    res.json(rows);
  });

  app.post("/api/ambulances", (req, res) => {
    const { name, status } = req.body;
    const info = db.prepare("INSERT INTO ambulances (name, status) VALUES (?, ?)")
      .run(name, status || 'Equipada');
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/ambulances/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare("UPDATE ambulances SET status = ? WHERE id = ?").run(status, id);
    res.json({ success: true });
  });

  app.get("/api/orders", (req, res) => {
    const rows = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
    res.json(rows);
  });

  app.post("/api/orders", (req, res) => {
    const { type, item_name, quantity } = req.body;
    const info = db.prepare("INSERT INTO orders (type, item_name, quantity, status) VALUES (?, ?, ?, 'Pendente')")
      .run(type, item_name, quantity);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/orders/:id/complete", (req, res) => {
    const { id } = req.params;
    db.prepare("UPDATE orders SET status = 'Concluído' WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/reports/category-distribution", (req, res) => {
    const data = db.prepare("SELECT category as name, SUM(quantity) as value FROM inventory GROUP BY category").all();
    res.json(data);
  });

  // Configuração do Vite como Middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PharmaStock Server running at http://localhost:${PORT}`);
  });
}

startServer();
