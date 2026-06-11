import { useMemo, useState } from 'react'
import './App.css'

const navItems = [
  { id: 'dashboard', label: 'Tổng quan', icon: 'dashboard' },
  { id: 'surveys', label: 'Khảo sát', icon: 'survey' },
  { id: 'builder', label: 'Tạo khảo sát', icon: 'edit' },
  { id: 'response', label: 'Trả lời khảo sát', icon: 'check' },
  { id: 'users', label: 'Người dùng', icon: 'users' },
  { id: 'reports', label: 'Thống kê', icon: 'chart' },
]

const surveys = [
  {
    id: 'KS001',
    title: 'Khảo sát mức độ hài lòng về chương trình đào tạo',
    target: 'Sinh viên',
    status: 'Đang mở',
    responses: 846,
    progress: 82,
    endDate: '15/06/2026',
  },
  {
    id: 'KS002',
    title: 'Đánh giá chất lượng giảng dạy học kỳ II',
    target: 'Sinh viên, giảng viên',
    status: 'Đang mở',
    responses: 1280,
    progress: 68,
    endDate: '20/06/2026',
  },
  {
    id: 'KS003',
    title: 'Khảo sát nhu cầu tuyển dụng và chuẩn đầu ra',
    target: 'Nhà tuyển dụng',
    status: 'Bản nháp',
    responses: 74,
    progress: 36,
    endDate: '30/06/2026',
  },
]

const questions = [
  { type: 'Thang điểm', content: 'Bạn đánh giá mức độ phù hợp của chương trình đào tạo như thế nào?', required: true },
  { type: 'Trắc nghiệm', content: 'Bạn hài lòng nhất với hoạt động hỗ trợ học tập nào?', required: true },
  { type: 'Tự luận', content: 'Đề xuất của bạn để cải thiện chất lượng đào tạo là gì?', required: false },
]

const users = [
  { name: 'Nguyễn Minh Anh', email: 'admin@example.com', role: 'Admin', group: 'Cán bộ', status: 'Hoạt động' },
  { name: 'Trần Quốc Bảo', email: 'creator@example.com', role: 'Người tạo khảo sát', group: 'Khoa CNTT', status: 'Hoạt động' },
  { name: 'Lê Thảo My', email: 'student@example.com', role: 'Người tham gia', group: 'Sinh viên', status: 'Đã mời' },
  { name: 'ABC Tech', email: 'hr@abctech.vn', role: 'Người tham gia', group: 'Nhà tuyển dụng', status: 'Đã phản hồi' },
]

function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [role, setRole] = useState('Admin')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const title = useMemo(() => {
    return navItems.find((item) => item.id === activePage)?.label || 'Tổng quan'
  }, [activePage])

  const goTo = (page) => {
    setActivePage(page)
    setSidebarOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">KS</div>
          <div>
            <strong>EduSurvey</strong>
            <span>Hệ thống khảo sát giáo dục</span>
          </div>
          <button className="icon-button close-button" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu">
            <Icon name="close" />
          </button>
        </div>

        <nav className="nav-list" aria-label="Điều hướng chính">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => goTo(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="role-box">
          <label htmlFor="role">Vai trò đang xem</label>
          <select id="role" value={role} onChange={(event) => setRole(event.target.value)}>
            <option>Admin</option>
            <option>Người tạo khảo sát</option>
            <option>Người tham gia</option>
          </select>
          <p>Giao diện mẫu theo các vai trò chính của hệ thống.</p>
        </div>
      </aside>

      {sidebarOpen && <button className="scrim" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu" />}

      <main className="main">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Mở menu">
            <Icon name="menu" />
          </button>
          <div className="page-title">
            <span>Phần mềm khảo sát lấy ý kiến các bên liên quan</span>
            <h1>{title}</h1>
          </div>
          <label className="search-box">
            <Icon name="search" />
            <input placeholder="Tìm khảo sát, câu hỏi, người dùng" />
          </label>
          <button className="primary-button" onClick={() => goTo('builder')}>
            <Icon name="plus" />
            Tạo khảo sát
          </button>
        </header>

        <section className="content">
          {activePage === 'dashboard' && <Dashboard onNavigate={goTo} />}
          {activePage === 'surveys' && <SurveyManagement onNavigate={goTo} />}
          {activePage === 'builder' && <SurveyBuilder />}
          {activePage === 'response' && <SurveyResponse />}
          {activePage === 'users' && <UserManagement />}
          {activePage === 'reports' && <Reports />}
        </section>
      </main>
    </div>
  )
}

function Dashboard({ onNavigate }) {
  return (
    <div className="screen-stack">
      <div className="metric-grid">
        <Metric icon="survey" label="Khảo sát đang mở" value="12" note="3 khảo sát mới trong tháng" />
        <Metric icon="check" label="Phản hồi đã thu thập" value="2.846" note="Tỷ lệ hoàn thành trung bình 78%" />
        <Metric icon="users" label="Nhóm đối tượng" value="4" note="Sinh viên, giảng viên, cựu SV, nhà tuyển dụng" />
        <Metric icon="report" label="Báo cáo đã xuất" value="36" note="PDF và Excel" />
      </div>

      <div className="grid-2">
        <Panel title="Tiến độ khảo sát" action="Quản lý" onAction={() => onNavigate('surveys')}>
          <div className="progress-list">
            {surveys.map((survey) => (
              <div className="progress-row" key={survey.id}>
                <div>
                  <strong>{survey.title}</strong>
                  <span>{survey.target}</span>
                </div>
                <div className="progress-track" aria-label={`Tiến độ ${survey.progress}%`}>
                  <i style={{ width: `${survey.progress}%` }} />
                </div>
                <b>{survey.progress}%</b>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Mức độ hài lòng">
          <div className="bar-list">
            {[
              ['Sinh viên', 86],
              ['Giảng viên', 79],
              ['Cựu sinh viên', 74],
              ['Nhà tuyển dụng', 81],
            ].map(([label, value]) => (
              <div className="bar-row" key={label}>
                <span>{label}</span>
                <div><i style={{ width: `${value}%` }} /></div>
                <b>{value}%</b>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Luồng nghiệp vụ chính">
        <div className="workflow">
          {[
            ['Tạo khảo sát', 'Nhập thông tin, thời gian và đối tượng', 'edit'],
            ['Thêm câu hỏi', 'Chọn loại câu hỏi và phương án trả lời', 'question'],
            ['Người dùng trả lời', 'Gửi phản hồi trên giao diện Web', 'check'],
            ['Thống kê kết quả', 'Tổng hợp dashboard và xuất báo cáo', 'chart'],
          ].map(([title, desc, icon]) => (
            <article key={title}>
              <Icon name={icon} />
              <strong>{title}</strong>
              <span>{desc}</span>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function SurveyManagement({ onNavigate }) {
  return (
    <div className="screen-stack">
      <Panel title="Danh sách khảo sát" action="Tạo khảo sát" onAction={() => onNavigate('builder')}>
        <div className="survey-list">
          {surveys.map((survey) => (
            <article className="survey-card" key={survey.id}>
              <div>
                <div className="card-meta">
                  <span className="code">{survey.id}</span>
                  <span className={`status ${survey.status === 'Bản nháp' ? 'draft' : ''}`}>{survey.status}</span>
                </div>
                <h2>{survey.title}</h2>
                <p>Đối tượng: {survey.target} • Hạn trả lời: {survey.endDate}</p>
              </div>
              <div className="survey-actions">
                <div>
                  <strong>{survey.responses}</strong>
                  <span>phản hồi</span>
                </div>
                <button className="secondary-button">Chi tiết</button>
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <div className="grid-3">
        <InfoCard icon="send" title="Gửi khảo sát" text="Công bố khảo sát đến nhóm người tham gia đã chọn." />
        <InfoCard icon="edit" title="Chỉnh sửa" text="Cập nhật tiêu đề, mô tả, thời gian và trạng thái khảo sát." />
        <InfoCard icon="chart" title="Theo dõi" text="Xem số lượng phản hồi và tỷ lệ hoàn thành theo thời gian." />
      </div>
    </div>
  )
}

function SurveyBuilder() {
  return (
    <div className="builder-grid">
      <Panel title="Thông tin khảo sát">
        <form className="form-grid">
          <label>
            Tên khảo sát
            <input defaultValue="Khảo sát mức độ hài lòng về chương trình đào tạo" />
          </label>
          <label>
            Mô tả
            <textarea defaultValue="Thu thập ý kiến phản hồi để cải tiến chương trình đào tạo và dịch vụ hỗ trợ học tập." />
          </label>
          <div className="field-row">
            <label>
              Ngày bắt đầu
              <input type="date" defaultValue="2026-06-04" />
            </label>
            <label>
              Ngày kết thúc
              <input type="date" defaultValue="2026-06-20" />
            </label>
          </div>
          <div className="field-row">
            <label>
              Nhóm đối tượng
              <select defaultValue="student">
                <option value="student">Sinh viên</option>
                <option value="lecturer">Giảng viên</option>
                <option value="alumni">Cựu sinh viên</option>
                <option value="employer">Nhà tuyển dụng</option>
                <option value="all">Tất cả</option>
              </select>
            </label>
            <label>
              Trạng thái
              <select defaultValue="draft">
                <option value="draft">Bản nháp</option>
                <option value="published">Đang mở</option>
                <option value="closed">Đã đóng</option>
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="secondary-button">Lưu nháp</button>
            <button type="button" className="primary-button">Công bố khảo sát</button>
          </div>
        </form>
      </Panel>

      <Panel title="Câu hỏi khảo sát" action="Thêm câu hỏi">
        <div className="question-list">
          {questions.map((question, index) => (
            <article className="question-card" key={question.content}>
              <div className="question-index">{index + 1}</div>
              <div>
                <div className="card-meta">
                  <span className="code">{question.type}</span>
                  {question.required && <span className="status">Bắt buộc</span>}
                </div>
                <h3>{question.content}</h3>
                <p>Thứ tự hiển thị: {index + 1}</p>
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function SurveyResponse() {
  return (
    <div className="response-grid">
      <Panel title="Phiếu trả lời khảo sát">
        <form className="form-grid response-form">
          <div>
            <span className="status">Đang mở</span>
            <h2>Khảo sát mức độ hài lòng về chương trình đào tạo</h2>
            <p>Vui lòng hoàn thành các câu hỏi bắt buộc trước khi gửi phản hồi.</p>
          </div>
          <label>
            1. Mức độ hài lòng tổng thể
            <input type="range" min="1" max="5" defaultValue="4" />
          </label>
          <fieldset>
            <legend>2. Bạn hài lòng với nội dung nào?</legend>
            <label><input type="checkbox" defaultChecked /> Chương trình đào tạo</label>
            <label><input type="checkbox" defaultChecked /> Chất lượng giảng dạy</label>
            <label><input type="checkbox" /> Cơ sở vật chất</label>
          </fieldset>
          <label>
            3. Ý kiến góp ý
            <textarea defaultValue="Nên tăng thời lượng thực hành và bổ sung thêm học phần kỹ năng mềm." />
          </label>
          <button type="button" className="primary-button">Gửi phản hồi</button>
        </form>
      </Panel>

      <Panel title="Trạng thái thực hiện">
        <div className="timeline">
          {[
            ['Đã nhận khảo sát', '08:30'],
            ['Đã mở phiếu trả lời', '08:42'],
            ['Đã lưu câu trả lời tạm', '08:51'],
            ['Chờ gửi phản hồi', 'Hiện tại'],
          ].map(([label, time]) => (
            <div key={label}>
              <i />
              <strong>{label}</strong>
              <span>{time}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function UserManagement() {
  return (
    <Panel title="Quản lý người dùng" action="Thêm tài khoản">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Nhóm</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.email}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.group}</td>
                <td><span className="status">{user.status}</span></td>
                <td><button className="secondary-button small">Cập nhật</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function Reports() {
  return (
    <div className="grid-2 report-grid">
      <Panel title="Thống kê phản hồi">
        <div className="report-summary">
          <div className="donut" />
          <div>
            <strong>78%</strong>
            <span>Tỷ lệ hoàn thành trung bình</span>
          </div>
        </div>
        <div className="report-actions">
          <button className="primary-button">Xuất PDF</button>
          <button className="secondary-button">Xuất Excel</button>
          <button className="secondary-button">Lọc dữ liệu</button>
        </div>
      </Panel>

      <Panel title="Kết quả đầu ra">
        <div className="output-list">
          <InfoCard icon="dashboard" title="Dashboard" text="Theo dõi số lượng phản hồi và trạng thái khảo sát." />
          <InfoCard icon="chart" title="Biểu đồ" text="So sánh kết quả theo nhóm đối tượng và câu hỏi." />
          <InfoCard icon="report" title="Báo cáo" text="Tổng hợp dữ liệu để phục vụ đánh giá chất lượng đào tạo." />
        </div>
      </Panel>
    </div>
  )
}

function Metric({ icon, label, value, note }) {
  return (
    <article className="metric-card">
      <Icon name={icon} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  )
}

function Panel({ title, action, onAction, children }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
        {action && (
          <button className="secondary-button" onClick={onAction}>
            <Icon name="plus" />
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  )
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
  )
}

function Icon({ name }) {
  const paths = {
    dashboard: <path d="M4 5h7v7H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 14h7v5H4z" />,
    survey: <path d="M7 3h10l3 3v15H4V3h3zm9 1v4h4M8 10h8M8 14h8M8 18h5" />,
    edit: <path d="M4 20h4l11-11-4-4L4 16v4zm11-15 4 4" />,
    check: <path d="m4 12 5 5L20 6" />,
    users: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
    chart: <path d="M4 19V5M4 19h16M8 16V9M12 16V7M16 16v-4" />,
    report: <path d="M6 3h9l3 3v15H6V3zm8 0v5h4M9 13h6M9 17h6" />,
    question: <path d="M9 9a3 3 0 1 1 5 2.24c-1.2.8-2 1.24-2 2.76M12 18h.01" />,
    send: <path d="m22 2-7 20-4-9-9-4 20-7zM11 13l4-4" />,
    search: <path d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {paths[name] || paths.dashboard}
      </g>
    </svg>
  )
}

export default App
