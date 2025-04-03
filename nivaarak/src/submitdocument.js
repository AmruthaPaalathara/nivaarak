//application registeration form

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

export const submitDocumentVerification = async (formData) => {
  try {
    // Create a FormData object to send files
    const data = new FormData();
    
    // Append all form fields
    data.append('username', formData.username);
    data.append('firstName', formData.firstName);
    data.append('lastName', formData.lastName);
    data.append('email', formData.email);
    data.append('phone', formData.phone);
    data.append('documentType', formData.documentType);
    data.append('state', formData.state);
    
    // Append files
    if (formData.documentFile) {
      data.append('documentFile', formData.documentFile);
    }
    
    if (formData.idProof) {
      data.append('idProof', formData.idProof);
    }
    
    // Send the request
    const response = await api.post('/documents/verify', data);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network error occurred');
  }
};

export default API;