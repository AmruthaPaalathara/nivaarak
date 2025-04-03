import React, { useState, useRef } from "react";
import { Button, OverlayTrigger, Tooltip, Badge, Spinner, ProgressBar } from "react-bootstrap";
import { Paperclip, XCircle } from "react-bootstrap-icons";
import PropTypes from "prop-types";
import axios from "axios";
import { toast } from "react-toastify";
import "../../css/style.css";


const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * FileUpload Component
 *
 * @param {Function} onUploadSuccess - Callback for successful upload.
 * @param {Function} onUploadError - Callback for upload error.
 */

const FileUpload = ({ onUploadSuccess , onUploadError }) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);


  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const userId = localStorage.getItem("userId"); // If stored in localStorage
    console.log(localStorage.getItem("userId"))

    if (!userId) {
      console.error("User ID is missing! Make sure you're logged in.");
      toast.error("User ID is required to upload files.");
      return;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setError("File size exceeds the maximum limit of 10MB.");
      toast.error("File size exceeds the maximum limit of 10MB.");
      return;
    }

    // Check file type
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      toast.error("Only PDF files are allowed.");
      return;
    }

    // setFile(file);
    setUploading(true);
    setUploadProgress(0);
    console.log("File selected:", file);
    setUploadedFile({ name: file.name });

try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);

    
      console.log("Starting file upload...");
      const response = await axios.post("http://localhost:3001/api/documents/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setUploadProgress(progress);
        },
      });

      console.log("Upload response:", response.data);

    // Validate response structure
    if (!response.data.data || !response.data.data.customId) {
      console.error("Unexpected response structure:", response.data);
      toast.error("Unexpected response from the server");
      return;
    }

    console.log("Document ID:", response.data.data.customId);
    console.log("Extracted Text:", response.data.data.extractedText);

    // Check if onUploadSuccess is a function before calling it
    if (typeof onUploadSuccess === "function") {
      onUploadSuccess(response.data);
    } else {
      console.error("onUploadSuccess is not defined or is not a function");
    }

    setUploadedFile({
      name: file.name,
      documentId: response.data.data.customId,
      extractedText: response.data.data.extractedText,
    });

    setUploadProgress(100);
    toast.success("File Uploaded successfully");
  } catch (error) {
    console.error("Error uploading file:", error.response?.data || error.message);
    toast.error(error.response?.data?.message || "File upload failed");

    if (typeof onUploadError === "function") {
      onUploadError(error);
    } else {
      console.error("onUploadError is not defined or is not a function");
    }
  } finally {
    console.log("Upload process completed.");
    setTimeout(() => {
      setUploading(false);
      setUploadProgress(0);
    }, 1000);
  }
};

const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  setSelectedFile(file);

  handleFileUpload(file);
};

  // Handle file removal
  const handleRemoveFile = () => {
    setUploadedFile(null);
    setError(null);
    fileInputRef.current.value = null; // Clear input safely
  };

  return (
    <div>
      <div className="file-upload-container d-flex align-items-center gap-2">
        {/* Hidden file input */}
        <input
          type="file"
          accept="application/pdf"
          hidden
          ref={fileInputRef}
          onChange={handleFileUpload}
          aria-label="Upload PDF file"
          aria-describedby="file-upload-description"
          disabled={uploading}
        />
        <span id="file-upload-description" className="visually-hidden">
          Upload a PDF file with a maximum size of 10MB.
        </span>

        {/* Attach PDF Button */}
        <Button
          variant="outline-primary"
          className="d-flex align-items-center gap-1"
          onClick={() => {
            if (uploadedFile) {
              // If a file is already uploaded, remove it
              handleRemoveFile();
            } else {
              // Otherwise, trigger file selection
              fileInputRef.current.click();
            }
          }}
          disabled={uploading}
          aria-label={uploadedFile ? "Remove File" : "Attach PDF"}
          aria-busy={uploading}
        >
          {uploading ? (
            <>
              <Spinner animation="border" size="sm" role="status" className="me-1" />
              Uploading...
            </>
          ) : uploadedFile ? (
            <>
              <XCircle size={20} /> Remove
            </>
          ) : (
            <>
              <Paperclip size={20} /> Attach
            </>
          )}
        </Button>

        {/* Upload Progress Bar */}
        {uploading && (
          <ProgressBar
            now={uploadProgress}
            label={`${uploadProgress}%`}
            className="mt-2 custom-progress-bar"
            striped
            animated
            aria-live="polite"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={uploadProgress}
            aria-valuetext={`Upload is ${uploadProgress}% complete`}
          />
        )}

        {/* Uploaded File Badge */}
        {uploadedFile && (
          <OverlayTrigger placement="top" overlay={<Tooltip>{uploadedFile.name}</Tooltip>}>
            <Badge bg="success" className="file-badge d-flex align-items-center gap-1">
            {uploadedFile.name}
               <XCircle className="remove-icon" onClick={handleRemoveFile} size={18} />
            </Badge>
          </OverlayTrigger>
        )}
      </div>

{/* Fallback File Input */}

</div>
);
};

FileUpload.propTypes = {
  onUploadSuccess: PropTypes.func.isRequired,
  onUploadError: PropTypes.func.isRequired,
};

export default FileUpload;