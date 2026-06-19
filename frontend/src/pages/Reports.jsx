import { useEffect, useState } from "react";
import { apiRequest, downloadReport } from "../api/client.js";
import { CompletionBar, EmptyState, Metric, Pagination, Panel } from "../components/ui.jsx";
import { usePagedItems } from "../hooks/usePagedItems.js";
import { escapeHtml, groupLabel, normalizeSearch, questionTypeLabel, statusLabel } from "../utils/format.js";

function Reports({ stats, surveys, questions }) {
  const surveyStats = stats?.surveys || [];
  const [keyword, setKeyword] = useState("");
  const [exporting, setExporting] = useState("");
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const filteredStats = surveyStats.filter((survey) =>
    normalizeSearch(`${survey.title} ${survey.target_group} ${survey.status}`).includes(normalizeSearch(keyword)),
  );
  const reportPages = usePagedItems(filteredStats, 8);
  const totalResponses = surveyStats.reduce((sum, item) => sum + Number(item.response_count || 0), 0);
  const activeSurveyId = selectedSurveyId;
  const classOptions = Array.from(
    new Set(
      [
        ...(detail?.completed_students || []),
        ...(detail?.incomplete_students || []),
      ]
        .map((student) => student.class_name)
        .filter(Boolean),
    ),
  ).sort();

  useEffect(() => {
    if (!activeSurveyId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetail(null);
      return;
    }

    let ignore = false;
    async function loadDetail() {
      setDetailLoading(true);
      try {
        const query = classFilter ? `?class_name=${encodeURIComponent(classFilter)}` : "";
        const data = await apiRequest(`/responses/stats/${activeSurveyId}${query}`);
        if (!ignore) setDetail(data);
      } finally {
        if (!ignore) setDetailLoading(false);
      }
    }

    loadDetail();
    return () => {
      ignore = true;
    };
  }, [activeSurveyId, classFilter]);

  async function exportExcel() {
    setExporting("excel");
    try {
      await downloadReport("/responses/stats/export.xlsx", "bao-cao-thong-ke-khao-sat.xlsx");
    } finally {
      setExporting("");
    }
  }

  function exportPdf() {
    setExporting("pdf");
    const reportWindow = window.open("", "_blank", "width=980,height=720");
    if (!reportWindow) {
      setExporting("");
      return;
    }

    const rows = filteredStats.map((survey) => `
      <tr>
        <td>${escapeHtml(survey.title)}</td>
        <td>${escapeHtml(groupLabel(survey.target_group))}</td>
        <td>${survey.question_count}</td>
        <td>${survey.response_count}</td>
        <td>${escapeHtml(statusLabel(survey.status))}</td>
      </tr>
    `).join("");

    reportWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Báo cáo thống kê khảo sát</title>
          <style>
            body { font-family: Arial, sans-serif; color: #20242c; margin: 32px; }
            h1 { margin: 0 0 6px; font-size: 24px; }
            .muted { color: #666; margin-bottom: 22px; }
            .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 22px; }
            .metric { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
            .metric span { display: block; color: #666; font-size: 12px; }
            .metric strong { font-size: 24px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 9px 10px; text-align: left; font-size: 13px; }
            th { background: #f3f3f3; }
            @media print { button { display: none; } body { margin: 20px; } }
          </style>
        </head>
        <body>
          <button onclick="window.print()">Lưu/In PDF</button>
          <h1>Báo cáo thống kê khảo sát</h1>
          <div class="muted">Ngày xuất: ${new Date().toLocaleString("vi-VN")}</div>
          <div class="metrics">
            <div class="metric"><span>Khảo sát</span><strong>${surveys.length}</strong></div>
            <div class="metric"><span>Câu hỏi</span><strong>${questions.length}</strong></div>
            <div class="metric"><span>Phản hồi</span><strong>${totalResponses}</strong></div>
            <div class="metric"><span>Đang mở</span><strong>${surveys.filter((survey) => survey.status === "published").length}</strong></div>
          </div>
          <table>
            <thead>
              <tr><th>Khảo sát</th><th>Đối tượng</th><th>Câu hỏi</th><th>Phản hồi</th><th>Trạng thái</th></tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="5">Không có dữ liệu</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    setExporting("");
  }

  async function exportSurveyExcel() {
    if (!activeSurveyId) return;
    setExporting("survey-excel");
    try {
      await downloadReport(
        `/responses/stats/${activeSurveyId}/export.xlsx${classFilter ? `?class_name=${encodeURIComponent(classFilter)}` : ""}`,
        classFilter
          ? `bao-cao-chi-tiet-khao-sat-${activeSurveyId}-${classFilter}.xlsx`
          : `bao-cao-chi-tiet-khao-sat-${activeSurveyId}.xlsx`,
      );
    } finally {
      setExporting("");
    }
  }

  function exportSurveyPdf() {
    if (!detail) return;

    setExporting("survey-pdf");
    const reportWindow = window.open("", "_blank", "width=1080,height=760");
    if (!reportWindow) {
      setExporting("");
      return;
    }

    const incompleteRows = detail.incomplete_students.slice(0, 200).map((student) => `
      <tr>
        <td>${escapeHtml(student.student_code)}</td>
        <td>${escapeHtml(student.full_name)}</td>
        <td>${escapeHtml(student.class_name || "")}</td>
      </tr>
    `).join("");
    const answerRows = detail.answers.slice(0, 500).map((answer) => `
      <tr>
        <td>${escapeHtml(answer.student_code)}</td>
        <td>${escapeHtml(answer.full_name)}</td>
        <td>${escapeHtml(answer.question_content)}</td>
        <td>${escapeHtml(answer.option_text || answer.answer_text || answer.rating_value || "")}</td>
      </tr>
    `).join("");

    reportWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Báo cáo chi tiết khảo sát</title>
          <style>
            body { font-family: Arial, sans-serif; color: #20242c; margin: 32px; }
            h1 { margin: 0 0 6px; font-size: 24px; }
            h2 { margin-top: 24px; font-size: 18px; }
            .muted { color: #666; margin-bottom: 22px; }
            .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 22px; }
            .metric { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
            .metric span { display: block; color: #666; font-size: 12px; }
            .metric strong { font-size: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px 9px; text-align: left; font-size: 12px; vertical-align: top; }
            th { background: #f3f3f3; }
            @media print { button { display: none; } body { margin: 20px; } }
          </style>
        </head>
        <body>
          <button onclick="window.print()">Lưu/In PDF</button>
          <h1>Báo cáo chi tiết khảo sát</h1>
          <div class="muted">${escapeHtml(detail.survey.title)} | Ngày xuất: ${new Date().toLocaleString("vi-VN")}</div>
          <div class="metrics">
            <div class="metric"><span>Tổng sinh viên</span><strong>${detail.summary.total_students}</strong></div>
            <div class="metric"><span>Đã hoàn thành</span><strong>${detail.summary.completed_students}</strong></div>
            <div class="metric"><span>Chưa hoàn thành</span><strong>${detail.summary.incomplete_students}</strong></div>
            <div class="metric"><span>Câu hỏi</span><strong>${detail.summary.question_count}</strong></div>
          </div>
          <h2>Sinh viên chưa hoàn thành</h2>
          <table>
            <thead><tr><th>Mã sinh viên</th><th>Họ tên</th><th>Lớp</th></tr></thead>
            <tbody>${incompleteRows || '<tr><td colspan="3">Không có sinh viên chưa hoàn thành</td></tr>'}</tbody>
          </table>
          <h2>Câu trả lời chi tiết</h2>
          <table>
            <thead><tr><th>Mã sinh viên</th><th>Họ tên</th><th>Câu hỏi</th><th>Câu trả lời</th></tr></thead>
            <tbody>${answerRows || '<tr><td colspan="4">Chưa có câu trả lời</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    setExporting("");
  }

  if (selectedSurveyId) {
    return (
      <div className="screen-stack">
        <div className="detail-page-header">
          <button className="secondary-button" onClick={() => { setSelectedSurveyId(""); setClassFilter(""); }}>
            Quay lại thống kê
          </button>
          <div>
            <span>Chi tiết khảo sát</span>
            <h2>{detail?.survey?.title || "Đang tải khảo sát..."}</h2>
          </div>
          <div className="report-actions">
            <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              <option value="">Tất cả lớp</option>
              {classOptions.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
              {classFilter && !classOptions.includes(classFilter) && (
                <option value={classFilter}>{classFilter}</option>
              )}
            </select>
            <button className="secondary-button" onClick={exportSurveyPdf} disabled={!detail || Boolean(exporting)}>
              Xuất PDF chi tiết
            </button>
            <button className="primary-button" onClick={exportSurveyExcel} disabled={!activeSurveyId || Boolean(exporting)}>
              {exporting === "survey-excel" ? "Đang xuất..." : "Xuất Excel chi tiết"}
            </button>
          </div>
        </div>

        {detailLoading && <div className="message">Đang tải chi tiết khảo sát...</div>}
        {!detailLoading && detail && (
          <>
            <div className="metric-grid compact">
              <Metric icon="users" label="Tổng sinh viên" value={detail.summary.total_students} />
              <Metric icon="check" label="Đã hoàn thành" value={detail.summary.completed_students} />
              <Metric icon="chart" label="Chưa hoàn thành" value={detail.summary.incomplete_students} />
              <Metric icon="question" label="Câu hỏi" value={detail.summary.question_count} />
            </div>
            <Panel title="Tỷ lệ hoàn thành">
              <CompletionBar
                completed={detail.summary.completed_students}
                total={detail.summary.total_students}
              />
            </Panel>

            <div className="detail-grid">
              <Panel title="Sinh viên chưa hoàn thành">
                <div className="table-wrap">
                  <table className="compact-table">
                    <thead><tr><th>Mã sinh viên</th><th>Họ tên</th><th>Lớp</th></tr></thead>
                    <tbody>
                      {detail.incomplete_students.slice(0, 12).map((student) => (
                        <tr key={student.id}>
                          <td>{student.student_code}</td>
                          <td>{student.full_name}</td>
                          <td>{student.class_name || ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {detail.incomplete_students.length === 0 && <EmptyState text="Tất cả sinh viên đã hoàn thành khảo sát." />}
              </Panel>

              <Panel title="Thống kê lựa chọn">
                <div className="table-wrap">
                  <table className="compact-table">
                    <thead><tr><th>Câu hỏi</th><th>Phương án</th><th>Lượt chọn</th></tr></thead>
                    <tbody>
                      {detail.choice_summary.slice(0, 12).map((item) => (
                        <tr key={`${item.question_id}-${item.option_id}`}>
                          <td>{item.content}</td>
                          <td>{item.option_text}</td>
                          <td>{item.selected_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {detail.choice_summary.length === 0 && <EmptyState text="Khảo sát chưa có câu hỏi lựa chọn." />}
              </Panel>
            </div>
            <Panel title="Kết quả từng câu hỏi">
              <div className="question-result-list">
                {detail.questions.map((question) => {
                  const choiceItems = detail.choice_summary.filter((item) => Number(item.question_id) === Number(question.id));
                  const ratingItem = detail.rating_summary.find((item) => Number(item.question_id) === Number(question.id));
                  const textAnswers = detail.answers.filter(
                    (answer) => Number(answer.question_id) === Number(question.id) && answer.answer_text,
                  );
                  const totalChoiceCount = choiceItems.reduce((sum, item) => sum + Number(item.selected_count || 0), 0);

                  return (
                    <article className="question-result-card" key={question.id}>
                      <div className="card-meta">
                        <span className="code">{questionTypeLabel(question.question_type)}</span>
                        {question.is_required ? <span className="status">Bắt buộc</span> : null}
                      </div>
                      <h3>{question.content}</h3>
                      {choiceItems.length > 0 && (
                        <div className="chart-list compact">
                          {choiceItems.map((item) => {
                            const percent = totalChoiceCount ? Math.round((Number(item.selected_count || 0) / totalChoiceCount) * 100) : 0;
                            return (
                              <div className="chart-row" key={item.option_id}>
                                <span>{item.option_text}</span>
                                <div className="chart-track"><i style={{ width: `${percent}%` }} /></div>
                                <b>{percent}%</b>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {question.question_type === "rating" && (
                        <div className="rating-summary">
                          <strong>{ratingItem?.average_rating ? Number(ratingItem.average_rating).toFixed(2) : "0.00"}</strong>
                          <span>Điểm trung bình từ {ratingItem?.rating_count || 0} lượt đánh giá</span>
                        </div>
                      )}
                      {question.question_type === "text" && (
                        <div className="text-answer-list">
                          {textAnswers.slice(0, 5).map((answer) => (
                            <blockquote key={`${answer.response_id}-${answer.question_id}`}>
                              {answer.answer_text}
                              <span>{answer.full_name}</span>
                            </blockquote>
                          ))}
                          {textAnswers.length === 0 && <EmptyState text="Chưa có câu trả lời tự luận." />}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </Panel>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="screen-stack">
      <div className="metric-grid">
        <Metric icon="survey" label="Khảo sát" value={surveys.length} />
        <Metric icon="question" label="Câu hỏi" value={questions.length} />
        <Metric icon="check" label="Phản hồi" value={totalResponses} />
        <Metric icon="chart" label="Đang mở" value={surveys.filter((survey) => survey.status === "published").length} />
      </div>
      <Panel title="Thống kê phản hồi theo khảo sát">
        <div className="report-toolbar">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm khảo sát trong thống kê"
          />
          <div className="report-actions">
            <button className="secondary-button" onClick={exportPdf} disabled={Boolean(exporting)}>
              Xuất PDF
            </button>
            <button className="primary-button" onClick={exportExcel} disabled={Boolean(exporting)}>
              {exporting === "excel" ? "Đang xuất..." : "Xuất Excel"}
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Khảo sát</th><th>Đối tượng</th><th>Câu hỏi</th><th>Phản hồi</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {reportPages.pageItems.map((survey) => (
                <tr key={survey.id}>
                  <td>{survey.title}</td>
                  <td>{groupLabel(survey.target_group)}</td>
                  <td>{survey.question_count}</td>
                  <td>{survey.response_count}</td>
                  <td>{statusLabel(survey.status)}</td>
                  <td>
                    <button className="secondary-button small" onClick={() => { setClassFilter(""); setSelectedSurveyId(String(survey.id)); }}>
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredStats.length === 0 && <EmptyState text="Chưa có dữ liệu thống kê phù hợp." />}
        <Pagination page={reportPages.page} totalPages={reportPages.totalPages} onPageChange={reportPages.setPage} />
      </Panel>
      <Panel title="Biểu đồ phản hồi">
        <div className="chart-list">
          {surveyStats.slice(0, 8).map((survey) => {
            const totalStudents = Number(survey.total_students || 0);
            const responseCount = Number(survey.response_count || 0);
            const percent = totalStudents ? Math.round((responseCount / totalStudents) * 100) : 0;
            return (
              <div className="chart-row" key={survey.id}>
                <span>{survey.title}</span>
                <div className="chart-track">
                  <i style={{ width: `${Math.min(percent, 100)}%` }} />
                </div>
                <b>{responseCount}</b>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

export default Reports;
