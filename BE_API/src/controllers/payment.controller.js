const PaymentService = require('../services/payment.service');
const axios = require('axios');
const db = require('../config/db');

// Tạo thanh toán
exports.checkout = async (req, res) => {
    try {
        const { registrationId, gateway } = req.body; 

        // Lấy thông tin vé
        const regQuery = await db.query(
            `SELECT r.registration_id, r.payment_status, t.price_vnd, t.price_usd 
             FROM Registrations r
             JOIN Ticket_Configs t ON r.ticket_id = t.ticket_id
             WHERE r.registration_id = $1`, 
            [registrationId]
        );

        if (regQuery.rows.length === 0) return res.status(404).json({ message: "Registration not found" });
        const regData = regQuery.rows[0];

        // Kiểm tra nếu đã thanh toán rồi (PAID) thì chặn lại
        if (regData.payment_status === 'PAID') {
            return res.status(400).json({ 
                message: "Đơn hàng này đã được thanh toán thành công. Không thể thực hiện thanh toán lại." 
            });
        }

        // Logic chặn thanh toán vé miễn phí
        if (Number(regData.price_vnd) <= 0 || Number(regData.price_usd) <= 0) {
            return res.status(400).json({ 
                message: "Không thể thực hiện thanh toán cho vé miễn phí hoặc giá trị bằng 0." 
            });
        }

        let payUrl = '';
        if (gateway === 'MOMO') {
            payUrl = await PaymentService.createMomoPayment(registrationId, Number(regData.price_vnd));
        } else if (gateway === 'PAYPAL') {
            payUrl = await PaymentService.createPaypalOrder(registrationId, Number(regData.price_usd));
        } else {
            return res.status(400).json({ message: "Gateway not supported" });
        }

        res.status(200).json({ paymentUrl: payUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Checkout failed", error: error.message });
    }
};

// Xử lý Return URL từ cổng thanh toán
exports.handleReturn = async (req, res) => {
    try {
        // Tự động nhận diện Gateway dựa trên tham số trả về -- MoMo có partnerCode, PayPal có token
        let { gateway } = req.query;

        // Nếu không có biến gateway, tự động check tham số đặc trưng
        if (!gateway) {
            if (req.query.partnerCode) {
                gateway = 'momo'; // MoMo luôn trả về partnerCode
            } else if (req.query.token || req.query.PayerID) {
                gateway = 'paypal'; // PayPal luôn trả về token
            }
        }
        // ------------------------------------------------------------------

        console.log("Detecting Gateway:", gateway); // Log để debug xem nó nhận ra là gì
        let success = false;
        let regId = null;

        // --- PAYPAL RETURN HANDLER ---
        if (gateway === 'paypal') {
            const { token, PayerID, regId: rId } = req.query; 
            regId = rId;
            const captureData = await PaymentService.capturePaypalOrder(token);
            
            if (captureData.status === 'COMPLETED') {
                await db.query(
                    `UPDATE Transactions SET status = 'SUCCESS', gateway_transaction_id = $1, updated_at = NOW(), gateway_raw_response = $2 
                     WHERE registration_id = $3 AND payment_gateway = 'PAYPAL' AND status = 'PENDING'`,
                    [captureData.id, JSON.stringify(captureData), regId]
                );
                success = true;
            }
        
        // --- MOMO RETURN HANDLER ---
        } else if (gateway === 'momo') {
             const { resultCode, orderId } = req.query;
             if (!orderId) return res.send("<h1>Lỗi: Không tìm thấy mã đơn hàng</h1>");

             regId = orderId.split('_')[1]; // Lấy regId từ CONF_2_...

             // resultCode = 0 là thành công
             if (resultCode == 0) {
                 if (true) { 
                     // Update Transaction
                     await db.query(
                        `UPDATE Transactions SET status = 'SUCCESS', gateway_transaction_id = $1, updated_at = NOW(), gateway_raw_response = $2 
                         WHERE merchant_order_id = $3`,
                        [req.query.transId, JSON.stringify(req.query), orderId]
                    );
                    success = true;
                 }
             } else {
                 // Nếu thất bại
                 await db.query(`UPDATE Transactions SET status = 'FAILED' WHERE merchant_order_id = $1`, [orderId]);
                 return res.send(`<h1 style="color:red">Thanh toán thất bại hoặc bị hủy (Code: ${resultCode})</h1>`);
             }
        }

        // XỬ LÝ CHUNG KHI THÀNH CÔNG
        if (success && regId) {
            // Cập nhật payment_status='PAID' và registration_status='APPROVED'.
            await db.query(
                `UPDATE Registrations 
                 SET payment_status = 'PAID', 
                     registration_status = 'APPROVED'
                 WHERE registration_id = $1`, 
                [regId]
            );

            // Tự động gọi API post /checkin/qr-generate
            try {
                console.log(`Calling API to generate QR for RegID: ${regId}`);
                const baseUrl = 'http://localhost:3000';
                
                await axios.post(`${baseUrl}/checkin/qr-generate`, {
                    registration_id: Number(regId) 
                });

            } catch (err) {
                // Log chi tiết lỗi trả về từ server để debug chính xác hơn
                console.error("Auto call QR API failed:", err.message);
                if (err.response) {
                    console.error("Server response data:", err.response.data);
                }
            }

            if (gateway === 'paypal') {
                return res.send(`<h1>Thanh toán PayPal Thành công!</h1><p>Vé đã được gửi tới email của bạn. Bạn có thể đóng tab này.</p>`);
            } else {
                 return res.send(`
                    <h1 style="color:green">Thanh toán MoMo Thành công!</h1>
                    <p>Mã đơn hàng: ${req.query.orderId || 'N/A'}</p>
                    <p>Vé đã được gửi tới email của bạn.</p>
                `);
            }
        }

        res.send(`<h1>Invalid Gateway or Payment Failed. Params received: ${JSON.stringify(req.query)}</h1>`);

    } catch (error) {
        console.error("Return Error", error);
        res.status(500).send("<h3>Có lỗi xảy ra trong quá trình xử lý thanh toán. Check Console log server.</h3>");
    }
};

// Lấy danh sách giao dịch
exports.getTransactions = async (req, res) => {
    try {
        const result = await db.query(`SELECT * FROM Transactions ORDER BY created_at DESC`);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Thống kê giao dịch
exports.auditPayments = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT transaction_type, status, COUNT(*) as count, SUM(amount) as total_amount 
            FROM Transactions 
            GROUP BY transaction_type, status
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Yêu cầu xuất hóa đơn
exports.requestInvoice = async (req, res) => {
    try {
        const { registrationId, companyName, taxCode, address, emailReceive } = req.body;

        const result = await PaymentService.createInvoiceRequest({
            registrationId, companyName, taxCode, address, emailReceive
        });
        res.status(200).json({ message: "Đã ghi nhận yêu cầu xuất hóa đơn.", invoiceId: result.invoice_id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi khi yêu cầu hóa đơn", error: error.message });
    }
};

// Gửi hóa đơn VAT
exports.sendInvoice = async (req, res) => {
    try {
        const { invoiceId, invoiceUrl } = req.body; // Admin cung cấp link PDF đã xuất
        const result = await PaymentService.sendInvoiceToUser(invoiceId, invoiceUrl);
        res.status(200).json({ message: "Đã gửi hóa đơn thành công.", sent_at: result.sent_at });
    } catch (error) {
        res.status(500).json({ message: "Gửi hóa đơn thất bại", error: error.message });
    }
};

// Xử lý hoàn tiền
exports.refund = async (req, res) => {
    try {
        // [UPDATED] Không nhận amount từ request body nữa
        const { registrationId, reason } = req.body;
        
        const result = await PaymentService.processRefund(registrationId, reason);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: "Refund failed", error: error.message });
    }
};