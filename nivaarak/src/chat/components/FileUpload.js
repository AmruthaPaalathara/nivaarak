import React, { useRef } from "react";
import PropTypes from "prop-types";
import { Button, OverlayTrigger, Tooltip, Badge, Spinner, ProgressBar } from "react-bootstrap";
import { Paperclip, XCircle } from "react-bootstrap-icons";
import { toast } from "react-toastify";

/**
 * A reusable file upload component.
 *
 * Props:
 * - onFileSelect: callback(event) for file selection
 * - uploadedFile: { name: string, documentId?: string, extractedText?: string } | null
 * - uploading: boolean upload in progress
 * - uploadProgress: number (0-100)
 * - onRemove: callback() remove current file
 * - accept: string MIME types (default 'application/pdf')
 * - maxSize: number max file size bytes (default 10MB)
 */
const FileUpload = ({
                        onFileSelect,
                        uploadedFile,
                        uploading,
                        uploadProgress,
                        onRemove,
                        accept = 'application/pdf', // optional default
                        maxSize = 10 * 1024 * 1024,
                    }) => {
    const fileInputRef = useRef(null);

    const handleClick = () => {
        if (uploadedFile) {
            onRemove();
        } else if (fileInputRef.current) {
            fileInputRef.current.click();
        } else {
            toast.error("File input reference is missing.");
        }
    };
    const handleFileChange = (event) => {
        const files = event.target?.files;

        if (!files?.length) {
            toast.error("No file selected.");
            return;
        }

        const file = files[0]; // Get the first file selected

        if (file.size > maxSize) {
            toast.error("File size exceeds the maximum limit");
            return;
        }

        if (!file.type.startsWith("application/pdf") || !file.name.toLowerCase().endsWith(".pdf")) {
            toast.error("Only PDF files are allowed.");
            return;
        }

        onFileSelect(file); // Pass the validated file to the parent component
    };



    const handleRemove = () => {
        onRemove(); // Trigger the onRemove function (from parent component)
    };
    return (
        <div className="file-upload-container d-flex align-items-center gap-2">
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                hidden
                aria-hidden="true"
                onChange={handleFileChange}
                disabled={uploading}
                style={{ display: "none" }}
            />

            <Button
                variant="outline-primary"
                onClick={handleClick}
                disabled={uploading}
                className="d-flex align-items-center gap-1"
            >
                {uploading ? (
                    <>
                        <Spinner animation="border" size="sm" className="me-1" role="status" />
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

            {uploading && (
                <ProgressBar
                    now={uploadProgress}
                    label={`${uploadProgress}%`}
                    striped
                    animated
                    className="flex-grow-1"
                    value={uploadProgress} max="100"
                />
            )}

            {uploadedFile && (
                <OverlayTrigger placement="top" overlay={<Tooltip>{uploadedFile.name}</Tooltip>}>
                    <Badge bg="success" className="d-flex align-items-center gap-1">
                        {uploadedFile.name}
                        <XCircle onClick={onRemove} size={18} className="ms-1" style={{ cursor: 'pointer' }} />
                    </Badge>
                </OverlayTrigger>
            )}
        </div>
    );
};

FileUpload.propTypes = {
    onFileSelect: PropTypes.func.isRequired,
    uploadedFile: PropTypes.shape({
        name: PropTypes.string.isRequired,
        documentId: PropTypes.string,
        extractedText: PropTypes.string,
    }),
    uploading: PropTypes.bool,
    uploadProgress: PropTypes.number,
    onRemove: PropTypes.func,
    accept: PropTypes.string,
    maxSize: PropTypes.number,
};

FileUpload.defaultProps = {
    uploadedFile: null,
    uploading: false,
    uploadProgress: 0,
    onRemove: () => {},
    accept: 'application/pdf',
    maxSize: 10 * 1024 * 1024,
};

export default FileUpload;
