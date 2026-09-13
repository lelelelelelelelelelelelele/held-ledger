use rusqlite::{params, Connection, OptionalExtension};
use serde_json::Value;
use std::path::Path;

const CURRENT_SCHEMA_VERSION: i64 = 1;

pub struct Store(Connection);

impl Store {
    pub fn open(path: &Path) -> Result<Self, String> {
        let db = Connection::open(path).map_err(|e| e.to_string())?;
        db.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS state (id TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS schema_meta (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL);")
            .map_err(|e| e.to_string())?;
        Self::ensure_schema_version(&db)?;
        Ok(Self(db))
    }

    fn ensure_schema_version(db: &Connection) -> Result<(), String> {
        let version: Option<i64> = db
            .query_row("SELECT version FROM schema_meta WHERE id=1", [], |row| {
                row.get(0)
            })
            .optional()
            .map_err(|e| e.to_string())?;
        match version {
            None => {
                // Databases created before version metadata are already using
                // the version-1 shape; record that fact once and fail closed
                // for any future shape instead of silently guessing.
                db.execute(
                    "INSERT INTO schema_meta(id,version) VALUES (1,?1)",
                    params![CURRENT_SCHEMA_VERSION],
                )
                .map_err(|e| e.to_string())?;
            }
            Some(found) if found == CURRENT_SCHEMA_VERSION => {}
            Some(found) => {
                return Err(format!(
                    "不支持的台账数据库 schema 版本 {found}，当前版本为 {CURRENT_SCHEMA_VERSION}"
                ));
            }
        }
        Ok(())
    }

    #[cfg(test)]
    pub fn schema_version(&self) -> Result<i64, String> {
        self.0
            .query_row("SELECT version FROM schema_meta WHERE id=1", [], |row| {
                row.get(0)
            })
            .map_err(|e| e.to_string())
    }

    pub fn get(&self, id: &str) -> Result<Option<Value>, String> {
        let value: Option<String> = self
            .0
            .query_row("SELECT value FROM state WHERE id=?1", [id], |r| r.get(0))
            .optional()
            .map_err(|e| e.to_string())?;
        value
            .map(|s| serde_json::from_str(&s).map_err(|e| e.to_string()))
            .transpose()
    }

    pub fn put(&self, id: &str, value: Value) -> Result<(), String> {
        if id == "assets" {
            let assets = value.as_array().ok_or("资产必须为数组")?;
            let mut ids = std::collections::HashSet::new();
            for asset in assets {
                let id = asset["id"]
                    .as_str()
                    .filter(|s| !s.is_empty())
                    .ok_or("资产缺少 ID")?;
                if !ids.insert(id) {
                    return Err("资产 ID 重复".into());
                }
            }
        }
        self.0.execute("INSERT INTO state(id,value) VALUES (?1,?2) ON CONFLICT(id) DO UPDATE SET value=excluded.value", params![id, value.to_string()])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn empty_is_distinct_from_uninitialized_and_invalid_write_preserves_data() {
        let s = Store::open(Path::new(":memory:")).unwrap();
        assert_eq!(s.schema_version().unwrap(), CURRENT_SCHEMA_VERSION);
        assert_eq!(s.get("assets").unwrap(), None);
        s.put("assets", json!([])).unwrap();
        assert_eq!(s.get("assets").unwrap(), Some(json!([])));
        s.put(
            "assets",
            json!([{"id":"a", "photo":"data:image/png;base64,abc", "value":123.45}]),
        )
        .unwrap();
        let before = s.get("assets").unwrap();
        assert!(s.put("assets", json!([{"id":"a"},{"id":"a"}])).is_err());
        assert_eq!(s.get("assets").unwrap(), before);
    }

    #[test]
    fn sqlite_failure_does_not_replace_previous_snapshot() {
        let s = Store::open(Path::new(":memory:")).unwrap();
        s.put("assets", json!([{"id":"original", "value":12.34}]))
            .unwrap();
        let before = s.get("assets").unwrap();
        s.0.execute_batch("PRAGMA query_only=ON").unwrap();
        assert!(s.put("assets", json!([])).is_err());
        assert_eq!(s.get("assets").unwrap(), before);
    }

    #[test]
    fn unsupported_schema_version_fails_closed() {
        let s = Store::open(Path::new(":memory:")).unwrap();
        s.0.execute("UPDATE schema_meta SET version=99 WHERE id=1", [])
            .unwrap();
        let error = Store::ensure_schema_version(&s.0).unwrap_err();
        assert!(error.contains("schema 版本 99"));
    }
}
