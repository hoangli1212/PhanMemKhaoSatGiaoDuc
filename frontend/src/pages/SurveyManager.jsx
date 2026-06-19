import { useState } from "react";
import { apiRequest } from "../api/client.js";
import { EmptyState, Pagination, Panel, SurveyCard } from "../components/ui.jsx";
import { emptySurvey } from "../data/forms.js";
import { usePagedItems } from "../hooks/usePagedItems.js";
import { formatDate, normalizeSearch } from "../utils/format.js";

function SurveyManager({ auth, surveys, questions, onChanged, onNotify, onConfirm, onError }) {
  const [form, setForm] = useState(emptySurvey);
  const [editingId, setEditingId] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const filteredSurveys = surveys.filter((survey) => {
    const haystack = normalizeSearch(`${survey.title} ${survey.description} ${survey.creator_name}`);
    const matchesKeyword = haystack.includes(normalizeSearch(keyword));
    const matchesStatus = statusFilter === "all" || survey.status === statusFilter;
    return matchesKeyword && matchesStatus;
  });
  const surveyPages = usePagedItems(filteredSurveys, 5);

  function edit(survey) {
    setEditingId(survey.id);
    setForm({
      title: survey.title || "",
      description: survey.description || "",
      target_group: survey.target_group || "student",
      start_date: formatDate(survey.start_date),
      end_date: formatDate(survey.end_date),
      status: survey.status || "draft",
    });
  }

  async function submit(event) {
    event.preventDefault();
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      onError("Ngày kết thúc không được nhỏ hơn ngày bắt đầu.");
      return;
    }
    if (form.status === "published" && editingId) {
      const questionCount = questions.filter((question) => Number(question.survey_id) === Number(editingId)).length;
      if (questionCount === 0) {
        onError("Khảo sát phải có ít nhất 1 câu hỏi trước khi mở.");
        return;
      }
    }
    const payload = {
      ...form,
      creator_id: auth.user.id,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };

    await apiRequest(editingId ? `/surveys/${editingId}` : "/surveys", {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });

    setForm(emptySurvey);
    setEditingId(null);
    onNotify(editingId ? "Đã cập nhật khảo sát." : "Đã tạo khảo sát.");
    onChanged();
  }

  async function remove(survey) {
    const confirmed = await onConfirm({
      title: "Xóa khảo sát",
      text: `Bạn có chắc muốn xóa khảo sát "${survey.title}"? Toàn bộ câu hỏi và phản hồi liên quan cũng sẽ bị xóa.`,
    });
    if (!confirmed) return;
    await apiRequest(`/surveys/${survey.id}`, { method: "DELETE" });
    onNotify("Đã xóa khảo sát.");
    onChanged();
  }

  return (
    <div className="crud-grid">
      <Panel title={editingId ? "Cập nhật khảo sát" : "Tạo khảo sát"}>
        <form className="form-grid" onSubmit={submit}>
          <label>Tên khảo sát<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
          <label>Mô tả<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <div className="field-row">
            <label>Đối tượng
              <select value={form.target_group} onChange={(e) => setForm({ ...form, target_group: e.target.value })}>
                <option value="student">Sinh viên</option>
                <option value="lecturer">Giảng viên</option>
                <option value="alumni">Cựu sinh viên</option>
                <option value="employer">Nhà tuyển dụng</option>
                <option value="all">Tất cả</option>
              </select>
            </label>
            <label>Trạng thái
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Bản nháp</option>
                <option value="published">Đang mở</option>
                <option value="closed">Đã đóng</option>
              </select>
            </label>
          </div>
          <div className="field-row">
            <label>Ngày bắt đầu<input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></label>
            <label>Ngày kết thúc<input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></label>
          </div>
          <div className="form-actions">
            <button className="primary-button">{editingId ? "Lưu cập nhật" : "Tạo khảo sát"}</button>
            {editingId && <button type="button" className="secondary-button" onClick={() => { setEditingId(null); setForm(emptySurvey); }}>Hủy</button>}
          </div>
        </form>
      </Panel>

      <Panel title="Danh sách khảo sát">
        <div className="list-toolbar">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm khảo sát"
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="draft">Bản nháp</option>
            <option value="published">Đang mở</option>
            <option value="closed">Đã đóng</option>
          </select>
        </div>
        <div className="survey-list">
          {surveyPages.pageItems.map((survey) => (
            <SurveyCard key={survey.id} survey={survey}>
              <button className="secondary-button small" onClick={() => edit(survey)}>Sửa</button>
              <button className="danger-button small" onClick={() => remove(survey)}>Xóa</button>
            </SurveyCard>
          ))}
          {filteredSurveys.length === 0 && <EmptyState text="Chưa có khảo sát phù hợp." />}
        </div>
        <Pagination page={surveyPages.page} totalPages={surveyPages.totalPages} onPageChange={surveyPages.setPage} />
      </Panel>
    </div>
  );
}

export default SurveyManager;
