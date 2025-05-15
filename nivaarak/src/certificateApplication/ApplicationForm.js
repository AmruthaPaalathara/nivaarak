import React, { useState, useEffect } from "react";
import { Container, Row, Col, Form, Button, Card, Alert, Badge, Spinner, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "bootstrap/dist/css/bootstrap.min.css";
import "../css/style.css";
import axios from 'axios';
import API from "../../src/utils/api";
import { fetchUserDocuments } from "../api/documentService";

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
    emergencyLevel: "",
    requiredBy: "",

  });

  const [validated, setValidated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fileNames, setFileNames] = useState({});
  const [showSummary, setShowSummary] = useState(false);
  const [errors, setErrors] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [isFormValid, setIsFormValid] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Define document types and required files
  const documentRequirements = {
    "Birth Certificate": ["Birth Proof", "Parent's Identity Proof", "Parent's Address Proof", "Parent's Marriage Certificate"],
    "Death Certificate": ["Death Certificate", "Identity Proof", "Address Proof"],
    "Income Certificate": ["Income Proof", "Identity Proof", "Address Proof", "Age Proof", "Salary Slip","Bank Statement"],
    "Domicile Certificate": ["Residence Proof", "Identity Proof", "Aadhaar Card", "School Leaving Certificate"],
    "Caste Certificate": ["Caste Proof", "Domicile Proof", "Identity Proof", "Address Proof"],
    "Agricultural Certificate": ["Address Proof", "Identity Proof", "Land Ownership Proof"],
    "Non- Creamy Layer": ["Income Proof", "Identity Proof", "Address Proof", "Caste Proof"],
    "Property Documents": ["Property Ownership Proof", "Identity Proof"],
    "Marriage Certificates": ["Aadhaar Proof", "Wedding Invitation Proof", "Marriage Declaration", "Address Proof"],
    "Senior Citizen Certificate": ["Aadhaar Card", "Age Proof"],
    "Solvency Certificate": ["Bank Statements", "Property Documents"],
    "Shop and Establishment Registration": ["Aadhaar Card","Rent Agreement","Electricity Bill"],
    "Contract Labour License": ["Employer Details", "Aadhaar Card", "Proof of Business"],
    "Factory Registration Certificate": ["Factory Layout Plan", "Aadhaar Card", "Proof of Ownership"],
    "Boiler Registration Certificate": ["Manufacturer approval","Aadhaar Card","Technical Specification"],
    "Landless Certificate": ["Revenue Records","Aadhaar Card"],
    "New Water Connection": ["Proof of Land Ownership","Aadhaar Card"],
  };

  const finalDocumentTypes = documentTypes.length > 0 ? documentTypes : Object.keys(documentRequirements);

  const areFilesUploaded = formData.documentType &&
      documentRequirements[formData.documentType].every((docLabel) => formData.files[docLabel]);

  // Handle text input change
  const handleChange = (e) => {
    const {name, value, type, checked} = e.target;
    let newErrors = [...errors];

    if ((name === "firstName" || name === "lastName") && !/^[A-Za-z\s]*$/.test(value)) {
      newErrors = newErrors.filter((error) => error.field !== name);
      const errorExists = newErrors.some(err => err.field === name);
      if (!errorExists) {
        newErrors.push({field: name, message: "Only alphabets are allowed."});
      }
    } else {
      newErrors = newErrors.filter((error) => error.field !== name);
    }

    if (name === "email") {
      console.log("Typing email, raw value:", value);
    }

    // Reset files and fileNames when documentType changes
    const updatedFormData = {
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    };

    if (name === "documentType") {
      updatedFormData.files = {}; // Reset files
      setFileNames({});           // Clear file names
    }

    setFormData(updatedFormData);
    setErrors(newErrors);
  };

  // Handle file uploads
  const handleFileChange = (e) => {
    const {name, files} = e.target;
    const allowedFileTypes = ["application/pdf"];
    const maxFileSize = 5 * 1024 * 1024; // 5MB

    let newErrors = [...errors];
    newErrors = newErrors.filter(err => err.field !== name);

    if (files.length > 0) {
      if (!allowedFileTypes.includes(files[0].type)) {
        newErrors.push({field: name, message: "Invalid file type. Upload a PDF."});
      } else if (files[0].size > maxFileSize) {
        newErrors.push({field: name, message: "File size exceeds 5MB limit."});
      } else {
        setFormData((prev) => ({
          ...prev,
          files: {...prev.files, [name]: files[0]},
        }));
        setFileNames((prev) => ({
          ...prev,
          [name]: files[0].name,
        }));

        // Log the uploaded file and the updated fileNames
        console.log("Uploaded file:", files[0]);
        console.log("Updated fileNames:", fileNames);
      }
    }
    setErrors(newErrors);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const rawEmail = e.target.elements.email.value;
    console.log("Email on submit (raw):", rawEmail);

    let validationErrors = [];

    // Validations
    if (!/^[A-Za-z]+$/.test(formData.firstName)) {
      validationErrors.push({ field: "firstName", message: "First name must contain only alphabets." });
    }
    if (!/^[A-Za-z]+$/.test(formData.lastName)) {
      validationErrors.push({ field: "lastName", message: "Last name must contain only alphabets." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      validationErrors.push({ field: "email", message: "Invalid email format." });
    }
    if (!/^\d{10}$/.test(formData.phone)) {
      validationErrors.push({ field: "phone", message: "Phone number must be 10 digits." });
    }
    if (!formData.documentType) {
      validationErrors.push({ field: "documentType", message: "Please select a document type." });
    }

    // Check if documentRequirements for the selected documentType is defined
    if (formData.documentType && documentRequirements[formData.documentType]) {
      const requiredFiles = documentRequirements[formData.documentType];
      requiredFiles.forEach((fileType) => {
        if (!formData.files[fileType]) {
          validationErrors.push({ field: fileType, message: `Please upload the required file: ${fileType}` });
        }
      });
    } else {
      console.error("❌ documentRequirements is missing or not defined.");
      validationErrors.push({ field: "documentType", message: "Document type is not properly defined." });
    }

    if (!formData.agreementChecked) {
      validationErrors.push({ field: "agreementChecked", message: "You must agree to the terms & conditions." });
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setValidated(true);
    setIsSubmitting(true);
    setSubmitError("");
    setErrors([]);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("firstName", formData.firstName);
      formDataToSend.append("lastName", formData.lastName);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("phone", formData.phone);
      formDataToSend.append("state", formData.state);
      formDataToSend.append("documentType", formData.documentType);
      formDataToSend.append("agreementChecked", formData.agreementChecked);
      formDataToSend.append("emergencyLevel", formData.emergencyLevel);
      formDataToSend.append("requiredBy", formData.requiredBy);

      Object.entries(formData.files).forEach(([key, file]) => {
        formDataToSend.append(key, file);
      });

      const token = localStorage.getItem("accessToken");

      // Step 1: Submit Application

      console.log("About to send payload:", formData);

      const applyResponse = await API.post("/certificates/submit", formDataToSend);
      console.log("apply response:", applyResponse);

      if (applyResponse.data.success) {
        console.log("Form successfully submitted:", applyResponse.data);
        const userId = applyResponse.data.application.applicant;

        if (!userId) {
          console.error("❌ Error: userId is missing in applyResponse");
          toast.error("Application submitted, but user ID retrieval failed.");
          return;
        }

        // Step 4: Navigate to homepage
        console.log("Navigating to homepage...");
        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
          navigate("/");
        }, 2000);
      } else {
        console.warn("Form submission failed:", applyResponse.data.message);
        toast.error("Failed to submit the application.");
      }

    } catch (err) {
    const resp = err.response;
    // If the server returned a validation-errors array
    if (resp?.status === 400 && Array.isArray(resp.data?.errors)) {
      console.error("Validation errors:", resp.data.errors);
      // Show each validation message in an alert
      alert(resp.data.errors.map(e => e.msg).join("\n"));
    } else {
      // Fallback for other errors
      console.error("Unexpected error during submit or PDF/Email:", {
        status: resp?.status,
        data:   resp?.data,
        err
      });
      alert(`Server error (${resp?.status}): ${JSON.stringify(resp?.data)}`);
    }
  }finally {
    setIsSubmitting(false);
  }
};

  const handlePreview = () => {
    if (Object.keys(formData.files).length === documentRequirements [formData.documentType]?.length) {
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
                <img src={fileUrl} alt={key} className="img-fluid mt-2" style={{maxWidth: "100%", height: "auto"}}/>
            ) : (
                <a href={fileUrl} download={file.name} className="d-block mt-2">
                  Download {file.name}
                </a>
            )}
          </div>
      );
    });
  };

  useEffect(() => {
    const getDocumentTypes = async () => {
      const result = await fetchUserDocuments();

      if (result.success && result.types.length > 0) {
        setDocumentTypes(result.types);

      } else {

        setDocumentTypes([
          "Birth Certificate",
          "Death Certificate",
          "Income Certificate",
          "Domicile Certificate",
          "Caste Certificate",
          "Agricultural Certificate",
          "Non- Creamy Layer",
          "Property Documents",
          "Marriage Certificates",
          "Senior Citizen Certificate",
          "Solvency Certificate",
          "Shop and Establishment Registration",
          "Contract Labour License",
          "Factory Registration Certificate",
          "Boiler Registration Certificate",
          "Landless Certificate",
          "New Water Connection"
        ]);
      }
    };

    getDocumentTypes();
  }, []);

  useEffect(() => {
    const {firstName, lastName, email, phone, state, documentType, agreementChecked} = formData;

    const requiredDocs = documentRequirements[documentType] || [];
    const uploadedFilesValid = requiredDocs.length > 0 && requiredDocs.every(doc => fileNames[doc]);
    const allFieldsFilled =
        firstName.trim() &&
        lastName.trim() &&
        email.trim() &&
        phone.trim() &&
        state.trim() &&
        documentType &&
        agreementChecked &&
        uploadedFilesValid;

    setIsFormValid(!!allFieldsFilled);
  }, [formData, fileNames]);

    useEffect(() => {
    return () => {
      Object.values(formData.files).forEach(file => URL.revokeObjectURL(file));
    };
  }, [formData.files]);

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
                      {errors
                          .filter((error) => !error.field)
                          .map((error, index) => (
                              <Alert key={index} variant="danger">
                                {error.message}
                              </Alert>
                          ))}

                      <Form noValidate validated={validated} onSubmit={handleSubmit}>
                        <Row>
                          <Col md={6}>
                            <Form.Group controlId="firstName">
                              <Form.Label>First Name</Form.Label>
                              <Form.Control type="text" name="firstName" value={formData.firstName}
                                            onChange={handleChange} required isInvalid={!!errors.find((error) => error.field === "firstName")} />
                              <Form.Control.Feedback type="invalid">
                                {errors.find((error) => error.field === "firstName")?.message}
                              </Form.Control.Feedback>
                            </Form.Group>
                            <Form.Group controlId="email" className="mt-3">
                              <Form.Label>Email</Form.Label>
                              <Form.Control type="email" name="email" value={formData.email} onChange={handleChange}
                                            required isInvalid={!!errors.find((error) => error.field === "email")} />
                              <Form.Control.Feedback type="invalid">
                                {errors.find((error) => error.field === "email")?.message}
                              </Form.Control.Feedback>
                            </Form.Group>
                            <Form.Group controlId="state" className="mt-3">
                              <Form.Label>State</Form.Label>
                              <Form.Control type="text" name="state" value={formData.state} readOnly required/>
                            </Form.Group>

                            {formData.documentType &&
                                Array.isArray(documentRequirements[formData.documentType]) &&
                                documentRequirements[formData.documentType].map((docLabel, index) => {
                                  const error = errors.find((error) => error.field === docLabel);
                                  return (
                                      <Form.Group controlId={`file${index}`} className="mt-3" key={docLabel}>
                                        <Form.Label>{docLabel}</Form.Label>
                                        <Form.Control
                                            type="file"
                                            name={docLabel}
                                            onChange={handleFileChange}
                                            required
                                        />
                                        {fileNames[docLabel] && (
                                            <Badge bg="success" className="mt-2">
                                              Uploaded: {fileNames[docLabel]}
                                            </Badge>
                                        )}
                                        {error && (
                                            <Alert variant="danger" className="mt-1 p-2">
                                              {error.message}
                                            </Alert>
                                        )}
                                      </Form.Group>
                                  );
                                })}
                            <Form.Group controlId="emergencyLevel" className="mt-3">
                              <Form.Label>Urgency Level</Form.Label>
                              <Form.Select name="emergencyLevel" value={formData.emergencyLevel} onChange={handleChange}  isInvalid={!!errors.emergencyLevel} required>
                                <option value="">Select urgency level</option>
                                <option value="Critical"> Critical (Need immediately)</option>
                                <option value="High"> High (Need within 1–2 days)</option>
                                <option value="Medium"> Medium (This week)</option>
                                <option value="Low"> Low (Not urgent)</option>
                              </Form.Select>
                              <Form.Control.Feedback type="invalid">
                                {errors.emergencyLevel}
                              </Form.Control.Feedback>
                            </Form.Group>
                          </Col>

                          <Col md={6}>
                            <Form.Group controlId="lastName">
                              <Form.Label>Last Name</Form.Label>
                              <Form.Control type="text" name="lastName" value={formData.lastName}
                                            onChange={handleChange} required isInvalid={!!errors.find((error) => error.field === "lastName")} />
                              <Form.Control.Feedback type="invalid">
                                {errors.find((error) => error.field === "lastName")?.message}
                              </Form.Control.Feedback>
                            </Form.Group>
                            <Form.Group controlId="phone" className="mt-3">
                              <Form.Label>Phone</Form.Label>
                              <Form.Control type="tel" name="phone" value={formData.phone} onChange={handleChange}
                                            required  isInvalid={!!errors.find((error) => error.field === "phone")} />
                              <Form.Control.Feedback type="invalid">
                                {errors.find((error) => error.field === "phone")?.message}
                              </Form.Control.Feedback>
                            </Form.Group>
                            <Form.Group controlId="documentType" className="mt-3">
                              <Form.Label>Document Type</Form.Label>
                              <Form.Select name="documentType" value={formData.documentType}  onChange={handleChange}
                                           required>
                                <option value="">Select Document Type</option>

                                {documentTypes.map((type) => (
                                    <option key={type} value={type}>
                                      {type}
                                    </option>
                                ))}
                              </Form.Select>
                            </Form.Group>

                            <Form.Group controlId="requiredBy" className="mt-3">
                              <Form.Label>When do you need this certificate?</Form.Label>
                              <Form.Control
                                  type="date"
                                  name="requiredBy"
                                  value={formData.requiredBy}
                                  onChange={handleChange}
                                  required
                              />
                            </Form.Group>
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
                              <Button onClick={handlePreview} className="me-3 button" type="button"
                                      aria-label="Preview Application Form">
                                Preview
                              </Button>
                              <Button type="submit" className="submit-btn px-4 button"
                                      disabled={isSubmitting || !isFormValid}>
                                {isSubmitting ? <Spinner animation="border" size="sm"/> : "Submit"}
                              </Button>
                            </div>
                          </Col>
                        </Row>
                      </Form>
                    </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Modal for Form Preview */}
        <Modal show={showSummary} onHide={handleCloseSummary}>
          <Modal.Header closeButton aria-label="Close Preview">
            <Modal.Title>Form Preview</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{maxHeight: '400px', overflowY: 'auto'}}>
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

        <Modal show={showSuccessModal} centered backdrop="static">
          <Modal.Body className="text-center">
            <h5 className="mb-3 text-success">Application Submitted!</h5>
            <p>You’ll be redirected shortly...</p>
            <Spinner animation="border" size="sm" className="text-success"/>
          </Modal.Body>
        </Modal>

      </Container>
  );
};
  export default ApplicationForm;
