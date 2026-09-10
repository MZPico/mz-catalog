-- Community numbers behind the catalog. Nothing in the clear: `voter` and `ip` are
-- salted hashes computed in the Worker — of the visitor's own random id and of
-- the address the request came from. Neither can be turned back into either.
CREATE TABLE IF NOT EXISTS plays (
  slug TEXT PRIMARY KEY,
  n    INTEGER NOT NULL DEFAULT 0
);

-- One play per title per network per day. Keyed on the address rather than on
-- the browser's id, which the client could simply make up again. Rows from
-- earlier days are deleted by the Worker's daily cron.
CREATE TABLE IF NOT EXISTS play_log (
  slug TEXT NOT NULL,
  ip   TEXT NOT NULL,
  day  TEXT NOT NULL,
  PRIMARY KEY (slug, ip, day)
);

CREATE TABLE IF NOT EXISTS votes (
  slug  TEXT    NOT NULL,
  voter TEXT    NOT NULL,
  ip    TEXT    NOT NULL DEFAULT '',
  value INTEGER NOT NULL CHECK (value BETWEEN 1 AND 5),
  ts    INTEGER NOT NULL,
  PRIMARY KEY (slug, voter)
);

CREATE INDEX IF NOT EXISTS votes_by_slug ON votes (slug);
-- Supports the per-network cap: a household can vote, a script cannot.
CREATE INDEX IF NOT EXISTS votes_by_ip ON votes (slug, ip);

-- Hourly write budget per network; past hours are deleted by the daily cron.
CREATE TABLE IF NOT EXISTS throttle (
  ip   TEXT    NOT NULL,
  hour INTEGER NOT NULL,
  n    INTEGER NOT NULL,
  PRIMARY KEY (ip, hour)
);
