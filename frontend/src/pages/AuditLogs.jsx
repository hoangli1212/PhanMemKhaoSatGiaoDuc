import { useEffect, useState } from "react";
import { apiRequest } from "../api/client.js";
import { EmptyState, Pagination, Panel } from "../components/ui.jsx";
import { usePagedItems } from "../hooks/usePagedItems.js";
import { normalizeSearch } from "../utils/format.js";

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadLogs() {
      setLoading(true);
      try {
        const rows = await apiRequest("/audit-logs");
        if (!ignore) setLogs(rows);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadLogs();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredLogs = logs.filter((log) =>
    normalizeSearch(`${log.actor_name} ${log.action} ${log.entity_type} ${log.description}`).includes(normalizeSearch(keyword)),
  );
  const pages = usePagedItems(filteredLogs, 10);

  return (
    <Panel title="Nhật ký thao tác quản trị">
      <div className="list-toolbar single">
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tìm theo người thao tác, hành động, đối tượng"
        />
      </div>
      {loading && <div className="message">Đang tải nhật ký...</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Thời gian</th><th>Người thao tác</th><th>Hành động</th><th>Đối tượng</th><th>Mô tả</th></tr>
          </thead>
          <tbody>
            {pages.pageItems.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.created_at).toLocaleString("vi-VN")}</td>
                <td>{log.actor_name || "Không xác định"}</td>
                <td>{log.action}</td>
                <td>{log.entity_type} #{log.entity_id || ""}</td>
                <td>{log.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && filteredLogs.length === 0 && <EmptyState text="Chưa có nhật ký thao tác." />}
      <Pagination page={pages.page} totalPages={pages.totalPages} onPageChange={pages.setPage} />
    </Panel>
  );
}

export default AuditLogs;
