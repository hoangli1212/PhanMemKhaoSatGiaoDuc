# Thiết kế cơ sở dữ liệu tối giản hệ thống khảo sát giáo dục

## 1. Mục tiêu thiết kế

Cơ sở dữ liệu được rút gọn để hệ thống dễ triển khai hơn nhưng vẫn đáp ứng luồng chính:

- Người dùng đăng nhập theo vai trò.
- Người tạo khảo sát tạo khảo sát.
- Người tạo khảo sát thêm câu hỏi và phương án trả lời.
- Người tham gia gửi phản hồi.
- Hệ thống thống kê kết quả trực tiếp từ dữ liệu phản hồi.

## 2. Các bảng được giữ lại

| Bảng | Chức năng |
| --- | --- |
| `users` | Lưu tài khoản, vai trò và nhóm đối tượng của người dùng. |
| `surveys` | Lưu thông tin khảo sát, người tạo, nhóm đối tượng, thời gian và trạng thái. |
| `questions` | Lưu câu hỏi thuộc từng khảo sát. |
| `question_options` | Lưu phương án trả lời cho câu hỏi trắc nghiệm hoặc nhiều lựa chọn. |
| `responses` | Lưu một lượt gửi phản hồi của người tham gia. |
| `answers` | Lưu chi tiết câu trả lời cho từng câu hỏi. |

## 3. Các bảng đã bỏ để đơn giản hệ thống

| Bảng cũ | Lý do bỏ |
| --- | --- |
| `roles` | Vai trò được lưu trực tiếp bằng trường `role` trong bảng `users`. |
| `user_roles` | Hệ thống đơn giản, mỗi người dùng chỉ cần một vai trò chính. |
| `stakeholder_groups` | Nhóm đối tượng được lưu bằng enum `stakeholder_group` trong bảng `users`. |
| `survey_target_groups` | Mỗi khảo sát chọn một nhóm đối tượng chính qua `target_group`. |
| `question_bank` | Câu hỏi gắn trực tiếp vào khảo sát, chưa cần ngân hàng câu hỏi dùng lại. |
| `survey_questions` | Không cần bảng trung gian vì câu hỏi thuộc trực tiếp một khảo sát. |
| `survey_invitations` | Chưa cần quản lý token/lời mời chi tiết ở phiên bản đơn giản. |
| `reports` | Báo cáo có thể sinh trực tiếp từ dữ liệu phản hồi, chưa cần lưu lịch sử file báo cáo. |

## 4. Quan hệ dữ liệu

- Một `user` có thể tạo nhiều `surveys`.
- Một `survey` có nhiều `questions`.
- Một `question` có nhiều `question_options`.
- Một `survey` có nhiều `responses`.
- Một `response` có nhiều `answers`.
- Một `answer` liên kết đến một `question` và có thể liên kết đến một `question_option`.

## 5. Mô tả bảng chính

### `users`

Lưu thông tin tài khoản và quyền sử dụng hệ thống.

Trường chính:

- `id`: khóa chính.
- `full_name`: họ tên người dùng.
- `email`: email đăng nhập.
- `password_hash`: mật khẩu đã mã hóa.
- `role`: vai trò gồm `admin`, `survey_creator`, `respondent`.
- `stakeholder_group`: nhóm đối tượng gồm `student`, `lecturer`, `alumni`, `employer`, `staff`.
- `status`: trạng thái tài khoản gồm `active`, `locked`.

### `surveys`

Lưu thông tin khảo sát.

Trường chính:

- `id`: khóa chính.
- `title`: tên khảo sát.
- `description`: mô tả khảo sát.
- `creator_id`: người tạo khảo sát.
- `target_group`: nhóm đối tượng khảo sát.
- `start_date`, `end_date`: thời gian khảo sát.
- `status`: trạng thái gồm `draft`, `published`, `closed`.

### `questions`

Lưu các câu hỏi thuộc một khảo sát.

Trường chính:

- `id`: khóa chính.
- `survey_id`: khảo sát chứa câu hỏi.
- `content`: nội dung câu hỏi.
- `question_type`: loại câu hỏi gồm `single_choice`, `multiple_choice`, `rating`, `text`.
- `is_required`: câu hỏi có bắt buộc hay không.
- `sort_order`: thứ tự hiển thị.

### `responses` và `answers`

`responses` lưu một lần gửi phản hồi.  
`answers` lưu chi tiết từng câu trả lời.

Cách lưu theo loại câu hỏi:

- Trắc nghiệm một lựa chọn: lưu `option_id`.
- Nhiều lựa chọn: lưu nhiều dòng `answers` cho cùng một câu hỏi.
- Tự luận: lưu `answer_text`.
- Thang điểm: lưu `rating_value`.

## 6. Quy trình dữ liệu chính

1. Admin hoặc cán bộ khảo sát được tạo trong bảng `users`.
2. Người tạo khảo sát tạo bản ghi trong `surveys`.
3. Người tạo khảo sát thêm câu hỏi vào `questions`.
4. Nếu câu hỏi có lựa chọn, hệ thống lưu phương án trong `question_options`.
5. Người tham gia gửi phản hồi, hệ thống tạo bản ghi trong `responses`.
6. Câu trả lời chi tiết được lưu trong `answers`.
7. Dashboard và báo cáo thống kê được tính trực tiếp từ `responses` và `answers`.

## 7. File triển khai

File SQL tạo cơ sở dữ liệu: `database/schema.sql`.

Thiết kế này phù hợp cho giai đoạn đầu của đề tài vì ít bảng, dễ code API và vẫn đủ chức năng cốt lõi.
