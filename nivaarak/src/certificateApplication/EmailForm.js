import React, { useState } from "react";
import axios from "axios";
import { Container, Form, Button, Alert } from "react-bootstrap";

const EmailForm = () => {
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState(null);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("email", email);
    formData.append("document", document);

    try {
      const response = await axios.post("http://localhost:3001/send-email", formData, {
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
          <Form.Label>Document</Form.Label>
          <Form.Control
            type="file"
            onChange={(e) => setDocument(e.target.files[0])}
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