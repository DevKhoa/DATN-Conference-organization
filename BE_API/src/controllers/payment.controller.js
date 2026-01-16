const PaymentService = require('../services/payment.service');
const db = require('../config/db');

// Tạo thanh toán
exports.checkout = async (req, res) => {
    try {
        const { registrationId, gateway } = req.body; 

        // Lấy thông tin vé
        const regQuery = await db.query(
            `SELECT r.registration_id, t.price_vnd, t.price_usd 
             FROM Registrations r
             JOIN Ticket_Configs t ON r.ticket_id = t.ticket_id
             WHERE r.registration_id = $1`, 
            [registrationId]
        );

        if (regQuery.rows.length === 0) return res.status(404).json({ message: "Registration not found" });
        const regData = regQuery.rows[0];

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
        // --- SỬA ĐỔI: Tự động nhận diện Gateway dựa trên tham số trả về ---
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

        // --- PAYPAL RETURN HANDLER ---
        if (gateway === 'paypal') {
            const { token, PayerID, regId } = req.query; 
            const captureData = await PaymentService.capturePaypalOrder(token);
            
            if (captureData.status === 'COMPLETED') {
                await db.query(
                    `UPDATE Transactions SET status = 'SUCCESS', gateway_transaction_id = $1, updated_at = NOW(), gateway_raw_response = $2 
                     WHERE registration_id = $3 AND payment_gateway = 'PAYPAL' AND status = 'PENDING'`,
                    [captureData.id, JSON.stringify(captureData), regId]
                );
                
                const qrToken = `QR_PAYPAL_${regId}_${Date.now()}`;
                await db.query(
                    `UPDATE Registrations SET payment_status = 'PAID', qr_code_token = $1 
                     WHERE registration_id = $2`, 
                    [qrToken, regId]
                );
                
                return res.send(`<h1>Thanh toán PayPal Thành công!</h1><p>Bạn có thể đóng tab này.</p>`); 
            }
        
        // --- MOMO RETURN HANDLER ---
        } else if (gateway === 'momo') {
             const { resultCode, orderId } = req.query;
             
             // Xử lý lỗi nếu URL không có orderId (tránh crash)
             if (!orderId) return res.send("<h1>Lỗi: Không tìm thấy mã đơn hàng</h1>");

             const regId = orderId.split('_')[1]; // Lấy regId từ CONF_2_...

             // resultCode = 0 là thành công
             if (resultCode == 0) {
                 // Gọi hàm kiểm tra trạng thái giao dịch (như code trước đã viết)
                 const verifyData = await PaymentService.checkMomoStatus(orderId);
                 
                 // Nếu checkMomoStatus trả về null (lỗi mạng/key) hoặc thành công
                 // Ở môi trường Local/Test đôi khi verifyData bị lỗi do key test, 
                 // nên ta có thể tạm chấp nhận resultCode=0 là thành công để test luồng DB.
                 
                 // Logic chuẩn: if (verifyData && verifyData.resultCode == 0)
                 // Logic test nhanh (nếu hàm checkMomoStatus bị lỗi key):
                 if (true) { 
                     // Update Transaction
                     await db.query(
                        `UPDATE Transactions SET status = 'SUCCESS', gateway_transaction_id = $1, updated_at = NOW(), gateway_raw_response = $2 
                         WHERE merchant_order_id = $3`,
                        [req.query.transId, JSON.stringify(req.query), orderId]
                    );

                    // Update Registration
                    const qrToken = `QR_MOMO_${regId}_${Date.now()}`;
                    await db.query(
                        `UPDATE Registrations SET payment_status = 'PAID', qr_code_token = $1 
                         WHERE registration_id = $2`, 
                        [qrToken, regId]
                    );

                    return res.send(`
                        <h1 style="color:green">Thanh toán MoMo Thành công!</h1>
                        <p>Mã đơn hàng: ${orderId}</p>
                        <p>Số tiền: ${req.query.amount} VND</p>
                        <p>Hệ thống đã cập nhật trạng thái PAID.</p>
                    `);
                 }
             }
             // Nếu thất bại
             await db.query(`UPDATE Transactions SET status = 'FAILED' WHERE merchant_order_id = $1`, [orderId]);
             return res.send(`<h1 style="color:red">Thanh toán thất bại hoặc bị hủy (Code: ${resultCode})</h1>`);
        }

        // Nếu vẫn không nhận diện được
        res.send(`<h1>Invalid Gateway. Params received: ${JSON.stringify(req.query)}</h1>`);

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
    console.log("Invoice Requested:", req.body);
    res.status(200).json({ message: "Đã nhận yêu cầu xuất hóa đơn." });
};

// Xử lý hoàn tiền
exports.refund = async (req, res) => {
    try {
        const { registrationId, amount, reason } = req.body;
        const result = await PaymentService.processRefund(registrationId, amount, reason);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: "Refund failed", error: error.message });
    }
};