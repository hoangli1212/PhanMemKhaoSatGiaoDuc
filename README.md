# Phần Mềm Khảo Sát Giáo Dục

Hệ thống khảo sát lấy ý kiến các bên liên quan trong lĩnh vực giáo dục. Đồ án gồm Backend sử dụng ExpressJS, cơ sở dữ liệu MySQL và Frontend sử dụng ReactJS.

## Chức năng chính

* Đăng nhập theo vai trò: Quản trị viên, Người tạo khảo sát, Sinh viên.
* Quản lý người dùng, hỗ trợ import danh sách sinh viên từ file Excel.
* Quản lý khảo sát, câu hỏi với nhiều loại câu hỏi tương tự Google Forms.
* Sinh viên nhận thông báo khi có khảo sát mới và gửi câu trả lời trực tuyến.
* Thống kê kết quả khảo sát, theo dõi danh sách đã hoàn thành và chưa hoàn thành.
* Xuất báo cáo PDF hoặc Excel theo từng khảo sát.
* Ghi nhật ký thao tác quản trị để truy vết các hoạt động tạo, sửa, xóa dữ liệu.

## Công nghệ sử dụng

* **Frontend:** ReactJS, Vite.
* **Backend:** Node.js, ExpressJS.
* **Database:** MySQL/MariaDB chạy trên XAMPP.
* **Xác thực:** JWT (JSON Web Token).

## Cấu trúc thư mục

```text
PhanMemKhaoSatGiaoDuc/
├── backend/      # API ExpressJS
├── database/     # File SQL và tài liệu thiết kế cơ sở dữ liệu
├── frontend/     # Giao diện ReactJS
└── README.md
```

## Yêu cầu cài đặt

* Node.js phiên bản 18 trở lên.
* XAMPP đã bật Apache và MySQL.
* Git (nếu muốn clone hoặc push mã nguồn).

## Cài đặt cơ sở dữ liệu

### Bước 1: Khởi động MySQL

Mở XAMPP và bật dịch vụ **MySQL**.

### Bước 2: Tạo cơ sở dữ liệu

Truy cập phpMyAdmin hoặc MySQL Command Line và thực hiện lệnh:

```sql
CREATE DATABASE edu_survey
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

### Bước 3: Import dữ liệu

Import các file SQL trong thư mục `database` theo thứ tự sau:

1. `database/schema.sql`
2. `database/add_student_login_fields.sql`
3. `database/add_audit_logs.sql`
4. `database/update_login_seed_passwords.sql`

## Chạy Backend

Mở Terminal và thực hiện:

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Backend mặc định chạy tại:

```text
http://127.0.0.1:3000
```

### Cấu hình môi trường (.env)

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=edu_survey
JWT_SECRET=your_secret_key
PORT=3000
```

### Tạo dữ liệu mẫu sinh viên

Nếu muốn thêm nhanh danh sách sinh viên mẫu:

```bash
npm run seed:students
```

## Chạy Frontend

Mở một Terminal khác và thực hiện:

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Frontend mặc định chạy tại:

```text
http://127.0.0.1:5173
```

Nếu Backend chạy ở địa chỉ khác, tạo file `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:3000/api
```

## Tài khoản demo

### Quản trị viên (Admin)

* Email/Tên đăng nhập: `admin@example.com`
* Mật khẩu: `123456`

### Người tạo khảo sát (Survey Creator)

* Email/Tên đăng nhập: `creator@example.com`
* Mật khẩu: `123456`

### Sinh viên

* Tên đăng nhập: Mã sinh viên.
* Mật khẩu mặc định: Ngày sinh theo định dạng `dd/mm/yyyy`.

Ví dụ:

```text
Tên đăng nhập: 2251220277
Mật khẩu: 01/01/2004
```

## Kiểm tra hệ thống

### Kiểm tra Frontend

```bash
cd frontend
npm run lint
npm run build
```

### Kiểm tra Backend

```bash
cd backend
npm run check
```

## Hướng dẫn import sinh viên

File Excel cần có các cột sau:

```text
student_code | last_name | first_name | class_name | date_of_birth
```

Ví dụ:

```text
2251220277 | Trương Phi | Hoàng | 22CT4 | 01/01/2004
```

Sau khi import:

* `student_code` được sử dụng làm tên đăng nhập.
* `date_of_birth` được sử dụng làm mật khẩu mặc định.
* Vai trò mặc định của tài khoản là `student`.
