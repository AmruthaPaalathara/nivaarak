module.exports = {
    validateEmail: (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // More robust regex
      if (!emailRegex.test(email)) {
        return { isValid: false, message: "Invalid email format" };
      }
      return { isValid: true };
    },
  
    validatePhoneNumber: (phone) => {
      const phoneRegex = /^\d{10}$/; // 10-digit validation
      if (!phoneRegex.test(phone)) {
        return { isValid: false, message: "Phone number must be 10 digits" };
      }
      return { isValid: true };
    },
  
    validateFileFormat: (filename) => {
      const allowedFormats = /\.(pdf|jpg|jpeg|png)$/i; // Case-insensitive regex
      if (!allowedFormats.test(filename)) {
        return { isValid: false, message: "File format not supported. Allowed formats: PDF, JPG, JPEG, PNG" };
      }
      return { isValid: true };
    },
  
    validateFileSize: (fileSize, maxSizeInMB) => {
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024; // Convert MB to bytes
      if (fileSize > maxSizeInBytes) {
        return { isValid: false, message: `File size exceeds the limit of ${maxSizeInMB} MB` };
      }
      return { isValid: true };
    },
  
    validatePassword: (password) => {
      const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*]/.test(password),
      };
  
      if (!requirements.length) {
        return { isValid: false, message: "Password must be at least 8 characters long" };
      }
      if (!requirements.uppercase) {
        return { isValid: false, message: "Password must include at least one uppercase letter" };
      }
      if (!requirements.number) {
        return { isValid: false, message: "Password must include at least one number" };
      }
      if (!requirements.special) {
        return { isValid: false, message: "Password must include at least one special character" };
      }
  
      return { isValid: true };
    },
  };