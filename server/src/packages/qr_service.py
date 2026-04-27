import os
import tempfile

import qrcode


class QRService:
    def __init__(self):
        pass

    def generate_qr(
        self,
        registration_id: int,
        message: str,
        output_dir: str = None,
    ) -> str:
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )

        qr.add_data(message)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        if output_dir is None:
            output_dir = tempfile.gettempdir()

        file_path = os.path.join(output_dir, f"qrcode_{registration_id}.png")
        img.save(file_path)

        return file_path