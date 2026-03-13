import qrcode

class QRService:
    def __init__(self):
        pass
    
    def generate_qr(self, registration_id: int, message: str) -> str:
        qr = qrcode.QRCode(
            version=None, 
            error_correction=qrcode.constants.ERROR_CORRECT_H, 
            box_size=10,
            border=4,
        )
        
        qr.add_data(message)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        file_path = f"qrcode_{registration_id}.png"
        img.save(file_path)
        
        return file_path