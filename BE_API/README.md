## Backend API Setup

### Prerequisites

* Node.js (khuyến nghị v16+)
* npm

### Install Dependencies

Di chuyển vào thư mục **BE_API**, sau đó chạy lệnh sau trong Command Prompt / Terminal để cài đặt các thư viện cần thiết:

```bash
npm install bcrypt dotenv express handlebars jsonwebtoken nodemailer nodemon pg qrcode swagger-jsdoc swagger-ui-express uuid pdfkit exceljs
```

### Installed Libraries Overview

* **bcrypt**: Mã hóa mật khẩu
* **dotenv**: Quản lý biến môi trường
* **express**: Framework backend Node.js
* **handlebars**: Template engine
* **jsonwebtoken**: Xác thực JWT
* **nodemailer**: Gửi email
* **nodemon**: Tự động restart server khi code thay đổi
* **pg**: Kết nối PostgreSQL
* **qrcode**: Sinh mã QR
* **swagger-jsdoc**, **swagger-ui-express**: Tài liệu hóa API (Swagger)
* **uuid**: Sinh ID duy nhất
* **pdfkit**: Tạo file PDF
* **exceljs**: Xuất file Excel
