const Document = require("../../models/documentSchema");
const { processPdf } = require("../../extracting/process_pdf.js");
const { reportError } = require("../../contexts/errorContext.js");

const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png"];
const maxFileSize = 5 * 1024 * 1024; // 5MB


//  Upload & Process Document
exports.uploadDocument = async (req, res, next) => {
  try {
    //  Ensure a file is uploaded
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Validate file type and size
    if (!allowedFileTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: "Invalid file type. Only PDF, JPEG, and PNG are allowed." });
    }

    if (req.file.size > maxFileSize) {
      return res.status(400).json({ success: false, message: "File size exceeds the limit of 5MB." });
    }

    //  Ensure user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized request" });
    }
    
    const filePath = path.join(__dirname, "../uploads", req.file.originalname);
    fs.writeFileSync(filePath, req.file.buffer);

    //  Process PDF using service
    const pdfResult = await processPdf(req.file);
    if (!pdfResult || pdfResult.status !== "success" || !pdfResult.documentId) {
      return res.status(500).json({ 
        success: false, 
        message: "Document processing failed", 
        error: pdfResult?.message || "Unknown error" 
      });
    }

    //  Store document in DB (Automatically generates `_id`)
    const document = new Document({
      user: req.user.userId, //  Associate document with user
      extractedText: pdfResult.metadata.extractedText || "", //  Default empty text
      metadata: pdfResult.metadata
    });

    await document.save();

    res.status(201).json({
      success: true,
      documentId: document._id, //  Use MongoDB-generated `_id`
      extractedText: document.extractedText, //  Include extracted text
      metadata: document.metadata
    });

  } catch (error) {
    console.error("Error uploading document:", error);

    // Delete the uploaded file on error
    if (req.file?.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    }

    reportError(error); // Log the error using ErrorContext
    next(error);
  }
};

// Get User-Specific Documents with Pagination
exports.getDocuments = async (req, res, next) => {
  try {
    //  Ensure user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized request" });
    }

    //  Pagination defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    //  Count total documents for user
    const totalDocs = await Document.countDocuments({ user: req.user.userId });

    //  Early return if no documents exist
    if (totalDocs === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { total: 0, page, limit, totalPages: 0 }
      });
    }

    //  Fetch paginated documents
    const documents = await Document.find({ user: req.user.userId })
      .sort({ createdAt: -1 }) // ✅ Latest first
      .skip(skip)
      .limit(limit)
      .select("originalName metadata uploadedAt extractedText"); //  Restrict fields

    res.json({
      success: true,
      data: documents,
      pagination: {
        total: totalDocs,
        page,
        limit,
        totalPages: Math.ceil(totalDocs / limit)
      }
    });

  } catch (error) {
    console.error("Error fetching documents:", error);
    reportError(error); // Log the error using ErrorContext
    next(error);
  }
};