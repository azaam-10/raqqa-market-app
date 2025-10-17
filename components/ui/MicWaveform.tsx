
import React from 'react';
import './MicWaveform.css';

const MicWaveform: React.FC = () => {
  return (
    <div className="waveform-container mb-4">
      <div className="waveform-bar"></div>
      <div className="waveform-bar"></div>
      <div className="waveform-bar"></div>
      <div className="waveform-bar"></div>
      <div className="waveform-bar"></div>
    </div>
  );
};

// We need to inject the CSS for the animation directly into the document head
// as we cannot create separate CSS files.
const styles = `
.waveform-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 40px;
}
.waveform-bar {
  width: 5px;
  height: 5px;
  margin: 0 3px;
  background-color: #67e8f9; /* cyan-300 */
  border-radius: 5px;
  animation: waveform-animation 1.2s infinite ease-in-out;
}
.waveform-bar:nth-child(2) {
  animation-delay: -1.0s;
}
.waveform-bar:nth-child(3) {
  animation-delay: -0.8s;
}
.waveform-bar:nth-child(4) {
  animation-delay: -0.6s;
}
.waveform-bar:nth-child(5) {
  animation-delay: -0.4s;
}
@keyframes waveform-animation {
  0%, 40%, 100% {
    transform: scaleY(0.2);
  }
  20% {
    transform: scaleY(1);
  }
}
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);


export default MicWaveform;
