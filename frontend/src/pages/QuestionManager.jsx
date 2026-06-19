import { useState } from "react";
import { apiRequest } from "../api/client.js";
import { EmptyState, Icon, Pagination, Panel, QuestionTypePreview } from "../components/ui.jsx";
import { emptyQuestion } from "../data/forms.js";
import { usePagedItems } from "../hooks/usePagedItems.js";
import { normalizeSearch, questionTypeLabel } from "../utils/format.js";

function QuestionManager({ surveys, questions, onChanged, onNotify, onConfirm, onError }) {
  const [form, setForm] = useState(emptyQuestion);
  const [editingId, setEditingId] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const selectedSurveyId = form.survey_id || (surveys[0]?.id ? String(surveys[0].id) : "");
  const filteredQuestions = questions.filter((question) => {
    const haystack = normalizeSearch(`${question.content} ${question.survey_title}`);
    const matchesKeyword = haystack.includes(normalizeSearch(keyword));
    const matchesType = typeFilter === "all" || question.question_type === typeFilter;
    return matchesKeyword && matchesType;
  });
  const questionPages = usePagedItems(filteredQuestions, 6);
  const hasChoices = ["single_choice", "multiple_choice"].includes(form.question_type);

  async function edit(question) {
    const detail = await apiRequest(`/questions/${question.id}`);
    setEditingId(detail.id);
    setForm({
      survey_id: String(detail.survey_id),
      content: detail.content,
      question_type: detail.question_type,
      is_required: Boolean(detail.is_required),
      sort_order: detail.sort_order || 0,
      options: detail.options?.length ? detail.options.map((option) => option.option_text) : ["", ""],
    });
  }

  function updateQuestionType(questionType) {
    setForm({
      ...form,
      question_type: questionType,
      options: ["single_choice", "multiple_choice"].includes(questionType) ? form.options : ["", ""],
    });
  }

  function updateOption(index, value) {
    setForm({
      ...form,
      options: form.options.map((option, optionIndex) => (optionIndex === index ? value : option)),
    });
  }

  function addOption() {
    setForm({ ...form, options: [...form.options, ""] });
  }

  function removeOption(index) {
    setForm({
      ...form,
      options: form.options.length > 2 ? form.options.filter((_, optionIndex) => optionIndex !== index) : form.options,
    });
  }

  async function submit(event) {
    event.preventDefault();
    const cleanOptions = form.options.map((line) => line.trim()).filter(Boolean);
    if (hasChoices && cleanOptions.length < 2) {
      onError("Câu hỏi lựa chọn phải có ít nhất 2 phương án.");
      return;
    }
    const payload = {
      survey_id: Number(selectedSurveyId),
      content: form.content,
      question_type: form.question_type,
      is_required: form.is_required,
      sort_order: Number(form.sort_order || 0),
      options: hasChoices ? cleanOptions : [],
    };

    await apiRequest(editingId ? `/questions/${editingId}` : "/questions", {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });

    setForm(emptyQuestion);
    setEditingId(null);
    onNotify(editingId ? "Đã cập nhật câu hỏi." : "Đã thêm câu hỏi.");
    onChanged();
  }

  async function remove(question) {
    const confirmed = await onConfirm({
      title: "Xóa câu hỏi",
      text: "Bạn có chắc muốn xóa câu hỏi này?",
    });
    if (!confirmed) return;
    await apiRequest(`/questions/${question.id}`, { method: "DELETE" });
    onNotify("Đã xóa câu hỏi.");
    onChanged();
  }

  return (
    <div className="crud-grid">
      <Panel title={editingId ? "Cập nhật câu hỏi" : "Thêm câu hỏi"}>
        <form className="form-grid" onSubmit={submit}>
          <label>Khảo sát
            <select value={selectedSurveyId} onChange={(e) => setForm({ ...form, survey_id: e.target.value })} required>
              <option value="">Chọn khảo sát</option>
              {surveys.map((survey) => <option key={survey.id} value={survey.id}>{survey.title}</option>)}
            </select>
          </label>
          <label>Nội dung câu hỏi<textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required /></label>
          <div className="field-row">
            <label>Loại câu hỏi
              <select value={form.question_type} onChange={(e) => updateQuestionType(e.target.value)}>
                <option value="text">Tự luận</option>
                <option value="rating">Thang điểm</option>
                <option value="single_choice">Một lựa chọn</option>
                <option value="multiple_choice">Nhiều lựa chọn</option>
              </select>
            </label>
            <label>Thứ tự<input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></label>
          </div>
          <QuestionTypePreview type={form.question_type} />
          {hasChoices && (
            <div className="choice-editor">
              <div className="choice-editor-title">
                <strong>Phương án trả lời</strong>
                <span>{form.question_type === "single_choice" ? "Người trả lời chọn một đáp án." : "Người trả lời có thể chọn nhiều đáp án."}</span>
              </div>
              {form.options.map((option, index) => (
                <div className="choice-row" key={index}>
                  <span className="choice-marker">{form.question_type === "single_choice" ? "○" : "□"}</span>
                  <input
                    value={option}
                    onChange={(event) => updateOption(index, event.target.value)}
                    placeholder={`Lựa chọn ${index + 1}`}
                  />
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => removeOption(index)}
                    disabled={form.options.length <= 2}
                    aria-label="Xóa lựa chọn"
                  >
                    <Icon name="close" />
                  </button>
                </div>
              ))}
              <button className="secondary-button" type="button" onClick={addOption}>
                Thêm lựa chọn
              </button>
            </div>
          )}
          <label className="inline-check"><input type="checkbox" checked={form.is_required} onChange={(e) => setForm({ ...form, is_required: e.target.checked })} />Bắt buộc trả lời</label>
          <div className="form-actions">
            <button className="primary-button" disabled={surveys.length === 0}>{editingId ? "Lưu cập nhật" : "Thêm câu hỏi"}</button>
            {editingId && <button type="button" className="secondary-button" onClick={() => { setEditingId(null); setForm(emptyQuestion); }}>Hủy</button>}
          </div>
        </form>
      </Panel>

      <Panel title="Danh sách câu hỏi">
        <div className="list-toolbar">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm nội dung câu hỏi"
          />
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">Tất cả loại câu hỏi</option>
            <option value="text">Tự luận</option>
            <option value="rating">Thang điểm</option>
            <option value="single_choice">Một lựa chọn</option>
            <option value="multiple_choice">Nhiều lựa chọn</option>
          </select>
        </div>
        <div className="question-list">
          {questionPages.pageItems.map((question, index) => (
            <article className="question-card" key={question.id}>
              <div className="question-index">{(questionPages.page - 1) * 6 + index + 1}</div>
              <div>
                <div className="card-meta">
                  <span className="code">{questionTypeLabel(question.question_type)}</span>
                  {question.is_required ? <span className="status">Bắt buộc</span> : null}
                </div>
                <h3>{question.content}</h3>
                <p>Khảo sát: {question.survey_title}</p>
                <div className="row-actions">
                  <button className="secondary-button small" onClick={() => edit(question)}>Sửa</button>
                  <button className="danger-button small" onClick={() => remove(question)}>Xóa</button>
                </div>
              </div>
            </article>
          ))}
          {filteredQuestions.length === 0 && <EmptyState text="Chưa có câu hỏi phù hợp." />}
        </div>
        <Pagination page={questionPages.page} totalPages={questionPages.totalPages} onPageChange={questionPages.setPage} />
      </Panel>
    </div>
  );
}

export default QuestionManager;
