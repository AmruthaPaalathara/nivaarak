import React, { useState } from "react";
import { Container, Row, Col, Form, Button, Card, Alert, Badge, Spinner, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "../css/style.css";
import axios from 'axios';

const ApplicationForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    documentType: "",
    state: "Maharashtra", // Immutable
    files: {},
    agreementChecked: false,
  });

  const [validated, setValidated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fileNames, setFileNames] = useState({});
  const [showSummary, setShowSummary] = useState(false);
  const [errors, setErrors] = useState([]);

  // Define document types and required files
  const documentTypes = {
    "Birth Certificate": ["Birth Proof", "Identity Proof"],
    "Income Certificate": ["Income Proof", "Identity Proof"],
    "Domicile Certificate": ["Residence Proof", "Identity Proof"],
    "Caste Certificate": ["Caste Proof", "Domicile Proof"],
    "Marriage Certificate": ["Marriage Proof", "Identity Proof"],
    "Land Records": ["Land Ownership Proof", "Identity Proof"],
    "Property Documents": ["Property Ownership Proof", "Identity Proof"],
    "Educational Certificates": ["Education Proof", "Identity Proof"],
    "Pension Documents": ["Pension Proof", "Identity Proof"],
    "Other": ["Supporting Documents", "Additional Proof"],
  };

  // Handle text input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newErrors = [...errors];

    if ((name === "firstName" || name === "lastName") && !/^[A-Za-z\s]*$/.test(value)) {
      newErrors = newErrors.filter((error) => error.field !== name);
      newErrors.push({ field: name, message: "Only alphabets are allowed." });
    } else {
      newErrors = newErrors.filter((error) => error.field !== name);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors(newErrors);
  };

  // Handle file uploads
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png"];
    const maxFileSize = 5 * 1024 * 1024; // 5MB

    let newErrors = [...errors];

    if (files.length > 0) {
      if (!allowedFileTypes.includes(files[0].type)) {
        newErrors.push({ field: name, message: "Invalid file type. Upload a PDF, JPEG, or PNG." });
      } else if (files[0].size > maxFileSize) {
        newErrors.push({ field: name, message: "File size exceeds 5MB limit." });
      } else {
        setFormData((prev) => ({
          ...prev,
          files: { ...prev.files, [name]: files[0] },
        }));
        setFileNames((prev) => ({
          ...prev,
          [name]: files[0].name,
        }));
      }
    }
    setErrors(newErrors);
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();

    let validationErrors = [];

    // Name validation
    if (!/^[A-Za-z]+$/.test(formData.firstName)) {
      validationErrors.push({ field: "firstName", message: "First name must contain only alphabets." });
    }
    if (!/^[A-Za-z]+$/.test(formData.lastName)) {
      validationErrors.push({ field: "lastName", message: "Last name must contain only alphabets." });
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      validationErrors.push({ field: "email", message: "Invalid email format." });
    }

    // Phone validation (10 digits only)
    if (!/^\d{10}$/.test(formData.phone)) {
      validationErrors.push({ field: "phone", message: "Phone number must be 10 digits." });
    }

    // Document type validation
    if (!formData.documentType) {
      validationErrors.push({ field: "documentType", message: "Please select a document type." });
    }

    // Required document validation
    if (formData.documentType && documentTypes[formData.documentType]) {
      const requiredFiles = documentTypes[formData.documentType];

      requiredFiles.forEach((fileType) => {
        if (!formData.files[fileType]) {
          validationErrors.push({ field: fileType, message: `Please upload the required file: ${fileType}` });
        }
      });
    }

    // Terms agreement validation
    if (!formData.agreementChecked) {
      validationErrors.push({ field: "agreementChecked", message: "You must agree to the terms & conditions." });
    }

    // Show errors if any
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setValidated(true);
    setIsSubmitting(true);
    setSubmitError("");
    setErrors([]);
  

  try {
    // Send form data to backend
    const response = await axios.post("http://localhost:3001/send-email", {

      email: formData.email,
   
    });

    if (response.data.success) {
      setSubmitSuccess(true);
      navigate("/");
    } else {
      setSubmitError(response.data.message || "Failed to submit form.");
    }
  } catch (error) {
    console.error("Error submitting form:", error);
    setSubmitError("An error occurred while submitting the form.");
  } finally {
    setIsSubmitting(false);
  }
};

const handlePreview = () => {
  if (Object.keys(formData.files).length === documentTypes[formData.documentType]?.length) {
    setShowSummary(true);
  } else {
    setSubmitError("Please upload all required files before previewing.");
  }
};

const handleCloseSummary = () => setShowSummary(false);


const renderUploadedFiles = () => {
  return Object.keys(formData.files).map((key) => {
    const file = formData.files[key];
    const fileUrl = URL.createObjectURL(file);

    return (
      <div key={key} className="mb-3">
        <strong>{key}:</strong>
        {file.type.startsWith("image/") ? (
          <img src={fileUrl} alt={key} className="img-fluid mt-2" style={{ maxWidth: "100%", height: "auto" }} />
        ) : (
          <a href={fileUrl} download={file.name} className="d-block mt-2">
            Download {file.name}
          </a>
        )}
      </div>
    );
  });
};
return (
  <Container className="mt-4 mb-5">
    <Row className="justify-content-center">
      <Col md={10}>
        <Card className="shadow-lg border-1 mt-5">
          <Card.Body>
            {submitSuccess ? (
              <Alert variant="success" className="text-center">
                <h4>Submission Successful!</h4>
                <p>Your documents have been submitted for verification.</p>
              </Alert>
            ) : (
              <>
                {errors.map((error, index) => (
                  <Alert key={index} variant="danger">
                    {error.message}
                  </Alert>
                ))}

                <Form noValidate validated={validated} onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group controlId="firstName">
                        <Form.Label>First Name</Form.Label>
                        <Form.Control type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />
                      </Form.Group>
                      <Form.Group controlId="email" className="mt-3">
                        <Form.Label>Email</Form.Label>
                        <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} required />
                      </Form.Group>
                      <Form.Group controlId="state" className="mt-3">
                        <Form.Label>State</Form.Label>
                        <Form.Control type="text" name="state" value={formData.state} readOnly required />
                      </Form.Group>
                      {formData.documentType && documentTypes[formData.documentType] && (
                        <Form.Group controlId="fileUpload" className="mt-3">
                          <Form.Label>{documentTypes[formData.documentType][1]}</Form.Label>
                          <Form.Control type="file" name={documentTypes[formData.documentType][1]} onChange={handleFileChange} required />
                          {fileNames[documentTypes[formData.documentType][1]] && (
                            <Badge bg="success" className="mt-2">
                              Uploaded: {fileNames[documentTypes[formData.documentType][1]]}
                            </Badge>
                          )}
                          {errors.find((error) => error.field === "documentFile") && (
                            <Alert variant="danger" className="mt-1 p-2">
                              {errors.find((error) => error.field === "documentFile").message}
                            </Alert>
                          )}
                        </Form.Group>
                      )}

                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="lastName">
                        <Form.Label>Last Name</Form.Label>
                        <Form.Control type="text" name="lastName" value={formData.lastName} onChange={handleChange} required />
                      </Form.Group>
                      <Form.Group controlId="phone" className="mt-3">
                        <Form.Label>Phone</Form.Label>
                        <Form.Control type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
                      </Form.Group>
                      <Form.Group controlId="documentType" className="mt-3">
                        <Form.Label>Document Type</Form.Label>
                        <Form.Select name="documentType" value={formData.documentType} onChange={handleChange} required>
                          <option value="">Select Document Type</option>
                          {Object.keys(documentTypes).map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                      {/* First Required Document */}
                      {formData.documentType && documentTypes[formData.documentType] && (
                        <Form.Group controlId="file1" className="mt-3">
                          <Form.Label>{documentTypes[formData.documentType][0]}</Form.Label>
                          <Form.Control type="file" name={documentTypes[formData.documentType][0]} onChange={handleFileChange} required />
                          {fileNames[documentTypes[formData.documentType][0]] && (
                            <Badge bg="success" className="mt-2">
                              Uploaded: {fileNames[documentTypes[formData.documentType][0]]}
                            </Badge>
                          )}
                          {errors.find((error) => error.field === "documentFile") && (
                            <Alert variant="danger" className="mt-1 p-2">
                              {errors.find((error) => error.field === "documentFile").message}
                            </Alert>
                          )}
                        </Form.Group>
                      )}

                    </Col>
                  </Row>

                  {/* Agreement Checkbox */}
                  <Form.Group controlId="agreementChecked" className="mt-4">
                    <Form.Check
                      type="checkbox"
                      name="agreementChecked"
                      label="I agree to the terms and conditions"
                      checked={formData.agreementChecked}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>

                  {/* Buttons */}
                  <div className="mt-4">
                    <Button onClick={handlePreview} className="me-3 button">
                      Preview
                    </Button>
                    <Button type="submit" className="submit-btn px-4 button" disabled={isSubmitting}>
                      {isSubmitting ? <Spinner animation="border" size="sm" /> : "Submit"}
                    </Button>
                  </div>
                </Form>
              </>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>

    {/* Modal for Form Preview */}
    <Modal show={showSummary} onHide={handleCloseSummary}>
      <Modal.Header closeButton>
        <Modal.Title>Form Preview</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          <strong>First Name:</strong> {formData.firstName}
        </p>
        <p>
          <strong>Last Name:</strong> {formData.lastName}
        </p>
        <p>
          <strong>Email:</strong> {formData.email}
        </p>
        <p>
          <strong>Phone:</strong> {formData.phone}
        </p>
        <p>
          <strong>Document Type:</strong> {formData.documentType}
        </p>
        {renderUploadedFiles()}
      </Modal.Body>
    </Modal>
  </Container>
);
};

export default ApplicationForm;