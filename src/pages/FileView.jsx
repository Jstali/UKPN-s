import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './FileView.css';

const FileView = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [fileContent, setFileContent] = useState('');

  useEffect(() => {
    // Mock file content - replace with actual API call
    setFileContent(`File ID: ${fileId}\n\nSample file content goes here...`);
  }, [fileId]);

  const handleDownload = () => {
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `file_${fileId}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="file-view-container">
      <div className="file-view-header">
        <button onClick={() => navigate(-1)} className="back-btn">← Back</button>
        <h2>File Content - {fileId}</h2>
        <button onClick={handleDownload} className="download-btn">Download File</button>
      </div>
      <div className="file-content">
        <pre>{fileContent}</pre>
      </div>
    </div>
  );
};

export default FileView;
