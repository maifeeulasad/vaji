import React from 'react';
import './UsageGuide.css';

const UsageGuide: React.FC = () => {
  return (
    <div className="usage-guide">
      <h2>🚀 How to Use Vaji Live Editor</h2>
      
      <div className="guide-section">
        <h3>✏️ Text Editing</h3>
        <ul>
          <li>Click on any text to edit it inline</li>
          <li>Changes are saved automatically</li>
          <li>Press Enter to save, Escape to cancel</li>
        </ul>
      </div>

      <div className="guide-section">
        <h3>🎨 CSS Class Editing</h3>
        <ul>
          <li>Right-click on elements to modify CSS classes</li>
          <li>Add, remove, or change class names</li>
          <li>See styling changes instantly</li>
        </ul>
      </div>

      <div className="guide-section">
        <h3>🖼️ Image Management</h3>
        <ul>
          <li>Click on images to replace them</li>
          <li>Upload new images via file picker</li>
          <li>Supports drag & drop functionality</li>
        </ul>
      </div>

      <div className="guide-section">
        <h3>⚡ Live Updates</h3>
        <ul>
          <li>All changes are applied in real-time</li>
          <li>No page refresh required</li>
          <li>Changes persist to source files</li>
        </ul>
      </div>

      <div className="guide-note">
        <p><strong>Note:</strong> This demo shows the capabilities of Vaji. In a real implementation, you would configure which elements are editable based on your needs.</p>
      </div>
    </div>
  );
};

export default UsageGuide;
