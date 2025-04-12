import React, { useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Container from "react-bootstrap/Container";
import { Navbar, Nav, NavDropdown, Button } from "react-bootstrap";
import "../css/style.css";
import PrintableContent from "../chat/components/generatedPdfContent"; 
import { useReactToPrint } from "react-to-print";
import GeneratePDF from "../chat/components/generatePdf";


function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("accessToken");

  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: "Certificate Details",
    onAfterPrint: () => console.log("PDF printed successfully!"),
    onPrintError: (error) => console.error("Print error:", error),
  });

  const handleAboutClick = (e) => {
    e.preventDefault();
    if (location.pathname === "/") {
      const aboutSection = document.getElementById("about-section");
      if (aboutSection) {
        aboutSection.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate("/", { state: { scrollToAbout: true } });
    }
  };

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem("accessToken"); // Remove token on logout
    sessionStorage.removeItem("token");
    navigate("/signin"); // Redirect to login page
  };

  return (
    <Navbar fixed="top" expand="lg" className="header">
      <Container>
        <Navbar.Brand>
          <Link to="/" className="nivaarak">nivaarak</Link>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto text-center">
            <Nav.Link as={Link} to="/" className="navbar-link">Home</Nav.Link>
            <Nav.Link onClick={handleAboutClick} className="navbar-link">About</Nav.Link>
            <Nav.Link as={Link} to="/chat" className="navbar-link"
            onClick={() => console.log("Navigating to /chat")}>Chatbot</Nav.Link> 

            {/* Show "Login" when NOT logged in, Show "User" Dropdown when logged in */}

            {token ? (  
              <NavDropdown title="User" id="user-dropdown" className="navbar-link">
                <NavDropdown.Item as={Link} to="/profile">Profile</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item as={Link} to="/application" className="navbar-link">Application Form</NavDropdown.Item>
                <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
              </NavDropdown>
            ) : (
              <Nav.Link as={Link} to="/signin" className="navbar-link">Login</Nav.Link>
            )}

          </Nav>
        </Navbar.Collapse>
      </Container>

      {/* Hidden content to be printed */}
      <div style={{ display: "none" }}>
        <PrintableContent ref={componentRef} documentData={{
          documentType: "Sample Document",
          benefits: "Some benefits of this document...",
          eligibility: "Eligibility requirements...",
          rejectionReason: "Possible reasons for rejection...",
          resubmission: "How to resubmit if needed...",
        }} />
      </div>
    </Navbar>
  );
}

export default Header;