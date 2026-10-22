// Загрузка фотографий нарушений (multer): только изображения, до 5 МБ
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { HttpError } = require('../utils/http');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) return cb(null, true);
    return cb(new HttpError(400, 'Можно прикрепить только изображение (JPG, PNG, WEBP)'));
  },
});

module.exports = { upload, UPLOAD_DIR };
