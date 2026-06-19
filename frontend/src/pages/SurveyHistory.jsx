import { useEffect, useState } from "react";
import { apiRequest } from "../api/client.js";
import { EmptyState, Pagination, Panel, SurveyCard } from "../components/ui.jsx";
import { usePagedItems } from "../hooks/usePagedItems.js";
import { formatDate, normalizeSearch } from "../utils/format.js";

function SurveyHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadHistory() {
      setLoading(true);
      try {
        const rows = await apiRequest("/responses/my-history");
        if (!ignore) setHistory(rows);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadHistory();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredHistory = history.filter((survey) =>
    normalizeSearch(`${survey.title} ${survey.status}`).includes(normalizeSearch(keyword)),
  );
  const pages = usePagedItems(filteredHistory, 8);

  return (
    <Panel title="Lịch sử khảo sát">
      <div className="list-toolbar single">
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tìm khảo sát"
        />
      </div>
      {loading && <div className="message">Đang tải lịch sử...</div>}
      <div className="survey-list">
        {pages.pageItems.map((survey) => (
          <SurveyCard key={survey.id} survey={survey}>
            {survey.is_completed ? (
              <>
                <span className="status">Đã hoàn thành</span>
                <span className="muted-text">{formatDate(survey.submitted_at)}</span>
              </>
            ) : (
              <span className="status draft">Chưa hoàn thành</span>
            )}
          </SurveyCard>
        ))}
      </div>
      {!loading && filteredHistory.length === 0 && <EmptyState text="Chưa có lịch sử khảo sát." />}
      <Pagination page={pages.page} totalPages={pages.totalPages} onPageChange={pages.setPage} />
    </Panel>
  );
}

export default SurveyHistory;
