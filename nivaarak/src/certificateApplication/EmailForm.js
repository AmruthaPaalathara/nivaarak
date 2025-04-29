import React, { useState } from "react";
import axios from "axios";
import { Container, Form, Button, Alert } from "react-bootstrap";
import API from "../utils/api";

const EmailForm = ({ userId }) => {
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState(null);
  const [message, setMessage] = useState("");
  const [documentType, setDocumentType] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!documentType || !userId) { // ✅ Ensure userId exists before sending request
      console.error("Error: documentType or userId is empty.");
      setMessage("Document Type and User ID are required.");
      return;
    }


    const formData = new FormData();
    formData.append("email", email);
    formData.append("document", document);
    formData.append("documentType", documentType);
    formData.append("userId", userId);
    console.log("Sending request with:", { email, documentType, userId });

    try {
      const response = await API.post("/send-email", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setMessage(response.data.message);

    } catch (error) {
      setMessage("Failed to send email.");
      console.error("Error:", error);
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
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Document Type</Form.Label>
          <Form.Control
              type="text"
              placeholder="Enter document type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              required
          />
        </Form.Group>

        <Button variant="primary" type="submit">
          Send Email
        </Button>
      </Form>

      {message && (
        <Alert variant={message.includes("successfully") ? "success" : "danger"} className="mt-3">
          {message}
        </Alert>
      )}
    </Container>
  );
};

export default EmailForm;