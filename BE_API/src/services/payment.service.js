const axios = require('axios');
const crypto = require('crypto');
const db = require('../config/db');
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
    // --- PAYPAL ---
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
                // Return URL trỏ về API backend của bạn
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

    async capturePaypalOrder(gatewayOrderId) {
        const accessToken = await getPaypalAccessToken();
        // Capture chính là bước xác nhận tiền đã trừ thành công
        const response = await axios.post(
            `${process.env.PAYPAL_API_URL}/v2/checkout/orders/${gatewayOrderId}/capture`,
            {},
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        return response.data;
    }

    // --- MOMO ---
    async createMomoPayment(registrationId, amountVND) {
        const partnerCode = process.env.MOMO_PARTNER_CODE;
        const accessKey = process.env.MOMO_ACCESS_KEY;
        const secretKey = process.env.MOMO_SECRET_KEY;
        const orderId = `CONF_${registrationId}_${new Date().getTime()}`;
        const requestId = orderId;
        const redirectUrl = `${process.env.BASE_URL}/payments/momo-return`;
        const ipnUrl = `${process.env.BASE_URL}/payments/momo-return`; // Hack: Trỏ IPN về return luôn hoặc để trống vì ta không dùng
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

    // --- REFUND ---
    async processRefund(registrationId, amount, reason) {
        const transResult = await db.query(
            `SELECT * FROM Transactions WHERE registration_id = $1 AND status = 'SUCCESS' AND transaction_type = 'PAYMENT' ORDER BY created_at DESC LIMIT 1`,
            [registrationId]
        );

        if (transResult.rows.length === 0) throw new Error("No success transaction found to refund");
        const trans = transResult.rows[0];

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
                refundStatus = 'REFUNDED';
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
            const transId = trans.gateway_transaction_id;
            
            const rawSig = `accessKey=${accessKey}&amount=${amount}&description=${reason}&orderId=${orderId}&partnerCode=${partnerCode}&requestId=${requestId}&transId=${transId}`;
            const signature = crypto.createHmac('sha256', secretKey).update(rawSig).digest('hex');

            try {
                const res = await axios.post(process.env.MOMO_REFUND_ENDPOINT, {
                    partnerCode, orderId, requestId, amount, transId, lang: 'vi', description: reason, signature
                });
                refundResponse = res.data;
                refundStatus = (refundResponse.resultCode === 0) ? 'REFUNDED' : 'FAILED';
            } catch (e) {
                refundStatus = 'FAILED';
                refundResponse = e.response?.data || e.message;
            }
        }

        await db.query(
            `INSERT INTO Transactions (registration_id, transaction_type, payment_gateway, merchant_order_id, amount, currency, status, gateway_raw_response, error_message)
             VALUES ($1, 'REFUND', $2, $3, $4, $5, $6, $7, $8)`,
            [registrationId, trans.payment_gateway, `REF_${Date.now()}`, amount, trans.currency, refundStatus, JSON.stringify(refundResponse), reason]
        );

        if (refundStatus === 'REFUNDED') {
             await db.query(`UPDATE Registrations SET payment_status = 'REFUNDED' WHERE registration_id = $1`, [registrationId]);
        }
        
        return { status: refundStatus, response: refundResponse };
    }
}

module.exports = new PaymentService();