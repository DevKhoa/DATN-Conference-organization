const axios = require('axios');
const crypto = require('crypto');
const db = require('../config/db');
const emailSender = require('../utils/emailService'); 
require('dotenv').config();

// Helper: Lấy PayPal Access Token
const getPaypalAccessToken = async () => {
    const auth = Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');
    
    const response = await axios.post(
        `${process.env.PAYPAL_API_URL}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        }
    );
    return response.data.access_token;
};

class PaymentService {
    // Tạo PayPal Order
    async createPaypalOrder(registrationId, amountUSD) {
        const accessToken = await getPaypalAccessToken();
        const orderId = `CONF_${registrationId}_${Date.now()}`; 

        const orderData = {
            intent: 'CAPTURE',
            purchase_units: [{
                reference_id: orderId,
                amount: { currency_code: 'USD', value: amountUSD.toFixed(2) },
                description: `Payment for Registration ID: ${registrationId}`
            }],
            application_context: {
                // Return URL trỏ về API backend
                return_url: `${process.env.BASE_URL}/payments/paypal-return?regId=${registrationId}`,
                cancel_url: `${process.env.BASE_URL}/payments/paypal-cancel`
            }
        };

        const response = await axios.post(
            `${process.env.PAYPAL_API_URL}/v2/checkout/orders`,
            orderData,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        // Lưu transaction PENDING
        await db.query(
            `INSERT INTO Transactions (registration_id, transaction_type, payment_gateway, merchant_order_id, gateway_transaction_id, amount, currency, status, gateway_raw_response)
             VALUES ($1, 'PAYMENT', 'PAYPAL', $2, $3, $4, 'USD', 'PENDING', $5)`,
            [registrationId, orderId, response.data.id, amountUSD, JSON.stringify(response.data)]
        );

        return response.data.links.find(link => link.rel === 'approve').href;
    }

    // Capture PayPal Order sau khi user return
    async capturePaypalOrder(gatewayOrderId) {
        const accessToken = await getPaypalAccessToken();
        // Capture là bước xác nhận tiền đã trừ thành công
        const response = await axios.post(
            `${process.env.PAYPAL_API_URL}/v2/checkout/orders/${gatewayOrderId}/capture`,
            {},
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        return response.data;
    }

    // Tạo yêu cầu thanh toán MoMo
    async createMomoPayment(registrationId, amountVND) {
        const partnerCode = process.env.MOMO_PARTNER_CODE;
        const accessKey = process.env.MOMO_ACCESS_KEY;
        const secretKey = process.env.MOMO_SECRET_KEY;
        const orderId = `CONF_${registrationId}_${new Date().getTime()}`;
        const requestId = orderId;
        const redirectUrl = `${process.env.BASE_URL}/payments/momo-return`;
        const ipnUrl = `${process.env.BASE_URL}/payments/momo-return`;
        const orderInfo = `Pay for Conference Registration ${registrationId}`;
        const requestType = "captureWallet";
        const extraData = ""; 
        
        const rawSignature = `accessKey=${accessKey}&amount=${amountVND}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
        const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

        const requestBody = {
            partnerCode, partnerName: "Conference System", storeId: "MomoTestStore",
            requestId, amount: amountVND, orderId, orderInfo, redirectUrl, ipnUrl,
            lang: "vi", requestType, autoCapture: true, extraData, signature
        };

        try {
            const response = await axios.post(process.env.MOMO_ENDPOINT, requestBody);
            
            await db.query(
                `INSERT INTO Transactions (registration_id, transaction_type, payment_gateway, merchant_order_id, amount, currency, status, gateway_raw_response)
                 VALUES ($1, 'PAYMENT', 'MOMO', $2, $3, 'VND', 'PENDING', $4)`,
                [registrationId, orderId, amountVND, JSON.stringify(response.data)]
            );

            return response.data.payUrl;
        } catch (error) {
            console.error("Momo Create Error:", error.response?.data || error.message);
            throw new Error("Momo creation failed");
        }
    }

    // Kiểm tra trạng thái giao dịch MoMo (dùng khi user return)
    async checkMomoStatus(orderId) {
        const partnerCode = process.env.MOMO_PARTNER_CODE;
        const accessKey = process.env.MOMO_ACCESS_KEY;
        const secretKey = process.env.MOMO_SECRET_KEY;
        const requestId = `QUERY_${Date.now()}`;
        
        const rawSignature = `accessKey=${accessKey}&orderId=${orderId}&partnerCode=${partnerCode}&requestId=${requestId}`;
        const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

        const requestBody = {
            partnerCode, requestId, orderId, signature, lang: "vi"
        };

        try {
            // Gọi API queryStatus của MoMo
            const response = await axios.post("https://test-payment.momo.vn/v2/gateway/api/query", requestBody);
            return response.data; // Chứa resultCode (0 = thành công)
        } catch (error) {
            console.error("Momo Query Error:", error.message);
            return null;
        }
    }

    // Xử lý hoàn tiền
    async processRefund(registrationId, reason) {
        // Lấy thông tin Registration để check Status
        const regCheck = await db.query(
        `SELECT r.registration_status, r.payment_status, r.user_id, u.email, u.full_name, c.conf_name 
         FROM Registrations r
         JOIN Users u ON r.user_id = u.user_id
         JOIN Ticket_Configs t ON r.ticket_id = t.ticket_id
         JOIN Conferences c ON t.conference_id = c.conf_id  -- Đã sửa: t.conf_id -> t.conference_id
         WHERE r.registration_id = $1`,
        [registrationId]
    );

        if (regCheck.rows.length === 0) throw new Error("Registration not found");
        const regInfo = regCheck.rows[0];

        // Chỉ refund nếu đơn đã bị Hủy (CANCELLED)
        if (regInfo.registration_status !== 'CANCELLED') {
             throw new Error("Chỉ được hoàn tiền cho các đơn đăng ký đã hủy!");
        }
        // Chỉ refund nếu đơn đã Thanh toán (PAID)
        if (regInfo.payment_status !== 'PAID') {
            if (regInfo.payment_status === 'REFUNDED') {
                throw new Error("Đơn này đã được hoàn tiền trước đó. Không thể hoàn tiền lần 2.");
            }
            throw new Error("Đơn chưa được thanh toán nên không thể hoàn tiền!");
        }

        // Tìm giao dịch thanh toán thành công gần nhất
        const transResult = await db.query(
            `SELECT * FROM Transactions WHERE registration_id = $1 AND status = 'SUCCESS' AND transaction_type = 'PAYMENT' ORDER BY created_at DESC LIMIT 1`,
            [registrationId]
        );

        if (transResult.rows.length === 0) throw new Error("No success transaction found to refund");
        const trans = transResult.rows[0];

        // Lấy số tiền từ giao dịch gốc để refund đúng số đó
        const amount = Number(trans.amount);

        let refundResponse;
        let refundStatus = 'PENDING';

        if (trans.payment_gateway === 'PAYPAL') {
            const raw = trans.gateway_raw_response; 
            const captureId = raw.purchase_units?.[0]?.payments?.captures?.[0]?.id || raw.id; // raw.id nếu lưu kết quả capture
            
            if(!captureId) throw new Error("Cannot find PayPal capture ID");

            const accessToken = await getPaypalAccessToken();
            try {
                const res = await axios.post(
                    `${process.env.PAYPAL_API_URL}/v2/payments/captures/${captureId}/refund`,
                    { amount: { value: amount.toString(), currency_code: 'USD' }, note_to_payer: reason },
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                refundResponse = res.data;
                refundStatus = 'REFUNDED'; // PayPal thành công ngay
            } catch (e) {
                refundStatus = 'FAILED';
                refundResponse = e.response?.data;
            }

        } else if (trans.payment_gateway === 'MOMO') {
            const partnerCode = process.env.MOMO_PARTNER_CODE;
            const accessKey = process.env.MOMO_ACCESS_KEY;
            const secretKey = process.env.MOMO_SECRET_KEY;
            const orderId = `REFUND_${registrationId}_${Date.now()}`;
            const requestId = orderId;
            
            // trans.gateway_transaction_id là MoMo transId lưu lúc thanh toán thành công
            const transId = trans.gateway_transaction_id; 
            
            // Tạo rawSig với amount là số nguyên
            const rawSig = `accessKey=${accessKey}&amount=${amount}&description=${reason}&orderId=${orderId}&partnerCode=${partnerCode}&requestId=${requestId}&transId=${transId}`;
            const signature = crypto.createHmac('sha256', secretKey).update(rawSig).digest('hex');

            try {
                const res = await axios.post(process.env.MOMO_REFUND_ENDPOINT, {
                    partnerCode, 
                    orderId, 
                    requestId, 
                    amount: amount,
                    transId, 
                    lang: 'vi', 
                    description: reason, 
                    signature
                });
                
                refundResponse = res.data;
                // Check kỹ resultCode trả về
                refundStatus = (refundResponse.resultCode == 0) ? 'REFUNDED' : 'FAILED';
                
            } catch (e) {
                refundStatus = 'FAILED';
                refundResponse = e.response?.data || e.message;
                console.error("MoMo Refund Error:", refundResponse); // Log để debug
            }
        }

        // Lưu log giao dịch Refund
        await db.query(
            `INSERT INTO Transactions (registration_id, transaction_type, payment_gateway, merchant_order_id, amount, currency, status, gateway_raw_response, error_message)
             VALUES ($1, 'REFUND', $2, $3, $4, $5, $6, $7, $8)`,
            [registrationId, trans.payment_gateway, `REF_${Date.now()}`, amount, trans.currency, refundStatus, JSON.stringify(refundResponse), reason]
        );

        if (refundStatus === 'REFUNDED') {
             // Cập nhật payment_status thành REFUNDED
             await db.query(`UPDATE Registrations SET payment_status = 'REFUNDED' WHERE registration_id = $1`, [registrationId]);

             // Gửi email thông báo Refund thành công
             try {
                 await emailSender.sendRefundEmail({
                     email: regInfo.email,
                     full_name: regInfo.full_name,
                     conf_name: regInfo.conf_name,
                     registration_id: registrationId,
                     amount: amount,
                     currency: trans.currency,
                     gateway: trans.payment_gateway
                 });
             } catch (mailError) {
                 console.error("Failed to send refund email:", mailError.message);
             }
        }
        
        return { status: refundStatus, response: refundResponse };
    }

    // Tạo yêu cầu xuất hóa đơn VAT
    async createInvoiceRequest(data) {
        // Tìm user_id từ registration (nếu data không truyền vào)
        const userQuery = await db.query('SELECT user_id FROM Registrations WHERE registration_id = $1', [data.registrationId]);
        const userId = userQuery.rows[0]?.user_id;

        const result = await db.query(
            `INSERT INTO Invoices (registration_id, user_id, company_name, tax_code, address, email_receive, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'REQUESTED') RETURNING invoice_id`,
            [data.registrationId, userId, data.companyName, data.taxCode, data.address, data.emailReceive]
        );
        return result.rows[0];
    }

    // Gửi hóa đơn VAT cho user
    async sendInvoiceToUser(invoiceId, invoiceUrl) {
        // Lấy thông tin invoice
        const query = await db.query(`SELECT * FROM Invoices WHERE invoice_id = $1`, [invoiceId]);
        if (query.rows.length === 0) throw new Error("Invoice request not found");
        
        const invoice = query.rows[0];
        
        // Gửi email
        await emailSender.sendInvoiceEmail(invoice.email_receive, invoice, invoiceUrl);
        
        // Cập nhật DB
        const update = await db.query(
            `UPDATE Invoices SET status = 'SENT', invoice_url = $1, sent_at = NOW() WHERE invoice_id = $2 RETURNING sent_at`,
            [invoiceUrl, invoiceId]
        );
        return update.rows[0];
    }
}

module.exports = new PaymentService();