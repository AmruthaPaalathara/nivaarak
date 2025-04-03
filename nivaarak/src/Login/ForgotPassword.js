import React, { useState } from "react";
import { FloatingLabel, Form, Button, Container, Row, Col, Alert, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../css/style.css";

export default function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState(1); // Step 1: Enter username, Step 2: Set new password
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

  const handleUsernameSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Verify the username
      await axios.post(`${API_URL}/api/auth/verify-username`, { username });

      // If username is valid, move to step 2
      setStep(2);
      setSuccess("Username verified. Please set a new password.");
    } catch (err) {
      setError(err.response?.data?.message || "Username not found. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Validate new password
    if (newPassword.length < 8) {
      setLoading(false);
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setLoading(false);
      setError("New password and confirm password do not match.");
      return;
    }

    try {
      // Update the password
      await axios.post(`${API_URL}/api/auth/reset-password`, { username, newPassword, confirmPassword: confirmNewPassword  });

      // Handle success
      setSuccess("Password updated successfully. Redirecting to login page...");
      setTimeout(() => navigate("/"), 3000); // Redirect to login after 3 seconds
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="forgot-password-container">
      <Row className="justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <Col xs={12} md={6} lg={4}>
          <div className="forgot-password-form p-4 shadow rounded bg-light">
            <h2 className="text-center mb-4 form-heading">Forgot Password</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            {step === 1 && (
              <Form onSubmit={handleUsernameSubmit}>
                <Form.Group className="mb-2 mt-5">
                  <FloatingLabel controlId="floatingUsername" label="Username">
                    <Form.Control
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </FloatingLabel>
                </Form.Group>
                <div className="d-flex justify-content-center">
                  <Button type="submit" className="button" disabled={loading}>
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                        <span className="ms-2">Verifying...</span>
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </div>
              </Form>
            )}

            {step === 2 && (
              <Form onSubmit={handlePasswordSubmit}>
                <Form.Group className="mb-3">
                  <FloatingLabel controlId="floatingNewPassword" label="New Password">
                    <Form.Control
                      type="password"
                      placeholder="Enter a new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </FloatingLabel>
                  {newPassword.length > 0 && newPassword.length < 8 && (
                    <div className="text-danger small mt-1">Password must be at least 8 characters long.</div>
                  )}
                </Form.Group>
                <Form.Group className="mb-3">
                  <FloatingLabel controlId="floatingConfirmNewPassword" label="Confirm New Password">
                    <Form.Control
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </FloatingLabel>
                </Form.Group>
                <div className="d-flex justify-content-center">
                  <Button type="submit" className="button" disabled={loading}>
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                        <span className="ms-2">Updating...</span>
                      </>
                    ) : (
                      "Set New Password"
                    )}
                  </Button>
                </div>
              </Form>
            )}
          </div>
        </Col>
      </Row>
    </Container>
  );
}