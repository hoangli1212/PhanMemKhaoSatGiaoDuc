import { formatDate, groupLabel, statusLabel } from "../utils/format.js";

function NotificationPanel({ notifications, onOpenSurvey, onClose }) {
  return (
    <div className="notification-panel">
      <div className="notification-head">
        <strong>Thông báo khảo sát</strong>
        <button onClick={onClose} aria-label="Đóng thông báo">×</button>
      </div>
      {notifications.length === 0 && (
        <div className="notification-empty">Không có khảo sát mới cần thực hiện.</div>
      )}
      {notifications.length > 0 && (
        <div className="notification-list">
          {notifications.slice(0, 5).map((survey) => (
            <button key={survey.id} className="notification-item" onClick={onOpenSurvey}>
              <strong>{survey.title}</strong>
              <span>
                Hạn: {formatDate(survey.end_date) || "Chưa đặt hạn"} · {groupLabel(survey.target_group)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SurveyCard({ survey, children }) {
  return (
    <article className="survey-card">
      <div>
        <div className="card-meta">
          <span className="code">#{survey.id}</span>
          <span className={`status ${survey.status === "draft" ? "draft" : ""}`}>{statusLabel(survey.status)}</span>
        </div>
        <h2>{survey.title}</h2>
        <p>Đối tượng: {groupLabel(survey.target_group)} | Người tạo: {survey.creator_name || survey.creator_id}</p>
        <p>{formatDate(survey.start_date) || "Chưa có ngày bắt đầu"} - {formatDate(survey.end_date) || "Chưa có ngày kết thúc"}</p>
      </div>
      {children && <div className="survey-actions">{children}</div>}
    </article>
  );
}

function InfoCard({ icon, title, text }) {
  return (
    <article className="info-card">
      <Icon name={icon} />
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </article>
  );
}

function Metric({ icon, label, value }) {
  return (
    <article className="metric-card">
      <Icon name={icon} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Panel({ title, children }) {
  return (
    <section className="panel">
      <div className="panel-header"><h2>{title}</h2></div>
      {children}
    </section>
  );
}

function CompletionBar({ completed, total }) {
  const percent = total ? Math.round((Number(completed) / Number(total)) * 100) : 0;
  return (
    <div className="completion-box">
      <div className="completion-head">
        <strong>{percent}%</strong>
        <span>{completed}/{total} sinh viên đã hoàn thành</span>
      </div>
      <div className="completion-track">
        <i style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

function QuestionTypePreview({ type }) {
  const previews = {
    text: {
      title: "Câu trả lời ngắn hoặc đoạn văn",
      text: "Dùng cho góp ý, nhận xét hoặc câu hỏi cần người học tự nhập nội dung.",
    },
    rating: {
      title: "Thang điểm 1 đến 5",
      text: "Phù hợp với mức độ hài lòng, đánh giá chất lượng hoặc mức đồng ý.",
    },
    single_choice: {
      title: "Trắc nghiệm một đáp án",
      text: "Dùng khi người trả lời chỉ được chọn một phương án.",
    },
    multiple_choice: {
      title: "Hộp kiểm nhiều đáp án",
      text: "Dùng khi người trả lời có thể chọn nhiều phương án cùng lúc.",
    },
  };
  const preview = previews[type] || previews.text;

  return (
    <div className="question-type-preview">
      <strong>{preview.title}</strong>
      <span>{preview.text}</span>
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <button
        className="secondary-button small"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        Trước
      </button>
      <span>Trang {page} / {totalPages}</span>
      <button
        className="secondary-button small"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Sau
      </button>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>;
}

function Toast({ type, text, onClose }) {
  return (
    <div className={`toast ${type === "error" ? "error" : "success"}`}>
      <span>{text}</span>
      <button onClick={onClose} aria-label="Đóng thông báo">×</button>
    </div>
  );
}

function ConfirmDialog({ title, text, confirmText, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop">
      <section className="confirm-modal">
        <h2>{title}</h2>
        <p>{text}</p>
        <div className="form-actions">
          <button className="secondary-button" onClick={onCancel}>Hủy</button>
          <button className="danger-button" onClick={onConfirm}>{confirmText}</button>
        </div>
      </section>
    </div>
  );
}

function Icon({ name }) {
  const paths = {
    dashboard: <path d="M4 5h7v7H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 14h7v5H4z" />,
    survey: <path d="M7 3h10l3 3v15H4V3h3zm9 1v4h4M8 10h8M8 14h8M8 18h5" />,
    check: <path d="m4 12 5 5L20 6" />,
    users: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
    chart: <path d="M4 19V5M4 19h16M8 16V9M12 16V7M16 16v-4" />,
    question: <path d="M9 9a3 3 0 1 1 5 2.24c-1.2.8-2 1.24-2 2.76M12 18h.01" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {paths[name] || paths.dashboard}
      </g>
    </svg>
  );
}

export { NotificationPanel, SurveyCard, InfoCard, Metric, Panel, CompletionBar, QuestionTypePreview, Pagination, EmptyState, Toast, ConfirmDialog, Icon };
