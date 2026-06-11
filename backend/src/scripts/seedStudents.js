import 'dotenv/config'

import bcrypt from 'bcryptjs'

import pool from '../config/db.js'

const students = [
  ['2051220175', 'Hoàng Trần Đức', 'Hiếu', '20CT3', '14/04/2002'],
  ['2251220149', 'Lê Vũ', 'Hoàng', '22CT1', '09/08/2004'],
  ['2251220138', 'Nguyễn Huy', 'Hoàng', '22CT3', '01/08/2004'],
  ['2251220128', 'Nguyễn Vũ Đình', 'Huy', '22CT3', '19/04/2004'],
  ['2051220108', 'Lê Nhật', 'Khánh', '21CT1', '28/10/2002'],
  ['2251220014', 'Trần Thế', 'Kiệt', '22CT1', '04/07/2004'],
  ['2251220203', 'Lê Kim', 'Long', '22CT5', '25/02/2004'],
  ['2251220144', 'Lý Thành', 'Long', '22CT3', '13/10/2004'],
  ['2151220014', 'Nguyễn Võ Trung', 'Nghĩa', '21CT1', '15/09/2003'],
  ['2251220237', 'Võ Huy', 'Nghĩa', '22CT5', '05/07/2004'],
  ['2251220110', 'Nguyễn Phước', 'Tâm', '22CT3', '07/10/2004'],
  ['2251220020', 'Nguyễn Hữu', 'Tình', '22CT1', '20/10/2004'],
  ['2251220199', 'Trần Đình', 'Tú', '22CT1', '17/05/2004'],
  ['2251220059', 'Lê Tuấn', 'Anh', '22CT2', '05/08/2004'],
  ['2251220082', 'Ngô Thúy', 'Duyên', '22CT2', '23/10/2004'],
  ['2251220064', 'Nguyễn Ngọc Gia', 'Hào', '22CT2', '04/06/2004'],
  ['2251220056', 'Phan Minh', 'Hậu', '22CT2', '27/01/2004'],
  ['2251220259', 'Nguyễn Lê Quốc', 'Huy', '22CT2', '04/10/2004'],
  ['2251220092', 'Lê Duy', 'Khánh', '22CT2', '18/01/2004'],
  ['2251220055', 'Nguyễn Thị Thảo', 'Lan', '22CT2', '10/01/2004'],
  ['2251220256', 'Nguyễn Công', 'Lợi', '22CT2', '01/02/2004'],
  ['2251220054', 'Phạm Nguyễn Hoài', 'Nhân', '22CT2', '10/02/2004'],
  ['2251220255', 'Nguyễn Đức', 'Phát', '22CT2', '28/04/2003'],
  ['2251220071', 'Nguyễn Nhật', 'Tiến', '22CT2', '04/08/2004'],
  ['2251220086', 'Lê Toàn', 'Trung', '22CT2', '16/04/1999'],
  ['2251220085', 'Nguyễn Chí', 'Trung', '22CT2', '29/02/2004'],
  ['2251220068', 'Lê Quốc', 'Việt', '22CT2', '07/06/2004'],
  ['2251220261', 'Đặng Văn', 'Đại', '22CT2', '27/08/2004'],
  ['2151220088', 'Hồ Minh', 'Đạt', '21CT2', '03/04/2003'],
  ['2251220214', 'Hồ Văn', 'Diện', '22CT5', '24/12/2004'],
  ['2251220124', 'Phạm', 'Duy', '22CT3', '20/09/2003'],
  ['2251220104', 'Trần Bá', 'Hậu', '22CT3', '19/02/2004'],
  ['2251220239', 'Trần Việt', 'Huy', '22CT5', '16/06/2004'],
  ['2151220140', 'Nguyễn Hữu', 'Lộc', '21CT3', '23/07/2003'],
  ['2251220078', 'Đặng Hữu', 'Tài', '22CT2', '20/12/2004'],
  ['2251220113', 'Võ Xuân', 'Thắng', '22CT3', '29/06/2004'],
  ['2151220126', 'Phạm Văn', 'Thiết', '21CT3', '15/11/2003'],
  ['2251220262', 'Đặng Minh', 'Tư', '22CT3', '27/11/2004'],
  ['2251220254', 'Nguyễn Văn', 'Tùng', '22CT5', '16/06/2004'],
  ['2251220192', 'Đỗ Quốc', 'Đạt', '22CT4', '27/02/2004'],
  ['2251220178', 'Phan Khánh', 'Đức', '22CT4', '10/02/2004'],
  ['2251220277', 'Trương Phi', 'Hoàng', '22CT4', '01/01/2004'],
  ['2251220153', 'Trần Kim', 'Liên', '22CT4', '31/07/2004'],
  ['2251220188', 'Nguyễn Lê Như', 'Ngọc', '22CT4', '30/05/2003'],
  ['2251220172', 'Nguyễn Bá', 'Quân', '22CT4', '02/03/2004'],
  ['2251220161', 'Nguyễn Ngọc', 'Quyền', '22CT4', '24/01/2004'],
  ['2251220279', 'Mai Ngọc', 'Sơn', '22CT4', '24/07/2004'],
  ['2251220183', 'Phạm Nhân', 'Tài', '22CT4', '06/12/2004'],
  ['2251220058', 'Lê Ngọc', 'Tiến', '22CT2', '07/07/2004'],
  ['2251220176', 'Từ Nguyễn Huyền', 'Trang', '22CT4', '26/08/2004'],
  ['2251220196', 'Nguyễn Ngọc Bảo', 'Trúc', '22CT4', '29/03/2004'],
  ['2251220274', 'Nguyễn Văn', 'Tuấn', '22CT4', '27/02/2004'],
  ['2251220273', 'Đặng Thành', 'Đạt', '22CT4', '17/01/2003'],
  ['2251220022', 'Nguyễn Tiến', 'Đạt', '22CT1', '19/05/2004'],
  ['2251220019', 'Nguyễn Khoa', 'Điềm', '22CT1', '01/06/2003'],
  ['2251220197', 'Lê Thuận', 'Dương', '22CT4', '16/11/2004'],
  ['2151220289', 'Nguyễn Lê Bảo', 'Duy', '23CT6', '06/10/2003'],
  ['2251220184', 'Hà Công', 'Hiệp', '22CT4', '31/03/2004'],
  ['2251220193', 'Hoàng Minh', 'Hòa', '22CT4', '07/11/2004'],
  ['2251220036', 'Võ Nhật', 'Nam', '22CT1', '23/01/2004'],
  ['2251220181', 'Võ Đình', 'Ngưu', '22CT4', '24/10/2004'],
  ['2251220046', 'Trần Quốc', 'Nhật', '22CT1', '30/09/2004'],
  ['2251220160', 'Võ Minh', 'Nhật', '22CT4', '01/06/2004'],
  ['2251220033', 'Nguyễn Duy', 'Quý', '22CT1', '18/12/2004'],
  ['2251220025', 'Lê Chí', 'Thanh', '22CT1', '07/10/2004'],
  ['2251220263', 'Trần Đức', 'Thông', '22CT3', '07/01/2004'],
  ['2251220030', 'Trương Quốc', 'Trung', '22CT1', '22/07/2004'],
  ['2251220073', 'Lê Minh', 'Hiếu', '22CT2', '04/08/2004'],
  ['2251220098', 'Nguyễn Thanh', 'Hiếu', '22CT2', '27/07/2004'],
  ['2251220051', 'Nguyễn Thanh', 'Hoài', '22CT2', '23/05/2004'],
  ['2251220258', 'Ung Hoàng', 'Khang', '22CT2', '08/07/2004'],
  ['2251220043', 'Nguyễn Tăng Vân', 'Long', '22CT1', '09/08/2004'],
  ['2251220072', 'Nguyễn Hồng', 'Phúc', '22CT2', '23/02/2004'],
  ['2251220061', 'Nguyễn Thanh', 'Phước', '22CT2', '03/10/2004'],
  ['2251220093', 'Nguyễn Quang', 'Sáng', '22CT2', '26/03/2004'],
  ['2251220034', 'Lê Tấn', 'Thống', '22CT1', '05/06/2004'],
  ['2251220057', 'Văn Mai Chính', 'Trung', '22CT2', '20/01/2004'],
  ['2251220066', 'Nguyễn Đặng Như', 'Vũ', '22CT2', '20/04/2004'],
  ['2251220031', 'Nguyễn Ngọc', 'Dũng', '22CT1', '15/01/2004'],
  ['2251220108', 'Võ Trọng', 'Hiếu', '22CT3', '25/04/2004'],
  ['2251220010', 'Trương Công', 'Lên', '22CT1', '10/05/2004'],
  ['2251220127', 'Chung Văn', 'Long', '22CT3', '21/11/2004'],
  ['2251220023', 'Hoàng Ngọc', 'Tuệ', '22CT1', '13/01/2004'],
  ['2251220162', 'Trần Khánh', 'Duy', '22CT4', '21/04/2004'],
  ['2251220223', 'Nguyễn Phan Phú', 'Hoàng', '22CT5', '02/08/2004'],
  ['2251220180', 'Đoàn Mạnh', 'Hùng', '22CT4', '17/04/2004'],
  ['2251220282', 'Nguyễn Bùi Quốc', 'Khánh', '22CT5', '02/09/2004'],
  ['2251220242', 'Bùi Nhật', 'Lâm', '22CT5', '19/06/2004'],
  ['2251220175', 'Trần Văn', 'Long', '22CT4', '13/11/2004'],
  ['2251220288', 'Cao Phước', 'Nguyên', '22CT5', '22/06/2004'],
  ['2251220218', 'Nguyễn Thị Yến', 'Nhi', '22CT5', '29/08/2004'],
  ['2251220227', 'Hồ Lê Ngọc', 'Phú', '22CT5', '18/09/2004'],
  ['2251220230', 'Văn Quý Duy', 'Sang', '22CT5', '01/02/2003'],
  ['2251220244', 'Nguyễn Thị Minh', 'Tân', '22CT5', '31/08/2004'],
  ['2251220229', 'Nguyễn Đình', 'Thao', '22CT5', '20/12/2004'],
  ['2251220210', 'Đặng Văn Minh', 'Thịnh', '22CT5', '11/11/2004'],
  ['2251220272', 'Nguyễn Văn', 'Thương', '22CT4', '21/11/2003'],
  ['2251220243', 'Cao Lệ', 'Thủy', '22CT5', '13/08/2004'],
]

async function seedStudents() {
  let insertedOrUpdated = 0

  for (const [studentCode, lastName, firstName, className, birthDate] of students) {
    const fullName = `${lastName} ${firstName}`
    const passwordHash = await bcrypt.hash(birthDate, 10)

    await pool.execute(
      `INSERT INTO users
        (student_code, full_name, class_name, email, password_hash, role, stakeholder_group, status)
       VALUES
        (:student_code, :full_name, :class_name, :email, :password_hash, 'student', 'student', 'active')
       ON DUPLICATE KEY UPDATE
        full_name = VALUES(full_name),
        class_name = VALUES(class_name),
        password_hash = VALUES(password_hash),
        role = 'student',
        stakeholder_group = 'student',
        status = 'active'`,
      {
        student_code: studentCode,
        full_name: fullName,
        class_name: className,
        email: `${studentCode}@student.local`,
        password_hash: passwordHash,
      },
    )

    insertedOrUpdated += 1
  }

  console.log(`Seeded ${insertedOrUpdated} students.`)
}

seedStudents()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
