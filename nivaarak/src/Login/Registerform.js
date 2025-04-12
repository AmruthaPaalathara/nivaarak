import React, { useState, useEffect } from "react";
import { FloatingLabel, Form, Button, Container, Row, Col, Spinner, Alert, ProgressBar } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../css/style.css";
import zxcvbn from "zxcvbn"; // For password strength calculation
import API from "../../src/utils/api";

function RegisterForm() {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const navigate = useNavigate();

  // Password strength calculation
  useEffect(() => {
    if (formData.password) {
      const { score } = zxcvbn(formData.password);
      setPasswordStrength(score);
    } else {
      setPasswordStrength(0);
    }
  }, [formData.password]);

  // Handle input change and trim spaces
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Form validation function
  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.first_name) newErrors.first_name = "This field is required";
    if (!formData.last_name) newErrors.last_name = "This field is required";
    if (!formData.username) newErrors.username = "This field is required";
    if (!formData.email) newErrors.email = "This field is required";
    if (!formData.phone) newErrors.phone = "This field is required";
    if (!formData.password) newErrors.password = "This field is required";
    if (!formData.confirmPassword) newErrors.confirmPassword = "Please confirm your password";

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    // Phone validation
    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Phone number must be 10 digits";
    }

    // Password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Update state with errors only if they exist
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    return true; // No errors found
  };

  // Submit form
  const handleSubmit = async (event) => {
    event.preventDefault();
    setApiError("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await API.post(
        '/auth/register',
        formData,
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );

      if (response.data.success) {
        navigate("/sign");  // Redirect to sign-in page after successful registration
      } else {
        setApiError(response.data.message || "Something went wrong.");
      }
    } catch (err) {
      setApiError(err.response?.data?.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Password strength labels
  const passwordStrengthLabels = [
    "Very Weak",
    "Weak",
    "Fair",
    "Strong",
    "Very Strong",
  ];

  return (
    <Container className="register-container">
      <Row className="justify-content-center">
        <Col xs={12} md={8} lg={6}>
          <div className="registration-form border p-4 shadow bg-light">
            <h2 className="text-center mb-4 form-heading">Register</h2>

            {apiError && (
              <Alert variant="danger" role="alert">
                {apiError}
              </Alert>
            )}

            <Form onSubmit={handleSubmit} noValidate>
              {/* First Name */}
              <FloatingLabel controlId="floatingFirstName" label="First Name" className="mb-3">
                <Form.Control
                  type="text"
                  name="first_name"
                  placeholder="First Name"
                  required
                  value={formData.first_name}
                  onChange={handleChange}
                  isInvalid={!!errors.first_name}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.first_name}
                </Form.Control.Feedback>
              </FloatingLabel>

              {/* Last Name */}
              <FloatingLabel controlId="floatingLastName" label="Last Name" className="mb-3">
                <Form.Control
                  type="text"
                  name="last_name"
                  placeholder="Last Name"
                  required
                  value={formData.last_name}
                  onChange={handleChange}
                  isInvalid={!!errors.last_name}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.last_name}
                </Form.Control.Feedback>
              </FloatingLabel>

              {/* Username */}
              <FloatingLabel controlId="floatingUsername" label="Username" className="mb-3">
                <Form.Control
                  type="text"
                  name="username"
                  placeholder="Username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  isInvalid={!!errors.username}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.username}
                </Form.Control.Feedback>
              </FloatingLabel>

              {/* Email */}
              <FloatingLabel controlId="floatingEmail" label="Email" className="mb-3">
                <Form.Control
                  type="email"
                  name="email"
                  placeholder="Email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  isInvalid={!!errors.email}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.email}
                </Form.Control.Feedback>
              </FloatingLabel>

              {/* Phone Number */}
              <FloatingLabel controlId="floatingPhone" label="Phone Number" className="mb-3">
                <Form.Control
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  isInvalid={!!errors.phone}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.phone}
                </Form.Control.Feedback>
              </FloatingLabel>

              {/* Password */}
              <FloatingLabel controlId="floatingPassword" label="Password" className="mb-3">
                <Form.Control
                  type="password"
                  name="password"
                  placeholder="Password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  isInvalid={!!errors.password}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.password}
                </Form.Control.Feedback>
              </FloatingLabel>

              {/* Password Conditions */}
              <div className="password-requirements">
                <p style={{ color: formData.password.length >= 8 ? "green" : "red" }}>
                  {formData.password.length >= 8 ? "✅" : "❌"} At least **8 characters**
                </p>
                <p style={{ color: /[A-Z]/.test(formData.password) ? "green" : "red" }}>
                  {/[A-Z]/.test(formData.password) ? "✅" : "❌"} At least **one uppercase letter**
                </p>
                <p style={{ color: /\d/.test(formData.password) ? "green" : "red" }}>
                  {/\d/.test(formData.password) ? "✅" : "❌"} At least **one number**
                </p>
                <p style={{ color: /[!@#$%^&*]/.test(formData.password) ? "green" : "red" }}>
                  {/[!@#$%^&*]/.test(formData.password) ? "✅" : "❌"} At least **one special character**
                </p>
              </div>

              {/* Password Strength Indicator */}
              <div id="password-strength-feedback" className="password-strength mb-3">
                <ProgressBar
                  now={(passwordStrength + 1) * 25}
                  label={passwordStrengthLabels[passwordStrength]}
                  variant={
                    ['danger', 'warning', 'info', 'primary', 'success'][passwordStrength]
                  }
                />
              </div>

              {/* Confirm Password */}
              <FloatingLabel controlId="floatingConfirmPassword" label="Confirm Password" className="mb-3">
                <Form.Control
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  isInvalid={!!errors.confirmPassword}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.confirmPassword}
                </Form.Control.Feedback>
              </FloatingLabel>

              {/* Submit Button */}
              <div className="d-flex justify-content-center">
                <Button type="submit" className="button" disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" />
                      <span className="ms-2">Registering...</span>
                    </>
                  ) : (
                    'Register'
                  )}
                </Button>
              </div>
            </Form>
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default RegisterForm;