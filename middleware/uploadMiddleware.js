const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 1. DEFINE ABSOLUTE PATH to 'backend/uploads'
// __dirname is the current folder (middleware), so we go up one level (..)
const uploadDir = path.join(__dirname, '../uploads');

// 2. Auto-create folder if missing (Safety Check)
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`[SYSTEM] Created upload directory at: ${uploadDir}`);
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    // Save strictly to the absolute path defined above
    cb(null, uploadDir); 
  },
  filename(req, file, cb) {
    // Clean unique filename
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Images only!')); // Return actual Error object
  }
}

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

module.exports = upload;