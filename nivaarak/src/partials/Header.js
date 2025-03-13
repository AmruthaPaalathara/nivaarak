import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Container from 'react-bootstrap/Container';
import { Navbar, Nav, NavDropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import '../css/style.css'

function Header() {
    const location = useLocation();

    const scrollToAbout = (e) => {
        e.preventDefault();
        const aboutSection = document.getElementById('about-section');
        if (aboutSection) {
            aboutSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <Navbar fixed="top" expand="lg" className="header">
            <Container>
                {/* <FontAwesomeIcon icon={faBars} /> */}
                <Navbar.Brand><Link to="/" className='nivaarak'>nivaarak</Link></Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="ms-auto text-center">
                        <Nav.Link as={Link} to="/" className='navbar-link'>Home</Nav.Link>
                        <Nav.Link onClick={scrollToAbout} className='navbar-link'>About</Nav.Link> 
                        <NavDropdown className='navbar-link' title="Login" id="basic-nav-dropdown">
                            <NavDropdown.Item as={Link} to="/signin">Sign in</NavDropdown.Item>
                            <NavDropdown.Item as={Link} to="/registration">Registration</NavDropdown.Item>
                        </NavDropdown>
                        <Nav.Link as={Link} to="/Chatwithupload" className='navbar-link'>Chatbot</Nav.Link>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}

export default Header;
