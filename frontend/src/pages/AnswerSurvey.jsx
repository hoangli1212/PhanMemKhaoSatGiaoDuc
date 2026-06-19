import { useState } from "react";
import { apiRequest } from "../api/client.js";
import { EmptyState, Pagination, Panel, SurveyCard } from "../components/ui.jsx";
import { usePagedItems } from "../hooks/usePagedItems.js";
import { normalizeSearch } from "../utils/format.js";

function AnswerSurvey({ surveys, onChanged, onNotify }) {
  const openSurveys = surveys.filter((survey) => survey.status === "published");
  const [surveyId, setSurveyId] = useState("");
  const [surveyForm, setSurveyForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [keyword, setKeyword] = useState("");
  const filteredOpenSurveys = openSurveys.filter((survey) =>
    normalizeSearch(`${survey.title} ${survey.description}`).includes(normalizeSearch(keyword)),
  );
  const openSurveyPages = usePagedItems(filteredOpenSurveys, 5);

  async function loadSurvey(id) {
    setSurveyId(id);
    setAnswers({});
    setSurveyForm(id ? await apiRequest(`/surveys/${id}/form`) : null);
  }

  function setAnswer(question, value) {
    setAnswers({ ...answers, [question.id]: value });
  }

  async function submit(event) {
    event.preventDefault();
    const payload = {
      survey_id: Number(surveyId),
      answers: surveyForm.questions.map((question) => {
        const value = answers[question.id];
        if (question.question_type === "multiple_choice") {
          return { question_id: question.id, option_ids: value || [] };
        }
        if (question.question_type === "single_choice") {
          return { question_id: question.id, option_id: value || null };
        }
        if (question.question_type === "rating") {
          return { question_id: question.id, rating_value: value || null };
        }
        return { question_id: question.id, answer_text: value || "" };
      }),
    };

    await apiRequest("/responses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setSurveyForm(null);
    setSurveyId("");
    setAnswers({});
    onNotify("Đã gửi phản hồi khảo sát.");
    onChanged();
  }

  return (
    <div className="response-grid">
      <Panel title="Chọn khảo sát đang mở">
        <div className="list-toolbar single">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm khảo sát cần trả lời"
          />
        </div>
        <div className="survey-list">
          {openSurveyPages.pageItems.map((survey) => (
            <SurveyCard key={survey.id} survey={survey}>
              {survey.is_completed ? <span className="status">Đã hoàn thành</span> : null}
              <button
                className="primary-button small"
                onClick={() => loadSurvey(survey.id)}
                disabled={Boolean(survey.is_completed)}
              >
                {survey.is_completed ? "Đã nộp" : "Trả lời"}
              </button>
            </SurveyCard>
          ))}
          {filteredOpenSurveys.length === 0 && <EmptyState text="Hiện chưa có khảo sát đang mở." />}
        </div>
        <Pagination page={openSurveyPages.page} totalPages={openSurveyPages.totalPages} onPageChange={openSurveyPages.setPage} />
      </Panel>

      <Panel title="Phiếu trả lời">
        {!surveyForm && <EmptyState text="Chọn một khảo sát để bắt đầu trả lời." />}
        {surveyForm && (
          <form className="response-form" onSubmit={submit}>
            <h2>{surveyForm.title}</h2>
            <p>{surveyForm.description}</p>
            {surveyForm.questions.map((question, index) => (
              <fieldset key={question.id}>
                <legend>{index + 1}. {question.content}</legend>
                {question.question_type === "text" && (
                  <textarea required={Boolean(question.is_required)} value={answers[question.id] || ""} onChange={(e) => setAnswer(question, e.target.value)} />
                )}
                {question.question_type === "rating" && (
                  <select required={Boolean(question.is_required)} value={answers[question.id] || ""} onChange={(e) => setAnswer(question, e.target.value)}>
                    <option value="">Chọn điểm</option>
                    {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                )}
                {question.question_type === "single_choice" && question.options.map((option) => (
                  <label key={option.id}>
                    <input type="radio" name={`q-${question.id}`} value={option.id} required={Boolean(question.is_required)} onChange={() => setAnswer(question, option.id)} />
                    {option.option_text}
                  </label>
                ))}
                {question.question_type === "multiple_choice" && question.options.map((option) => {
                  const current = answers[question.id] || [];
                  return (
                    <label key={option.id}>
                      <input
                        type="checkbox"
                        checked={current.includes(option.id)}
                        onChange={(e) => {
                          setAnswer(question, e.target.checked ? [...current, option.id] : current.filter((id) => id !== option.id));
                        }}
                      />
                      {option.option_text}
                    </label>
                  );
                })}
              </fieldset>
            ))}
            <button className="primary-button">Gửi phản hồi</button>
          </form>
        )}
      </Panel>
    </div>
  );
}

export default AnswerSurvey;
