import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert, Badge, InputGroup,ProgressBar} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './css/style.css';

const ApplicationForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    documentType: '',
    state: '',
    documentFile: null,
    idProof: null,
    agreementChecked: false
  });

  const [validated, setValidated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [fileNames, setFileNames] = useState({
    documentFile: '',
    idProof: ''
  });

  const documentTypes = [
    'Birth Certificate',
    'Income Certificate',
    'Domicile Certificate',
    'Caste Certificate',
    'Marriage Certificate',
    'Land Records',
    'Property Documents',
    'Educational Certificates',
    'Pension Documents',
    'Other'
  ];

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files.length > 0) {
      setFormData({
        ...formData,
        [name]: files[0]
      });
      setFileNames({
        ...fileNames,
        [name]: files[0].name
      });
    }
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      [name]: checked
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    
    if (form.checkValidity() === false) {
      event.stopPropagation();
      setValidated(true);
      return;
    }
    
    setValidated(true);
    setIsSubmitting(true);
    
    try {
      // Simulate API call to Express.js backend
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Form submitted successfully', formData);
      setSubmitSuccess(true);
      
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          username: '',
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          documentType: '',
          state: '',
          documentFile: null,
          idProof: null,
          agreementChecked: false
        });
        setFileNames({
          documentFile: '',
          idProof: ''
        });
        setValidated(false);
        setSubmitSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      documentType: '',
      state: '',
      documentFile: null,
      idProof: null,
      agreementChecked: false
    });
    setFileNames({
      documentFile: '',
      idProof: ''
    });
    setValidated(false);
  };

  return (
    <div className="gov-verification-app">
      {/* Header */}
      {/* <div className="gov-header">
        <Container fluid>
          <Row className="align-items-center">
            <Col xs={12} md={3} className="text-center text-md-start">
              <img src="/api/placeholder/80/80" alt="Government Emblem" className="gov-emblem" />
            </Col>
            <Col xs={12} md={6} className="text-center">
              <h1 className="header-title">Government of India</h1>
              <h2 className="header-subtitle">Legal Document Verification Portal</h2>
            </Col>
            <Col xs={12} md={3} className="text-center text-md-end">
              <img src="/api/placeholder/80/80" alt="Digital India Logo" className="digital-india-logo" />
            </Col>
          </Row>
        </Container>
      </div> */}

      {/* Main Content */}
      <Container className="mt-4 mb-5">
        <Row className="justify-content-center">
          <Col md={10}>
            <Card className="shadow-lg border-0">
              <Card.Header className="bg-primary text-white">
                <h3 className="mb-0 application-heading">Document Verification Service</h3>
              </Card.Header>
              
              <Card.Body>
                {submitSuccess ? (
                  <Alert variant="success" className="text-center">
                    <div className="success-checkmark">
                      <div className="check-icon">
                        <span className="icon-line line-tip"></span>
                        <span className="icon-line line-long"></span>
                        <div className="icon-circle"></div>
                        <div className="icon-fix"></div>
                      </div>
                    </div>
                    <h4>Submission Successful!</h4>
                    <p>Your documents have been submitted for verification.</p>
                    <p>You will receive updates on your registered email and phone number.</p>
                    <p>Reference ID: <Badge bg="secondary">{Math.random().toString(36).substring(2, 10).toUpperCase()}</Badge></p>
                  </Alert>
                ) : (
                  <>
                    <Row className="mb-4">
                      <Col>
                        <div className="verification-steps">
                          <div className="step-container">
                            <div className="step-circle">1</div>
                            <div className="step-label">Fill Form</div>
                          </div>
                          <div className="step-line"></div>
                          <div className="step-container">
                            <div className="step-circle">2</div>
                            <div className="step-label">Upload Documents</div>
                          </div>
                          <div className="step-line"></div>
                          <div className="step-container">
                            <div className="step-circle">3</div>
                            <div className="step-label">Verify</div>
                          </div>
                        </div>
                      </Col>
                    </Row>
                    
                    <Form noValidate validated={validated} onSubmit={handleSubmit}>
                      <Card className="mb-4">
                        <Card.Header className="bg-light">
                          <h5 className="mb-0">Personal Information</h5>
                        </Card.Header>
                        <Card.Body>
                          <Row className="mb-3">
                            <Col md={4}>
                              <Form.Group controlId="username">
                                <Form.Label>Username <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                  type="text" className='form-input'
                                  name="username"
                                  value={formData.username}
                                  onChange={handleChange}
                                  required
                                />
                                <Form.Control.Feedback type="invalid">
                                  Please enter a username.
                                </Form.Control.Feedback>
                              </Form.Group>
                            </Col>
                            <Col md={4}>
                              <Form.Group controlId="firstName">
                                <Form.Label>First Name <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                  type="text" className='form-input'
                                  name="firstName"
                                  value={formData.firstName}
                                  onChange={handleChange}
                                  required
                                />
                                <Form.Control.Feedback type="invalid">
                                  Please enter your first name.
                                </Form.Control.Feedback>
                              </Form.Group>
                            </Col>
                            <Col md={4}>
                              <Form.Group controlId="lastName">
                                <Form.Label>Last Name <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                  type="text" className='form-input'
                                  name="lastName"
                                  value={formData.lastName}
                                  onChange={handleChange}
                                  required
                                />
                                <Form.Control.Feedback type="invalid">
                                  Please enter your last name.
                                </Form.Control.Feedback>
                              </Form.Group>
                            </Col>
                          </Row>
                          <Row>
                            <Col md={6}>
                              <Form.Group controlId="email">
                                <Form.Label>Email <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                  type="email" className='form-input'
                                  name="email"
                                  value={formData.email}
                                  onChange={handleChange}
                                  required
                                />
                                <Form.Control.Feedback type="invalid">
                                  Please enter a valid email address.
                                </Form.Control.Feedback>
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group controlId="phone">
                                <Form.Label>Phone Number <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                  type="tel" className='form-input'
                                  name="phone"
                                  value={formData.phone}
                                  onChange={handleChange}
                                  pattern="[0-9]{10}"
                                  required
                                  placeholder="10-digit number"
                                />
                                <Form.Control.Feedback type="invalid">
                                  Please enter a valid 10-digit phone number.
                                </Form.Control.Feedback>
                              </Form.Group>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>

                      <Card className="mb-4">
                        <Card.Header className="bg-light">
                          <h5 className="mb-0">Document Information</h5>
                        </Card.Header>
                        <Card.Body>
                          <Row>
                            <Col md={6}>
                              <Form.Group controlId="documentType">
                                <Form.Label>Document Type <span className="text-danger">*</span></Form.Label>
                                <Form.Select
                                  name="documentType" className='form-input'
                                  value={formData.documentType}
                                  onChange={handleChange}
                                  required
                                >
                                  <option value="">Select Document Type</option>
                                  {documentTypes.map((type, index) => (
                                    <option key={index} value={type}>{type}</option>
                                  ))}
                                </Form.Select>
                                <Form.Control.Feedback type="invalid">
                                  Please select a document type.
                                </Form.Control.Feedback>
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group controlId="state">
                                <Form.Label>State <span className="text-danger">*</span></Form.Label>
                                <Form.Select
                                  name="state" className='form-input'
                                  value={formData.state}
                                  onChange={handleChange}
                                  required
                                >
                                  <option value="">Select State</option>
                                  {indianStates.map((state, index) => (
                                    <option key={index} value={state}>{state}</option>
                                  ))}
                                </Form.Select>
                                <Form.Control.Feedback type="invalid">
                                  Please select a state.
                                </Form.Control.Feedback>
                              </Form.Group>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>

                      <Card className="mb-4">
                        <Card.Header className="bg-light">
                          <h5 className="mb-0">Document Upload</h5>
                        </Card.Header>
                        <Card.Body>
                          <Row className="mb-3">
                            <Col md={6}>
                              <Form.Group controlId="documentFile" className="file-upload-group">
                                <Form.Label>Upload Document <span className="text-danger">*</span></Form.Label>
                                <InputGroup>
                                  <Form.Control
                                    type="file" 
                                    name="documentFile"
                                    onChange={handleFileChange}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    required
                                    className="file-input form-input"
                                  />
                                </InputGroup>
                                <Form.Text className="text-muted">
                                  Supported formats: PDF, JPG, PNG (Max: 5MB)
                                </Form.Text>
                                <Form.Control.Feedback type="invalid">
                                  Please upload a document file.
                                </Form.Control.Feedback>
                                {fileNames.documentFile && (
                                  <div className="selected-file mt-2">
                                    <Badge bg="secondary" className="p-2">
                                      {fileNames.documentFile}
                                      <span 
                                        className="ms-2 remove-file" 
                                        onClick={() => {
                                          setFileNames({...fileNames, documentFile: ''});
                                          setFormData({...formData, documentFile: null});
                                        }}
                                      >
                                        ×
                                      </span>
                                    </Badge>
                                  </div>
                                )}
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group controlId="idProof" className="file-upload-group">
                                <Form.Label>Upload ID Proof <span className="text-danger">*</span></Form.Label>
                                <InputGroup>
                                  <Form.Control
                                    type="file"
                                    name="idProof"
                                    onChange={handleFileChange}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    required
                                    className="file-input form-input"
                                  />
                                </InputGroup>
                                <Form.Text className="text-muted">
                                  Aadhar, PAN, Voter ID, etc. (Max: 5MB)
                                </Form.Text>
                                <Form.Control.Feedback type="invalid">
                                  Please upload an ID proof.
                                </Form.Control.Feedback>
                                {fileNames.idProof && (
                                  <div className="selected-file mt-2">
                                    <Badge bg="secondary" className="p-2">
                                      {fileNames.idProof}
                                      <span 
                                        className="ms-2 remove-file" 
                                        onClick={() => {
                                          setFileNames({...fileNames, idProof: ''});
                                          setFormData({...formData, idProof: null});
                                        }}
                                      >
                                        ×
                                      </span>
                                    </Badge>
                                  </div>
                                )}
                              </Form.Group>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>

                      <Card className="mb-4">
                        <Card.Body>
                          <Form.Group controlId="agreementCheckbox">
                            <Form.Check
                              type="checkbox"
                              label="I hereby declare that all the information provided is true and correct to the best of my knowledge."
                              name="agreementChecked"
                              checked={formData.agreementChecked}
                              onChange={handleCheckboxChange}
                              required
                              className="declaration-checkbox "
                            />
                            <Form.Control.Feedback type="invalid">
                              You must agree before submitting.
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Card.Body>
                      </Card>

                      <div className="form-actions text-center justify-content-space-between">
                        <Button 
                          variant="primary" 
                          type="submit" 
                          className="submit-btn"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Processing...
                            </>
                          ) : (
                            'Submit Documents'
                          )}
                        </Button>
                        <Button  onClick={handleReset} className="reset-btn" type="reset">
                          Reset Form
                        </Button>
                      </div>
                    </Form>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      
    </div>
  );
};

export default ApplicationForm;