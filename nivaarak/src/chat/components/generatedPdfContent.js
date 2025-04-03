import React, { forwardRef } from "react";

const PrintableContent = forwardRef(({ documentData = {} }, ref) => {
  const {
    documentType = "Unknown Document",
    eligibility = "Eligibility details not available.",
    benefits = "Benefits not specified.",
    rejectionReason = "No rejection reasons available.",
    resubmission = "Resubmission details not provided.",
  } = documentData;

  return (
    <div ref={ref} style={{ padding: "20px", fontFamily: "Arial" }}>
      <h2>{documentType} Certificate</h2>
      <h4>Eligibility</h4>
      <p>{eligibility}</p>
      <h4>Benefits</h4>
      <p>{benefits}</p>
      <h4>Reasons for Decline</h4>
      <p>{rejectionReason}</p>
      <h4>Resubmission Process</h4>
      <p>{resubmission}</p>
    </div>
  );
});

export default PrintableContent;
