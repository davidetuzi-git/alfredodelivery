import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeDisplayProps {
  value: string;
  height?: number;
  width?: number;
  showValue?: boolean;
}

const BarcodeDisplay = ({ 
  value, 
  height = 60, 
  width = 2,
  showValue = true 
}: BarcodeDisplayProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        // Try different barcode formats
        const formats = ['CODE128', 'EAN13', 'EAN8', 'UPC', 'CODE39'];
        let success = false;

        for (const format of formats) {
          try {
            JsBarcode(svgRef.current, value, {
              format,
              width,
              height,
              displayValue: showValue,
              fontSize: 14,
              margin: 10,
              background: "transparent",
              lineColor: "currentColor",
            });
            success = true;
            break;
          } catch {
            continue;
          }
        }

        // Fallback to CODE128 which accepts any string
        if (!success) {
          JsBarcode(svgRef.current, value, {
            format: 'CODE128',
            width,
            height,
            displayValue: showValue,
            fontSize: 14,
            margin: 10,
            background: "transparent",
            lineColor: "currentColor",
          });
        }
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [value, height, width, showValue]);

  if (!value) return null;

  return (
    <div className="flex flex-col items-center justify-center bg-white rounded-lg p-4 border">
      <svg ref={svgRef} className="text-black max-w-full" />
    </div>
  );
};

export default BarcodeDisplay;
