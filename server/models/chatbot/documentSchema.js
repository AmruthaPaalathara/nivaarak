//importing mongoose to interact with MongoDB

const mongoose = require("mongoose");
const { Counter } = require("../authentication/userSchema.js");

const documentSchema = new mongoose.Schema( //creates documentSchema that defines how document-related data will be stored in MongoDB
  {
    userId: { type: Number, required: true },
    customId: { type: String, required: true, unique: true },
    filename: { type: String, required: true, trim: true }, //stores filename, extra spaces removed
    filePath: { 
      type: String,
      trim: true,
    },
    extractedText: { type: String, trim: true, default:"" }, //stores extrtacted text from the file.
    status: { //represents the current status of the document
      type: String, //storeed as string
      enum: ["uploaded", "processing", "completed", "failed", "archived"],
      default: "uploaded",
    }, //indicates the status of the file processing.
    metadata: {
      fileSize: { type: Number,  required: true }, //stores fileize
      mimeType: { type: String,  required: true }, //stores the file type
      pageCount: { type: Number, default: 0 },
    },
    checksum: { type: String, unique: true, sparse: true },
  },
  { timestamps: true } // Automatically tracks document creation & updates

);

// Add indexes

documentSchema.index({ createdAt: -1 }); // Faster retrieval of recent documents
documentSchema.index({ filename: 1 }); // Index for filename
documentSchema.index({ userId: 1 }); // Index for document type

// Pre-save hook validation and auto updation
documentSchema.pre("save", async function (next) { //it is used to validate data and update the status based on certain conditions  
  
  try {
    if (!this.userId) {
      const counter = await Counter.findOneAndUpdate(
        { _id: "userId" },
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true }
      );
      this.userId = counter.sequence_value;
    }

    if (this.metadata.fileSize < 0) { //before saving ensures the file size is not negative.
    return next(new Error("File size cannot be negative."));
  }

  if (!this.filePath && this.status !== "uploaded" && this.status !== "failed") {
    return next(new Error("filePath is required when status is 'processing' or 'completed'."));
  }

  if (this.status === "completed" && !this.extractedText?.trim()) {
    this.status = "failed"; // Mark as failed if text extraction failed but status is completed
  } else if (this.status === "processing" && this.extractedText?.trim())  {
    this.status = "completed"; // Auto-mark as completed if extraction succeeds
  }

 next();
  } catch (error) {
    next(error);
  }
});


//  Archive instead of deleting
documentSchema.methods.archive = function () {
  if (this.status === "archived") {
    return Promise.resolve(this);
  }
  this.status = "archived";
  return this.save();
};

// Virtual field for file size in KB (rounded to 2 decimals)
documentSchema.virtual("fileSizeKB").get(function () {
  return this.metadata?.fileSize ? +(this.metadata.fileSize / 1024).toFixed(2) : 0; //converting bytes into kb, mg(human readable thing)
});

module.exports = mongoose.model("Document", documentSchema);