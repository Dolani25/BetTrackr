import React from 'react';
import html2canvas from 'html2canvas';

const DashboardShare = ({ dashboardRef }) => {
console.log("DashboardShare received ref:", dashboardRef);
  const handleCaptureAndShare = async () => {
    if (!dashboardRef.current) return;

    const element = dashboardRef.current;
    const originalStyles = {
      overflow: element.style.overflow,
      height: element.style.height,
    };

    // Temporarily adjust styles for full capture
    element.style.overflow = 'visible';
    element.style.height = 'auto';

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: true,
        scrollY: -window.scrollY,
      });

      // Restore original styles
      element.style.overflow = originalStyles.overflow;
      element.style.height = originalStyles.height;

      // Convert to PNG file
      const dataUrl = canvas.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'dashboard.png', { type: 'image/png' });

      // Web Share API
      if (navigator.share) {
        await navigator.share({
          title: 'Dashboard Screenshot',
          files: [file],
        });
      } else {
        // Fallback for browsers without share support
        const link = document.createElement('a');
        link.download = 'dashboard-screenshot.png';
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error('Error:', error);
      element.style.overflow = originalStyles.overflow;
      element.style.height = originalStyles.height;
    }
  };

  return (
    <button style={{width:"100%" , height:"10vh", backgroundColor:"#101010"}}  onClick={handleCaptureAndShare}>
      Share | Screenshot
    </button>
  );
};

export default DashboardShare;