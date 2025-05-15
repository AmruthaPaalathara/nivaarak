import React, { useState } from "react";
import { Container, Form, Button, Alert } from "react-bootstrap";
import API from "../utils/api";

const EmailForm = ({ userId }) => {
  const [email, setEmail] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [document, setDocument] = useState(null);
  const [message, setMessage] = useState("");

  console.log("EmailForm props:", { userId });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!documentType || !userId) {
      setMessage("Document Type and User ID are required.");
      return;
    }
    if (!document) {
      setMessage("Please select a file to attach.");
      return;
    }

    const formData = new FormData();
    formData.append("email", email);
    formData.append("documentType", documentType);
    formData.append("userId", userId);
    formData.append("document", document);

    try {
      const { data } = await API.post("/send-email", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(data.message || "Email sent successfully!");
    } catch (err) {
      console.error(err);
      setMessage("Failed to send email.");
    }
  };

  return (
      <Container className="mt-5">
        <h1>Send Email with Attachment</h1>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Recipient Email</Form.Label>
            <Form.Control
                type="email"
                placeholder="Enter recipient email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Document Type</Form.Label>
            <Form.Control
                type="text"
                placeholder="Enter document type"
                value={documentType}
                onChange={e => setDocumentType(e.target.value)}
                required
            />
          </Form.Group>

          {/* NEW: file picker */}
          <Form.Group className="mb-3">
            <Form.Label>File to Attach</Form.Label>
            <Form.Control
                type="file"
                onChange={e => setDocument(e.target.files[0])}
                required
            />
          </Form.Group>

          <Button variant="primary" type="submit">
            Send Email
          </Button>
        </Form>

        {message && (
            <Alert
                variant={message.toLowerCase().includes("success") ? "success" : "danger"}
                className="mt-3"
            >
              {message}
            </Alert>
        )}
      </Container>
  );
};

export default EmailForm;
