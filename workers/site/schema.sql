-- Community numbers behind the catalog. No personal data: `voter` is a salted
-- hash of the visitor's own random id plus their address, computed in the Worker.
CREATE TABLE IF NOT EXISTS plays (
  slug TEXT PRIMARY KEY,
  n    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS play_log (
  slug  TEXT NOT NULL,
  voter TEXT NOT NULL,
  day   TEXT NOT NULL,
  PRIMARY KEY (slug, voter, day)
);

CREATE TABLE IF NOT EXISTS votes (
  slug  TEXT    NOT NULL,
  voter TEXT    NOT NULL,
  value INTEGER NOT NULL CHECK (value BETWEEN 1 AND 5),
  ts    INTEGER NOT NULL,
  PRIMARY KEY (slug, voter)
);

CREATE INDEX IF NOT EXISTS votes_by_slug ON votes (slug);
