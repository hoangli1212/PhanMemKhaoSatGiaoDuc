import { Icon, Metric, Panel } from "../components/ui.jsx";

function Dashboard({ auth, surveys, questions, users, stats }) {
  const responseCount = stats?.surveys?.reduce((sum, survey) => sum + Number(survey.response_count || 0), 0) || 0;

  return (
    <div className="screen-stack">
      <div className="metric-grid">
        <Metric icon="survey" label="Khảo sát" value={surveys.length} />
        <Metric icon="question" label="Câu hỏi" value={questions.length} />
        <Metric icon="check" label="Phản hồi" value={responseCount} />
        <Metric icon="users" label="Người dùng" value={auth.user.role === "admin" ? users.length : "-"} />
      </div>

      <Panel title="Luồng hoạt động chính">
        <div className="workflow">
          <article><Icon name="users" /><strong>Admin</strong><span>Quản lý tài khoản và phân quyền.</span></article>
          <article><Icon name="survey" /><strong>Cán bộ khảo sát</strong><span>Tạo khảo sát, câu hỏi và mở khảo sát.</span></article>
          <article><Icon name="check" /><strong>Người tham gia</strong><span>Đăng nhập, trả lời và gửi phản hồi.</span></article>
          <article><Icon name="chart" /><strong>Hệ thống</strong><span>Lưu phản hồi và thống kê kết quả.</span></article>
        </div>
      </Panel>
    </div>
  );
}

export default Dashboard;
