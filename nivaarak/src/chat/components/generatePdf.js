import React from "react";
import axios from "axios";

const GeneratePDF = ({ applicantId }) => {
    const handleDownloadPDF = async () => {
        if (!applicantId) {
            console.error("Applicant ID is missing");
            return;
        }

        try {
            const response = await axios.get(`http://localhost:3001/api/generate-pdf/${applicantId}`, {
                responseType: "blob",  // ✅ Ensures correct response type for PDFs
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `document_${applicantId}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error generating PDF:", error);
        }
    };

    return (
        <button type="button" onClick={handleDownloadPDF} className="btn btn-primary">
            Download PDF
        </button>
    );
};

export default GeneratePDF;
