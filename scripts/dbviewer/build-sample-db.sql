-- Reproducible seed for public/dbviewer/sample.db.
-- Build with:  sqlite3 public/dbviewer/sample.db < scripts/dbviewer/build-sample-db.sql
PRAGMA foreign_keys = ON;

CREATE TABLE artists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE albums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  released DATE
);
CREATE INDEX idx_albums_artist ON albums(artist_id);

CREATE TABLE tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  album_id INTEGER REFERENCES albums(id) ON DELETE SET NULL,
  milliseconds INTEGER,
  bytes INTEGER,
  unit_price REAL DEFAULT 0.99
);
CREATE INDEX idx_tracks_album ON tracks(album_id);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  country TEXT,
  notes TEXT
);

CREATE TABLE invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  invoice_date DATETIME NOT NULL,
  total REAL NOT NULL
);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);

CREATE VIEW top_customers AS
  SELECT c.id, c.first_name || ' ' || c.last_name AS name, SUM(i.total) AS spent
  FROM customers c JOIN invoices i ON i.customer_id = c.id
  GROUP BY c.id;

CREATE TRIGGER set_invoice_total_floor
AFTER INSERT ON invoices
BEGIN
  UPDATE invoices SET total = 0 WHERE id = NEW.id AND total < 0;
END;

INSERT INTO artists(name) VALUES
  ('AC/DC'),('Aerosmith'),('Alanis Morissette'),('Alice In Chains'),('Antônio Carlos Jobim');

INSERT INTO albums(title, artist_id, released) VALUES
  ('For Those About To Rock', 1, '1981-11-23'),
  ('Balls to the Wall', 1, '1983-12-05'),
  ('Big Ones', 2, '1994-11-01'),
  ('Jagged Little Pill', 3, '1995-06-13'),
  ('Facelift', 4, '1990-08-21'),
  ('Warner 25 Anos', 5, '1994-01-01');

INSERT INTO tracks(name, album_id, milliseconds, bytes, unit_price) VALUES
  ('For Those About To Rock', 1, 343719, 11170334, 0.99),
  ('Put The Finger On You', 1, 205662, 6713451, 0.99),
  ('Fast As a Shark', 2, 230619, 7636561, 0.99),
  ('Crazy', 3, 271856, 8809948, 0.99),
  ('You Oughta Know', 4, 249366, 8117181, 0.99),
  ('Man in the Box', 5, 286336, 9310272, 0.99),
  ('Garota De Ipanema', 6, 178827, 5783355, NULL);

INSERT INTO customers(first_name, last_name, email, country, notes) VALUES
  ('Luís','Gonçalves','luis@example.com','Brazil','VIP'),
  ('Leonie','Köhler','leonie@example.com','Germany',NULL),
  ('François','Tremblay','francois@example.com','Canada',''),
  ('Bjørn','Hansen','bjorn@example.com','Norway','{"tier":"gold","since":2018}');

INSERT INTO invoices(customer_id, invoice_date, total) VALUES
  (1,'2024-01-12 10:00:00',1.98),
  (1,'2024-03-04 13:22:01',5.94),
  (2,'2024-02-19 09:11:00',0.99),
  (3,'2024-04-01 17:55:00',2.97),
  (4,'2024-05-09 21:00:00',9999999999.99);
